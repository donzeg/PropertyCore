// PropertyCore Engine — WebSocket server (pure stdlib, RFC 6455)
// Clients connect to /ws and receive JSON push events:
//   {"event":"snapshot","data":[...all current device states...]}  — on connect
//   {"event":"device_state","data":{...DeviceState...}}            — on every MQTT update
package main

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"sync"
)

const wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

// WSMessage is the envelope for all WebSocket push events.
type WSMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// WSHub manages all connected WebSocket clients and broadcasts messages.
type WSHub struct {
	mu        sync.RWMutex
	clients   map[*wsClient]struct{}
	broadcast chan []byte
}

// NewWSHub creates and starts a WSHub.
func NewWSHub() *WSHub {
	h := &WSHub{
		clients:   make(map[*wsClient]struct{}),
		broadcast: make(chan []byte, 256),
	}
	go h.run()
	return h
}

func (h *WSHub) run() {
	for msg := range h.broadcast {
		h.mu.RLock()
		for c := range h.clients {
			select {
			case c.send <- msg:
			default:
				// Slow client — drop rather than block the broadcast
			}
		}
		h.mu.RUnlock()
	}
}

func (h *WSHub) register(c *wsClient) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *WSHub) unregister(c *wsClient) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
	c.conn.Close()
}

// Broadcast encodes a JSON event and sends it to every connected client.
func (h *WSHub) Broadcast(event string, data interface{}) {
	b, err := json.Marshal(WSMessage{Event: event, Data: data})
	if err != nil {
		return
	}
	select {
	case h.broadcast <- b:
	default:
		log.Printf("WS: broadcast channel full, dropping %q event", event)
	}
}

// ClientCount returns the number of currently connected WebSocket clients.
func (h *WSHub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// ServeWS returns an http.HandlerFunc that upgrades connections to WebSocket.
// On connect: sends a snapshot of all current device states.
// Ongoing: the hub broadcasts device_state events via Broadcast().
func (h *WSHub) ServeWS(state *StateManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") != "websocket" {
			http.Error(w, `{"error":"expected WebSocket upgrade"}`, http.StatusBadRequest)
			return
		}
		key := r.Header.Get("Sec-WebSocket-Key")
		if key == "" {
			http.Error(w, `{"error":"missing Sec-WebSocket-Key"}`, http.StatusBadRequest)
			return
		}

		hj, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, `{"error":"hijack not supported"}`, http.StatusInternalServerError)
			return
		}
		conn, _, err := hj.Hijack()
		if err != nil {
			log.Printf("WS: hijack error: %v", err)
			return
		}

		// Send HTTP 101 upgrade response
		handshake := fmt.Sprintf(
			"HTTP/1.1 101 Switching Protocols\r\n"+
				"Upgrade: websocket\r\n"+
				"Connection: Upgrade\r\n"+
				"Sec-WebSocket-Accept: %s\r\n\r\n",
			wsAcceptKey(key),
		)
		if _, err := conn.Write([]byte(handshake)); err != nil {
			conn.Close()
			return
		}

		client := &wsClient{conn: conn, send: make(chan []byte, 64), hub: h}
		h.register(client)
		log.Printf("WS: client connected from %s (total: %d)", conn.RemoteAddr(), h.ClientCount())

		// Send snapshot of all current device states
		devices := state.GetAll()
		if devices == nil {
			devices = []*DeviceState{}
		}
		if b, err := json.Marshal(WSMessage{Event: "snapshot", Data: devices}); err == nil {
			select {
			case client.send <- b:
			default:
			}
		}

		go client.writePump()
		client.readPump() // blocks until disconnect
		h.unregister(client)
		log.Printf("WS: client disconnected (remaining: %d)", h.ClientCount())
	}
}

// wsClient represents a single connected WebSocket client.
type wsClient struct {
	conn net.Conn
	send chan []byte
	hub  *WSHub
}

// writePump drains the send channel and writes frames to the connection.
func (c *wsClient) writePump() {
	for msg := range c.send {
		if err := wsWriteText(c.conn, msg); err != nil {
			c.conn.Close()
			return
		}
	}
}

// readPump reads incoming frames; handles ping/close, ignores text from client.
func (c *wsClient) readPump() {
	for {
		opcode, payload, err := wsReadFrame(c.conn)
		if err != nil {
			return
		}
		switch opcode {
		case 0x8: // close
			wsWriteClose(c.conn) //nolint
			return
		case 0x9: // ping → pong
			wsWritePong(c.conn, payload) //nolint
		}
	}
}

// --- WebSocket frame I/O (RFC 6455) ---

func wsAcceptKey(key string) string {
	h := sha1.New()
	h.Write([]byte(key + wsGUID))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func wsWriteText(conn net.Conn, payload []byte) error {
	return wsWriteFrame(conn, 0x1, payload)
}

func wsWriteClose(conn net.Conn) error {
	return wsWriteFrame(conn, 0x8, nil)
}

func wsWritePong(conn net.Conn, payload []byte) error {
	return wsWriteFrame(conn, 0xA, payload)
}

// wsWriteFrame sends a single RFC 6455 frame (FIN=1, unmasked, server→client).
func wsWriteFrame(conn net.Conn, opcode byte, payload []byte) error {
	n := len(payload)
	hdr := []byte{0x80 | opcode} // FIN + opcode
	switch {
	case n <= 125:
		hdr = append(hdr, byte(n))
	case n <= 65535:
		hdr = append(hdr, 126, byte(n>>8), byte(n))
	default:
		ext := make([]byte, 8)
		binary.BigEndian.PutUint64(ext, uint64(n))
		hdr = append(hdr, 127)
		hdr = append(hdr, ext...)
	}
	_, err := conn.Write(append(hdr, payload...))
	return err
}

// wsReadFrame reads one complete RFC 6455 frame from a client connection.
// Clients must send masked frames per spec; we unmask them.
func wsReadFrame(conn net.Conn) (opcode byte, payload []byte, err error) {
	hdr := make([]byte, 2)
	if _, err = io.ReadFull(conn, hdr); err != nil {
		return
	}
	opcode = hdr[0] & 0x0F
	masked := hdr[1]&0x80 != 0
	payLen := int(hdr[1] & 0x7F)

	switch payLen {
	case 126:
		ext := make([]byte, 2)
		if _, err = io.ReadFull(conn, ext); err != nil {
			return
		}
		payLen = int(binary.BigEndian.Uint16(ext))
	case 127:
		ext := make([]byte, 8)
		if _, err = io.ReadFull(conn, ext); err != nil {
			return
		}
		payLen = int(binary.BigEndian.Uint64(ext))
	}

	var maskKey [4]byte
	if masked {
		if _, err = io.ReadFull(conn, maskKey[:]); err != nil {
			return
		}
	}

	if payLen > 0 {
		payload = make([]byte, payLen)
		if _, err = io.ReadFull(conn, payload); err != nil {
			return
		}
		if masked {
			for i := range payload {
				payload[i] ^= maskKey[i%4]
			}
		}
	}
	return
}
