package security

import (
	"crypto/rand"
	"encoding/base64"
	"os"
	"testing"
	"time"
)

func TestSessionEncryption_EncryptDecrypt(t *testing.T) {
	key := generateRandomKey(32)
	enc, err := NewSessionEncryption(key)
	if err != nil {
		t.Fatalf("failed to create encryption: %v", err)
	}

	token := "test-session-token-12345"

	// Encrypt
	encrypted, err := enc.EncryptSessionToken(token)
	if err != nil {
		t.Fatalf("encryption failed: %v", err)
	}

	if encrypted == token {
		t.Fatal("encrypted token should differ from plaintext")
	}

	// Decrypt
	decrypted, err := enc.DecryptSessionToken(encrypted)
	if err != nil {
		t.Fatalf("decryption failed: %v", err)
	}

	if decrypted != token {
		t.Fatalf("expected %q, got %q", token, decrypted)
	}
}

func TestSessionEncryption_InvalidKey(t *testing.T) {
	_, err := NewSessionEncryption("short")
	if err == nil {
		t.Fatal("should reject short key")
	}
}

func TestSessionEncryption_TamperedCiphertext(t *testing.T) {
	key := generateRandomKey(32)
	enc, _ := NewSessionEncryption(key)

	token := "test-token"
	encrypted, _ := enc.EncryptSessionToken(token)

	// Tamper with ciphertext
	cipherBytes, _ := base64.StdEncoding.DecodeString(encrypted)
	if len(cipherBytes) > 0 {
		cipherBytes[len(cipherBytes)-1] ^= 0xFF
	}
	tampered := base64.StdEncoding.EncodeToString(cipherBytes)

	// Decryption should fail
	_, err := enc.DecryptSessionToken(tampered)
	if err == nil {
		t.Fatal("should fail to decrypt tampered ciphertext")
	}
}

func TestSessionEncryption_UniqueNonces(t *testing.T) {
	key := generateRandomKey(32)
	enc, _ := NewSessionEncryption(key)

	token := "test-token"

	// Encrypt same token twice
	enc1, _ := enc.EncryptSessionToken(token)
	enc2, _ := enc.EncryptSessionToken(token)

	if enc1 == enc2 {
		t.Fatal("two encryptions of same token should produce different ciphertexts")
	}

	// Both should decrypt correctly
	dec1, _ := enc.DecryptSessionToken(enc1)
	dec2, _ := enc.DecryptSessionToken(enc2)

	if dec1 != token || dec2 != token {
		t.Fatal("both should decrypt to original token")
	}
}

func TestTLSManager_CertificateExpiry(t *testing.T) {
	// Test with non-existent files
	manager := NewTLSManager("nonexistent.pem", "nonexistent.key")

	if manager.IsTLSEnabled() {
		t.Fatal("should not be enabled without certificate files")
	}

	// Load certificates should fail
	err := manager.LoadCertificates()
	if err == nil {
		t.Fatal("should fail to load non-existent certificates")
	}
}

func TestTLSManager_NoTLSDisabled(t *testing.T) {
	manager := NewTLSManager("", "")

	if manager.IsTLSEnabled() {
		t.Fatal("should not be enabled without certificate paths")
	}

	// GetConfig should return nil
	if manager.GetConfig() != nil {
		t.Fatal("config should be nil when TLS disabled")
	}
}

func TestTLSManager_CertificateExpiry_Disabled(t *testing.T) {
	manager := NewTLSManager("", "")

	expiry, err := manager.GetCertificateExpiry()
	if err == nil {
		t.Fatal("should fail to get expiry when TLS not configured")
	}

	if !expiry.IsZero() {
		t.Fatal("expiry should be zero time")
	}
}

func TestTLSManager_CheckCertificateExpiry(t *testing.T) {
	manager := NewTLSManager("", "")

	// Should not panic
	ok, msg := manager.CheckCertificateExpiry(30)
	if ok {
		t.Fatal("should return false for unconfigured TLS")
	}
	if msg == "" {
		t.Fatal("should return empty message for unconfigured TLS")
	}
}

func generateRandomKey(size int) string {
	b := make([]byte, size)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return string(b)
}

func TestSessionEncryption_LargePayload(t *testing.T) {
	key := generateRandomKey(32)
	enc, _ := NewSessionEncryption(key)

	// Create a large token
	largeToken := ""
	for i := 0; i < 1000; i++ {
		largeToken += "test-token-"
	}

	encrypted, err := enc.EncryptSessionToken(largeToken)
	if err != nil {
		t.Fatalf("encryption failed: %v", err)
	}

	decrypted, err := enc.DecryptSessionToken(encrypted)
	if err != nil {
		t.Fatalf("decryption failed: %v", err)
	}

	if decrypted != largeToken {
		t.Fatal("large payload encryption/decryption failed")
	}
}

func TestSessionEncryption_InvalidBase64(t *testing.T) {
	key := generateRandomKey(32)
	enc, _ := NewSessionEncryption(key)

	// Invalid base64
	_, err := enc.DecryptSessionToken("not-valid-base64!!!")
	if err == nil {
		t.Fatal("should fail with invalid base64")
	}
}

func TestSessionEncryption_EmptyToken(t *testing.T) {
	key := generateRandomKey(32)
	enc, _ := NewSessionEncryption(key)

	encrypted, err := enc.EncryptSessionToken("")
	if err != nil {
		t.Fatalf("encryption of empty token failed: %v", err)
	}

	decrypted, err := enc.DecryptSessionToken(encrypted)
	if err != nil {
		t.Fatalf("decryption of empty token failed: %v", err)
	}

	if decrypted != "" {
		t.Fatal("empty token encryption/decryption failed")
	}
}

func TestTLSManager_GetConfig_Disabled(t *testing.T) {
	manager := NewTLSManager("", "")
	config := manager.GetConfig()

	if config != nil {
		t.Fatal("config should be nil when TLS disabled")
	}
}

func BenchmarkSessionEncryption_Encrypt(b *testing.B) {
	key := generateRandomKey(32)
	enc, _ := NewSessionEncryption(key)
	token := "test-token-benchmark"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		enc.EncryptSessionToken(token)
	}
}

func BenchmarkSessionEncryption_Decrypt(b *testing.B) {
	key := generateRandomKey(32)
	enc, _ := NewSessionEncryption(key)
	token := "test-token-benchmark"
	encrypted, _ := enc.EncryptSessionToken(token)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		enc.DecryptSessionToken(encrypted)
	}
}

func BenchmarkTokenBucket_AllowRequest(b *testing.B) {
	bucket := NewTokenBucket()
	identifier := "user-benchmark"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		bucket.AllowRequest(identifier, 1000, time.Second)
	}
}
