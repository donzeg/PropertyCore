// PropertyCore Engine — InfluxDB 1.8 writer
// Writes device state changes as time-series measurements using the
// InfluxDB line protocol HTTP API. Pure stdlib, no external dependencies.
package main

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// InfluxWriter sends measurements to an InfluxDB 1.8 instance via HTTP.
// Write errors are rate-limited to one log message per minute to avoid
// flooding logs when InfluxDB is temporarily unavailable.
type InfluxWriter struct {
	url    string // e.g. http://localhost:8086
	db     string // e.g. propertycore
	client *http.Client

	mu          sync.Mutex
	lastErrLog  time.Time
	errLogEvery time.Duration
}

// NewInfluxWriter creates a writer targeting the given InfluxDB URL and database.
func NewInfluxWriter(url, db string) *InfluxWriter {
	return &InfluxWriter{
		url:         strings.TrimRight(url, "/"),
		db:          db,
		client:      &http.Client{Timeout: 3 * time.Second},
		errLogEvery: 60 * time.Second,
	}
}

// WriteDeviceState writes a device_state measurement for the given DeviceState.
// Safe to call from any goroutine; errors are logged at most once per minute.
func (iw *InfluxWriter) WriteDeviceState(dev *DeviceState) {
	if iw == nil || dev == nil {
		return
	}

	tags := "device_id=" + sanitizeInfluxTag(dev.ID)
	if dev.Type != "" {
		tags += ",device_type=" + sanitizeInfluxTag(dev.Type)
	}

	var fields []string
	for k, v := range dev.State {
		switch val := v.(type) {
		case bool:
			if val {
				fields = append(fields, k+"=true")
			} else {
				fields = append(fields, k+"=false")
			}
		case float64:
			fields = append(fields, fmt.Sprintf("%s=%g", k, val))
		case string:
			// Escape quotes in string field values
			escaped := strings.ReplaceAll(val, `"`, `\"`)
			fields = append(fields, fmt.Sprintf(`%s="%s"`, k, escaped))
		}
	}

	if len(fields) == 0 {
		return
	}

	line := fmt.Sprintf("device_state,%s %s %d\n",
		tags,
		strings.Join(fields, ","),
		time.Now().UnixNano(),
	)
	iw.writeLine(line)
}

// writeLine sends a single line-protocol line to InfluxDB.
func (iw *InfluxWriter) writeLine(line string) {
	url := fmt.Sprintf("%s/write?db=%s&precision=ns", iw.url, iw.db)
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(line))
	if err != nil {
		iw.logErr(fmt.Sprintf("build request: %v", err))
		return
	}
	req.Header.Set("Content-Type", "text/plain; charset=utf-8")

	resp, err := iw.client.Do(req)
	if err != nil {
		iw.logErr(fmt.Sprintf("write: %v", err))
		return
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		iw.logErr(fmt.Sprintf("write returned HTTP %d", resp.StatusCode))
	}
}

// logErr logs an InfluxDB error at most once per errLogEvery interval.
func (iw *InfluxWriter) logErr(msg string) {
	iw.mu.Lock()
	defer iw.mu.Unlock()
	if time.Since(iw.lastErrLog) >= iw.errLogEvery {
		log.Printf("InfluxDB: %s", msg)
		iw.lastErrLog = time.Now()
	}
}

// sanitizeInfluxTag removes characters that are invalid in InfluxDB tag keys/values.
// Spaces, commas and equals signs are replaced with underscores.
func sanitizeInfluxTag(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case ' ', ',', '=':
			b.WriteRune('_')
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}
