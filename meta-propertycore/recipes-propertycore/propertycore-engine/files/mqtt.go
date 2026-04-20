// PropertyCore Engine — MQTT 3.1.1 client
// Pure stdlib implementation; no external dependencies.
// Supports QoS 0 publish/subscribe, keepalive, and automatic reconnection.
package main

import (
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"net"
	"sync"
	"time"
)

// MQTTClient is a minimal MQTT 3.1.1 client.
type MQTTClient struct {
	addr      string
	clientID  string
	keepAlive uint16

	mu        sync.Mutex
	conn      net.Conn
	pktID     uint16
	subs      []string
	connected bool

	handler func(topic string, payload []byte)
	quit    chan struct{}
	wg      sync.WaitGroup
}

// NewMQTTClient creates a new client. handler is called for every incoming PUBLISH.
func NewMQTTClient(addr, clientID string, handler func(topic string, payload []byte)) *MQTTClient {
	return &MQTTClient{
		addr:      addr,
		clientID:  clientID,
		keepAlive: 60,
		handler:   handler,
		quit:      make(chan struct{}),
	}
}

// Start begins the connect/reconnect loop in a background goroutine.
func (c *MQTTClient) Start() {
	c.wg.Add(1)
	go c.run()
}

// Stop gracefully closes the connection and waits for background goroutines.
func (c *MQTTClient) Stop() {
	close(c.quit)
	c.mu.Lock()
	if c.conn != nil {
		c.conn.Close()
	}
	c.mu.Unlock()
	c.wg.Wait()
}

// Subscribe registers a topic filter. Safe to call before or after Start.
func (c *MQTTClient) Subscribe(topic string) {
	c.mu.Lock()
	c.subs = append(c.subs, topic)
	conn := c.conn
	ok := c.connected
	c.mu.Unlock()
	if ok && conn != nil {
		if err := c.doSubscribe(conn, topic); err != nil {
			log.Printf("MQTT: subscribe %q error: %v", topic, err)
		}
	}
}

// Publish sends a QoS 0 PUBLISH packet. Returns error if not connected.
func (c *MQTTClient) Publish(topic string, payload []byte) error {
	c.mu.Lock()
	conn := c.conn
	ok := c.connected
	c.mu.Unlock()
	if !ok || conn == nil {
		return fmt.Errorf("mqtt: not connected")
	}
	return c.doPublish(conn, topic, payload)
}

// IsConnected reports whether the MQTT session is active.
func (c *MQTTClient) IsConnected() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.connected
}

// --- internal ---

func (c *MQTTClient) run() {
	defer c.wg.Done()
	backoff := time.Second
	for {
		select {
		case <-c.quit:
			return
		default:
		}
		if err := c.connect(); err != nil {
			log.Printf("MQTT: connect %s failed: %v (retry in %s)", c.addr, err, backoff)
			select {
			case <-c.quit:
				return
			case <-time.After(backoff):
			}
			if backoff < 30*time.Second {
				backoff *= 2
			}
			continue
		}
		backoff = time.Second
		log.Printf("MQTT: connected to %s as %s", c.addr, c.clientID)
		c.readLoop()
		c.mu.Lock()
		c.connected = false
		if c.conn != nil {
			c.conn.Close()
			c.conn = nil
		}
		c.mu.Unlock()
		select {
		case <-c.quit:
			return
		default:
			log.Printf("MQTT: disconnected — reconnecting...")
		}
	}
}

// connect dials the broker and performs the MQTT CONNECT/CONNACK handshake.
func (c *MQTTClient) connect() error {
	conn, err := net.DialTimeout("tcp", c.addr, 5*time.Second)
	if err != nil {
		return err
	}
	conn.SetDeadline(time.Now().Add(10 * time.Second))
	if _, err := conn.Write(buildConnect(c.clientID, c.keepAlive)); err != nil {
		conn.Close()
		return fmt.Errorf("send CONNECT: %w", err)
	}
	// CONNACK is always exactly 4 bytes for MQTT 3.1.1
	ack := make([]byte, 4)
	if _, err := io.ReadFull(conn, ack); err != nil {
		conn.Close()
		return fmt.Errorf("read CONNACK: %w", err)
	}
	if ack[0] != 0x20 || ack[1] != 0x02 {
		conn.Close()
		return fmt.Errorf("unexpected packet 0x%02x (expected CONNACK 0x20)", ack[0])
	}
	if ack[3] != 0x00 {
		conn.Close()
		return fmt.Errorf("broker refused connection, return code %d", ack[3])
	}
	conn.SetDeadline(time.Time{})

	c.mu.Lock()
	c.conn = conn
	c.connected = true
	subs := make([]string, len(c.subs))
	copy(subs, c.subs)
	c.mu.Unlock()

	for _, topic := range subs {
		if err := c.doSubscribe(conn, topic); err != nil {
			conn.Close()
			c.mu.Lock()
			c.connected = false
			c.conn = nil
			c.mu.Unlock()
			return fmt.Errorf("subscribe %q: %w", topic, err)
		}
	}
	return nil
}

type mqttMsg struct {
	topic   string
	payload []byte
	err     error
}

// readLoop reads packets from the broker, dispatching PUBLISH to the handler
// and sending PINGREQ to keep the session alive.
func (c *MQTTClient) readLoop() {
	c.mu.Lock()
	conn := c.conn
	c.mu.Unlock()

	msgs := make(chan mqttMsg, 32)
	go func() {
		for {
			topic, payload, err := readPacket(conn)
			select {
			case msgs <- mqttMsg{topic, payload, err}:
			case <-c.quit:
				return
			}
			if err != nil {
				return
			}
		}
	}()

	ping := time.NewTicker(time.Duration(c.keepAlive/2) * time.Second)
	defer ping.Stop()

	for {
		select {
		case <-c.quit:
			return
		case <-ping.C:
			conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			conn.Write([]byte{0xC0, 0x00}) //nolint — PINGREQ, error handled via readLoop
			conn.SetWriteDeadline(time.Time{})
		case msg := <-msgs:
			if msg.err != nil {
				return
			}
			if msg.topic != "" && c.handler != nil {
				c.handler(msg.topic, msg.payload)
			}
		}
	}
}

func (c *MQTTClient) doSubscribe(conn net.Conn, topic string) error {
	c.mu.Lock()
	c.pktID++
	id := c.pktID
	c.mu.Unlock()
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_, err := conn.Write(buildSubscribe(id, topic))
	conn.SetWriteDeadline(time.Time{})
	return err
}

func (c *MQTTClient) doPublish(conn net.Conn, topic string, payload []byte) error {
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_, err := conn.Write(buildPublish(topic, payload))
	conn.SetWriteDeadline(time.Time{})
	return err
}

// --- Packet parser ---

// readPacket reads one complete MQTT packet from conn.
// Returns (topic, payload, nil) for PUBLISH packets; ("", nil, nil) for others.
func readPacket(conn net.Conn) (string, []byte, error) {
	hdr := make([]byte, 1)
	if _, err := io.ReadFull(conn, hdr); err != nil {
		return "", nil, err
	}
	pktType := hdr[0] & 0xF0

	remaining, err := readVarLen(conn)
	if err != nil {
		return "", nil, err
	}
	if remaining == 0 {
		return "", nil, nil // PINGRESP or DISCONNECT with no payload
	}

	buf := make([]byte, remaining)
	if _, err := io.ReadFull(conn, buf); err != nil {
		return "", nil, err
	}

	if pktType == 0x30 { // PUBLISH (QoS 0)
		if len(buf) < 2 {
			return "", nil, fmt.Errorf("mqtt: short PUBLISH packet")
		}
		topicLen := int(binary.BigEndian.Uint16(buf[0:2]))
		if 2+topicLen > len(buf) {
			return "", nil, fmt.Errorf("mqtt: PUBLISH topic length overflow")
		}
		topic := string(buf[2 : 2+topicLen])
		payload := make([]byte, len(buf)-2-topicLen)
		copy(payload, buf[2+topicLen:])
		return topic, payload, nil
	}
	// SUBACK, PINGRESP, and other control packets — discard payload
	return "", nil, nil
}

func readVarLen(r io.Reader) (int, error) {
	value, mul := 0, 1
	b := make([]byte, 1)
	for {
		if _, err := io.ReadFull(r, b); err != nil {
			return 0, err
		}
		value += int(b[0]&0x7F) * mul
		if b[0]&0x80 == 0 {
			return value, nil
		}
		mul *= 128
		if mul > 128*128*128 {
			return 0, fmt.Errorf("mqtt: malformed remaining length")
		}
	}
}

// --- Packet builders ---

func buildConnect(clientID string, keepAlive uint16) []byte {
	varHdr := []byte{
		0x00, 0x04, 'M', 'Q', 'T', 'T', // Protocol Name "MQTT"
		0x04,                              // Protocol Level 4 = MQTT 3.1.1
		0x02,                              // Connect Flags: Clean Session only
		byte(keepAlive >> 8), byte(keepAlive), // Keep Alive (big-endian uint16)
	}
	payload := encMQTTString(clientID)
	remaining := len(varHdr) + len(payload)
	pkt := []byte{0x10} // CONNECT fixed header
	pkt = append(pkt, encVarLen(remaining)...)
	pkt = append(pkt, varHdr...)
	pkt = append(pkt, payload...)
	return pkt
}

func buildSubscribe(pktID uint16, topic string) []byte {
	varHdr := []byte{byte(pktID >> 8), byte(pktID)}
	payload := append(encMQTTString(topic), 0x00) // topic filter + QoS 0
	remaining := len(varHdr) + len(payload)
	pkt := []byte{0x82} // SUBSCRIBE fixed header
	pkt = append(pkt, encVarLen(remaining)...)
	pkt = append(pkt, varHdr...)
	pkt = append(pkt, payload...)
	return pkt
}

func buildPublish(topic string, payload []byte) []byte {
	t := encMQTTString(topic)
	remaining := len(t) + len(payload)
	pkt := []byte{0x30} // PUBLISH, QoS 0, no retain
	pkt = append(pkt, encVarLen(remaining)...)
	pkt = append(pkt, t...)
	pkt = append(pkt, payload...)
	return pkt
}

// encMQTTString encodes a UTF-8 string as an MQTT length-prefixed string.
func encMQTTString(s string) []byte {
	b := make([]byte, 2+len(s))
	binary.BigEndian.PutUint16(b, uint16(len(s)))
	copy(b[2:], s)
	return b
}

// encVarLen encodes n as an MQTT variable-length integer (1–4 bytes).
func encVarLen(n int) []byte {
	var buf []byte
	for {
		b := byte(n % 128)
		n /= 128
		if n > 0 {
			b |= 0x80
		}
		buf = append(buf, b)
		if n == 0 {
			return buf
		}
	}
}
