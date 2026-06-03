// PropertyCore Engine — Session manager
// Lightweight in-memory authentication for the mobile app and dashboard.
// Tokens are 32 hex characters (16 random bytes from crypto/rand).
// Sessions expire after 24 hours (sessionTTL). Expired tokens are swept every
// 10 minutes by a background goroutine. Sessions are not persisted — all tokens
// are invalidated on engine restart. Clients must re-authenticate after restart.
package main

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

const (
	sessionTTL             = 24 * time.Hour
	sessionCleanupInterval = 10 * time.Minute
)

// sessionEntry pairs a userID with a wall-clock expiry time.
type sessionEntry struct {
	userID    string
	expiresAt time.Time
}

// SessionManager holds active authentication tokens in memory.
// It is intentionally not persisted — this is a LAN-only system and
// short-lived sessions are acceptable. Clients re-auth on launch.
type SessionManager struct {
	mu     sync.RWMutex
	tokens map[string]sessionEntry
}

// NewSessionManager creates an empty SessionManager and starts a background
// goroutine that removes expired tokens every sessionCleanupInterval.
func NewSessionManager() *SessionManager {
	sm := &SessionManager{
		tokens: make(map[string]sessionEntry),
	}
	go sm.cleanupLoop()
	return sm
}

// NewSession generates a cryptographically random token for the given userID,
// stores it with a 24-hour TTL, and returns the token string.
func (sm *SessionManager) NewSession(userID string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	sm.mu.Lock()
	sm.tokens[token] = sessionEntry{
		userID:    userID,
		expiresAt: time.Now().Add(sessionTTL),
	}
	sm.mu.Unlock()
	return token, nil
}

// ValidateToken returns the userID for a valid, non-expired token.
// Returns ("", false) if the token is missing or expired.
func (sm *SessionManager) ValidateToken(token string) (string, bool) {
	sm.mu.RLock()
	entry, ok := sm.tokens[token]
	sm.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		return "", false
	}
	return entry.userID, true
}

// Invalidate removes a session token. Safe to call with a non-existent token.
func (sm *SessionManager) Invalidate(token string) {
	sm.mu.Lock()
	delete(sm.tokens, token)
	sm.mu.Unlock()
}

// cleanupLoop removes expired tokens from the map every sessionCleanupInterval.
// Runs as a background goroutine for the lifetime of the process.
func (sm *SessionManager) cleanupLoop() {
	ticker := time.NewTicker(sessionCleanupInterval)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		sm.mu.Lock()
		for token, entry := range sm.tokens {
			if now.After(entry.expiresAt) {
				delete(sm.tokens, token)
			}
		}
		sm.mu.Unlock()
	}
}
