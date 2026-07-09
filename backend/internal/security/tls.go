package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"fmt"
	"io"
	"os"
	"time"
)

type TLSManager struct {
	certFile string
	keyFile  string
	config   *tls.Config
}

func NewTLSManager(certFile, keyFile string) *TLSManager {
	return &TLSManager{
		certFile: certFile,
		keyFile:  keyFile,
	}
}

func (tm *TLSManager) LoadCertificates() error {
	if tm.certFile == "" || tm.keyFile == "" {
		return nil // TLS disabled
	}

	if _, err := os.Stat(tm.certFile); os.IsNotExist(err) {
		return fmt.Errorf("certificate file not found: %s", tm.certFile)
	}

	if _, err := os.Stat(tm.keyFile); os.IsNotExist(err) {
		return fmt.Errorf("key file not found: %s", tm.keyFile)
	}

	cert, err := tls.LoadX509KeyPair(tm.certFile, tm.keyFile)
	if err != nil {
		return fmt.Errorf("failed to load certificate: %w", err)
	}

	tm.config = &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS13,
		MaxVersion:   tls.VersionTLS13,
		CipherSuites: []uint16{
			tls.TLS_AES_256_GCM_SHA384,
			tls.TLS_CHACHA20_POLY1305_SHA256,
			tls.TLS_AES_128_GCM_SHA256,
		},
		CurvePreferences: []tls.CurveID{
			tls.CurveP256,
			tls.X25519,
		},
		PreferServerCipherSuites: true,
		SessionTicketsDisabled:   false,
	}

	return nil
}

func (tm *TLSManager) GetConfig() *tls.Config {
	return tm.config
}

func (tm *TLSManager) IsTLSEnabled() bool {
	return tm.config != nil
}

func (tm *TLSManager) GetCertificateExpiry() (time.Time, error) {
	if tm.config == nil || len(tm.config.Certificates) == 0 {
		return time.Time{}, fmt.Errorf("TLS not configured")
	}

	cert := tm.config.Certificates[0]
	x509Cert, err := parseCertificate(cert)
	if err != nil {
		return time.Time{}, err
	}

	return x509Cert.NotAfter, nil
}

func (tm *TLSManager) CheckCertificateExpiry(warnDays int) (bool, string) {
	expiry, err := tm.GetCertificateExpiry()
	if err != nil {
		return false, ""
	}

	daysUntilExpiry := int(time.Until(expiry).Hours() / 24)

	if daysUntilExpiry <= 0 {
		return false, fmt.Sprintf("Certificate expired on %s", expiry.Format(time.RFC3339))
	}

	if daysUntilExpiry <= warnDays {
		return false, fmt.Sprintf("Certificate expires in %d days", daysUntilExpiry)
	}

	return true, fmt.Sprintf("Certificate valid for %d more days", daysUntilExpiry)
}

func parseCertificate(cert tls.Certificate) (*x509.Certificate, error) {
	if len(cert.Certificate) == 0 {
		return nil, fmt.Errorf("no certificate data")
	}

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}

	return x509Cert, nil
}

type SessionEncryption struct {
	key []byte
}

func NewSessionEncryption(key string) (*SessionEncryption, error) {
	if len(key) < 32 {
		return nil, fmt.Errorf("encryption key must be at least 32 bytes")
	}

	return &SessionEncryption{
		key: []byte(key)[:32],
	}, nil
}

func (se *SessionEncryption) EncryptSessionToken(token string) (string, error) {
	block, err := aes.NewCipher(se.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(token), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (se *SessionEncryption) DecryptSessionToken(encryptedToken string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedToken)
	if err != nil {
		return "", fmt.Errorf("failed to decode token: %w", err)
	}

	block, err := aes.NewCipher(se.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}
