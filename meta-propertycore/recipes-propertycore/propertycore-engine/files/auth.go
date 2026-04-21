// PropertyCore Engine — Session manager
// Lightweight in-memory PIN-based authentication for the mobile app.
// Tokens are 32 hex characters (16 random bytes from crypto/rand).
// Sessions are not persisted — all tokens expire on engine restart.
// The mobile app re-authenticates on connect (cheap PIN entry).
package main

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
)

// SessionManager holds active authentication tokens in memory.
// It is intentionally not persisted — this is a LAN-only system and
// short-lived sessions are acceptable. Mobile apps re-auth on launch.
type SessionManager struct {
	mu     sync.RWMutex
	tokens map[string]string // token → userID
}

// NewSessionManager creates an empty SessionManager.
func NewSessionManager() *SessionManager {
	return &SessionManager{
		tokens: make(map[string]string),
	}
}

// NewSession generates a cryptographically random token for the given userID,
// stores it in memory, and returns the token string.
func (sm *SessionManager) NewSession(userID string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	sm.mu.Lock()
	sm.tokens[token] = userID
	sm.mu.Unlock()
	return token, nil
}

// ValidateToken returns the userID for a valid token, or ("", false) if invalid.
func (sm *SessionManager) ValidateToken(token string) (string, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	uid, ok := sm.tokens[token]
	return uid, ok
}

// Invalidate removes a session token. Safe to call with a non-existent token.
func (sm *SessionManager) Invalidate(token string) {
	sm.mu.Lock()
	delete(sm.tokens, token)
	sm.mu.Unlock()
}
