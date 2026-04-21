// PropertyCore Engine — Dashboard Admin Accounts
// Separate credential store for the web configuration dashboard.
// Admin accounts are NOT the same as mobile-app users (user.go/auth.go).
// Password hashing: PBKDF2-HMAC-SHA256, 100,000 iterations — pure stdlib only.
// Accounts are persisted to /var/lib/propertycore/admin_accounts.json.
package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"strings"
	"sync"
	"time"
)

// AdminAccount is a dashboard login credential record.
type AdminAccount struct {
	ID                  string `json:"id"`
	Username            string `json:"username"`
	PasswordHash        string `json:"password_hash"`
	ForceChangePassword bool   `json:"force_change_password,omitempty"`
	CreatedAt           string `json:"created_at"`
}

// adminPublic is the API-safe view — never exposes the password hash.
type adminPublic struct {
	ID                  string `json:"id"`
	Username            string `json:"username"`
	ForceChangePassword bool   `json:"force_change_password,omitempty"`
	CreatedAt           string `json:"created_at"`
}

func toAdminPublic(a *AdminAccount) *adminPublic {
	return &adminPublic{
		ID:                  a.ID,
		Username:            a.Username,
		ForceChangePassword: a.ForceChangePassword,
		CreatedAt:           a.CreatedAt,
	}
}

// AdminManager manages dashboard admin accounts.
type AdminManager struct {
	mu       sync.RWMutex
	accounts map[string]*AdminAccount // id → account
	store    *Store
}

// NewAdminManager creates an empty AdminManager backed by store.
func NewAdminManager(store *Store) *AdminManager {
	return &AdminManager{
		accounts: make(map[string]*AdminAccount),
		store:    store,
	}
}

// Load bulk-loads persisted accounts. Call once at startup before SeedDefault.
func (am *AdminManager) Load(accounts []*AdminAccount) {
	am.mu.Lock()
	defer am.mu.Unlock()
	for _, a := range accounts {
		am.accounts[a.ID] = a
	}
}

// SeedDefault creates the default admin account if no accounts exist yet.
// Default credentials: username=admin  password=propertycore
// force_change_password is set so the engineer is prompted on first login.
func (am *AdminManager) SeedDefault() {
	am.mu.RLock()
	count := len(am.accounts)
	am.mu.RUnlock()
	if count > 0 {
		return
	}
	hash, err := hashAdminPassword("propertycore")
	if err != nil {
		return
	}
	id, err := randomID()
	if err != nil {
		return
	}
	a := &AdminAccount{
		ID:                  id,
		Username:            "admin",
		PasswordHash:        hash,
		ForceChangePassword: true,
		CreatedAt:           time.Now().UTC().Format(time.RFC3339),
	}
	am.mu.Lock()
	am.accounts[a.ID] = a
	am.mu.Unlock()
	am.persist()
}

// Authenticate verifies username + password and returns the account if valid.
func (am *AdminManager) Authenticate(username, password string) (*AdminAccount, bool) {
	am.mu.RLock()
	defer am.mu.RUnlock()
	for _, a := range am.accounts {
		if a.Username == username && checkAdminPassword(password, a.PasswordHash) {
			return a, true
		}
	}
	return nil, false
}

// GetAll returns all accounts as public views (no password hashes).
func (am *AdminManager) GetAll() []*adminPublic {
	am.mu.RLock()
	defer am.mu.RUnlock()
	list := make([]*adminPublic, 0, len(am.accounts))
	for _, a := range am.accounts {
		list = append(list, toAdminPublic(a))
	}
	return list
}

// Create adds a new admin account with the given username and password.
func (am *AdminManager) Create(username, password string) (*AdminAccount, error) {
	if username == "" || password == "" {
		return nil, fmt.Errorf("username and password are required")
	}
	am.mu.RLock()
	for _, a := range am.accounts {
		if a.Username == username {
			am.mu.RUnlock()
			return nil, fmt.Errorf("username already exists")
		}
	}
	am.mu.RUnlock()

	hash, err := hashAdminPassword(password)
	if err != nil {
		return nil, err
	}
	id, err := randomID()
	if err != nil {
		return nil, err
	}
	a := &AdminAccount{
		ID:           id,
		Username:     username,
		PasswordHash: hash,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	am.mu.Lock()
	am.accounts[a.ID] = a
	am.mu.Unlock()
	am.persist()
	return a, nil
}

// ChangePassword updates the password for the given account ID.
func (am *AdminManager) ChangePassword(id, newPassword string) error {
	if newPassword == "" {
		return fmt.Errorf("password is required")
	}
	hash, err := hashAdminPassword(newPassword)
	if err != nil {
		return err
	}
	am.mu.Lock()
	a, ok := am.accounts[id]
	if !ok {
		am.mu.Unlock()
		return fmt.Errorf("account not found")
	}
	a.PasswordHash = hash
	a.ForceChangePassword = false
	am.mu.Unlock()
	am.persist()
	return nil
}

// Delete removes an account by ID.
func (am *AdminManager) Delete(id string) bool {
	am.mu.Lock()
	_, ok := am.accounts[id]
	if ok {
		delete(am.accounts, id)
	}
	am.mu.Unlock()
	if ok {
		am.persist()
	}
	return ok
}

// Count returns the number of admin accounts.
func (am *AdminManager) Count() int {
	am.mu.RLock()
	defer am.mu.RUnlock()
	return len(am.accounts)
}

// persist saves the current account list to disk.
// Must be called only after releasing the write mutex.
func (am *AdminManager) persist() {
	am.mu.RLock()
	list := make([]*AdminAccount, 0, len(am.accounts))
	for _, a := range am.accounts {
		list = append(list, a)
	}
	am.mu.RUnlock()
	am.store.SaveAdminAccounts(list)
}

// ─── Password hashing — PBKDF2-HMAC-SHA256 (RFC 2898, pure stdlib) ────────────

const adminPBKDF2Iterations = 100_000

// hashAdminPassword hashes a plaintext password using PBKDF2-HMAC-SHA256 with
// a 32-byte cryptographically random salt and 100,000 iterations.
// The stored string is self-describing: "pbkdf2:sha256:<iter>:<b64salt>:<b64key>"
func hashAdminPassword(password string) (string, error) {
	salt := make([]byte, 32)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := pbkdf2HMACSHA256([]byte(password), salt, adminPBKDF2Iterations, 32)
	return fmt.Sprintf("pbkdf2:sha256:%d:%s:%s",
		adminPBKDF2Iterations,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// checkAdminPassword verifies a plaintext password against a stored hash.
// Uses constant-time comparison via hmac.Equal to prevent timing attacks.
func checkAdminPassword(password, stored string) bool {
	parts := strings.Split(stored, ":")
	if len(parts) != 5 || parts[0] != "pbkdf2" || parts[1] != "sha256" {
		return false
	}
	var iter int
	if _, err := fmt.Sscanf(parts[2], "%d", &iter); err != nil || iter < 1 {
		return false
	}
	salt, err1 := base64.RawStdEncoding.DecodeString(parts[3])
	storedKey, err2 := base64.RawStdEncoding.DecodeString(parts[4])
	if err1 != nil || err2 != nil {
		return false
	}
	derived := pbkdf2HMACSHA256([]byte(password), salt, iter, len(storedKey))
	return hmac.Equal(derived, storedKey) // constant-time byte comparison
}

// pbkdf2HMACSHA256 implements PBKDF2 with HMAC-SHA256 as the PRF (RFC 2898 §5.2).
// Uses only stdlib: crypto/hmac, crypto/sha256, encoding/binary.
func pbkdf2HMACSHA256(password, salt []byte, iter, keyLen int) []byte {
	prf := hmac.New(sha256.New, password)
	hashLen := prf.Size() // 32 for SHA256
	numBlocks := (keyLen + hashLen - 1) / hashLen
	dk := make([]byte, 0, numBlocks*hashLen)

	for block := 1; block <= numBlocks; block++ {
		// U1 = PRF(password, salt || INT(block))
		prf.Reset()
		prf.Write(salt)
		var blockBuf [4]byte
		binary.BigEndian.PutUint32(blockBuf[:], uint32(block))
		prf.Write(blockBuf[:])
		u := prf.Sum(nil)

		// T[block] = U1 XOR U2 XOR ... XOR Uc
		t := make([]byte, len(u))
		copy(t, u)
		for i := 1; i < iter; i++ {
			prf.Reset()
			prf.Write(u)
			u = prf.Sum(nil)
			for j := range t {
				t[j] ^= u[j]
			}
		}
		dk = append(dk, t...)
	}
	return dk[:keyLen]
}
