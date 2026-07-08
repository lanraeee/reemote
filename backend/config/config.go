package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Auth     AuthConfig
	Libvirt  LibvirtConfig
	Security SecurityConfig
	Logging  LoggingConfig
}

type ServerConfig struct {
	Port              int
	Host              string
	TLSCert           string
	TLSKey            string
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	ShutdownTimeout   time.Duration
	MaxConnections    int
	RateLimitPerMin   int
	RateLimitPerIP    int
}

type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	DBName          string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	SSLMode         string
}

type AuthConfig struct {
	JWTSecret              string
	JWTExpiry              time.Duration
	RefreshTokenExpiry     time.Duration
	TOTPWindowSize         int
	PasswordMinLength      int
	SessionTimeout         time.Duration
	AllowedOrigins         []string
}

type LibvirtConfig struct {
	URI                  string
	ConnectionTimeout    time.Duration
	EventStreamTimeout   time.Duration
	CircuitBreakerLimit  int
	CircuitBreakerReset  time.Duration
	MaxConnectionPooling int
}

type SecurityConfig struct {
	AllowedCORSOrigins []string
	EncryptionKey      string
	BCryptCost         int
	TLSMinVersion      string
	RequireTLS         bool
}

type LoggingConfig struct {
	Level  string
	Format string
	Output string
}

func Load() (*Config, error) {
	_ = godotenv.Load(".env.local")
	_ = godotenv.Load(".env")

	cfg := &Config{
		Server: ServerConfig{
			Port:            getEnvInt("SERVER_PORT", 8443),
			Host:            getEnv("SERVER_HOST", "0.0.0.0"),
			TLSCert:         getEnv("TLS_CERT_PATH", ""),
			TLSKey:          getEnv("TLS_KEY_PATH", ""),
			ReadTimeout:     getEnvDuration("SERVER_READ_TIMEOUT", 30*time.Second),
			WriteTimeout:    getEnvDuration("SERVER_WRITE_TIMEOUT", 30*time.Second),
			ShutdownTimeout: getEnvDuration("SERVER_SHUTDOWN_TIMEOUT", 10*time.Second),
			MaxConnections:  getEnvInt("SERVER_MAX_CONNECTIONS", 10000),
			RateLimitPerMin: getEnvInt("RATELIMIT_PER_MIN", 100),
			RateLimitPerIP:  getEnvInt("RATELIMIT_PER_IP", 1000),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnvInt("DB_PORT", 5432),
			User:            getEnv("DB_USER", "reemote"),
			Password:        getEnv("DB_PASSWORD", ""),
			DBName:          getEnv("DB_NAME", "reemote"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 20),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
			SSLMode:         getEnv("DB_SSL_MODE", "require"),
		},
		Auth: AuthConfig{
			JWTSecret:          getEnv("JWT_SECRET", ""),
			JWTExpiry:          getEnvDuration("JWT_EXPIRY", 15*time.Minute),
			RefreshTokenExpiry: getEnvDuration("REFRESH_TOKEN_EXPIRY", 7*24*time.Hour),
			TOTPWindowSize:     getEnvInt("TOTP_WINDOW_SIZE", 1),
			PasswordMinLength:  getEnvInt("PASSWORD_MIN_LENGTH", 12),
			SessionTimeout:     getEnvDuration("SESSION_TIMEOUT", 24*time.Hour),
		},
		Libvirt: LibvirtConfig{
			URI:                  getEnv("LIBVIRT_URI", "qemu:///system"),
			ConnectionTimeout:    getEnvDuration("LIBVIRT_TIMEOUT", 30*time.Second),
			EventStreamTimeout:   getEnvDuration("LIBVIRT_EVENT_TIMEOUT", 5*time.Minute),
			CircuitBreakerLimit:  getEnvInt("LIBVIRT_CIRCUIT_LIMIT", 5),
			CircuitBreakerReset:  getEnvDuration("LIBVIRT_CIRCUIT_RESET", 30*time.Second),
			MaxConnectionPooling: getEnvInt("LIBVIRT_MAX_POOLING", 10),
		},
		Security: SecurityConfig{
			AllowedCORSOrigins: []string{getEnv("ALLOWED_CORS_ORIGINS", "http://localhost:3000")},
			EncryptionKey:      getEnv("ENCRYPTION_KEY", ""),
			BCryptCost:         getEnvInt("BCRYPT_COST", 12),
			TLSMinVersion:      getEnv("TLS_MIN_VERSION", "1.3"),
			RequireTLS:         getEnvBool("REQUIRE_TLS", true),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
			Output: getEnv("LOG_OUTPUT", "stdout"),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	if c.Auth.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET must be set")
	}
	if len(c.Auth.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}
	if c.Database.Password == "" {
		return fmt.Errorf("DB_PASSWORD must be set")
	}
	if c.Security.EncryptionKey == "" && os.Getenv("ENV") == "production" {
		return fmt.Errorf("ENCRYPTION_KEY must be set in production")
	}
	return nil
}

func (c *Config) GetDatabaseDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.Database.User,
		c.Database.Password,
		c.Database.Host,
		c.Database.Port,
		c.Database.DBName,
		c.Database.SSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
		log.Printf("Warning: invalid int value for %s, using default %d\n", key, defaultValue)
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
		log.Printf("Warning: invalid duration value for %s, using default %v\n", key, defaultValue)
	}
	return defaultValue
}
