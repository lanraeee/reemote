package libvirt

import (
	"fmt"
	"sync"
	"time"
)

type CircuitState string

const (
	CircuitClosed CircuitState = "closed"
	CircuitOpen   CircuitState = "open"
	CircuitHalf   CircuitState = "half-open"
)

type CircuitBreaker struct {
	state          CircuitState
	failureCount   int
	successCount   int
	lastFailTime   time.Time
	mutex          sync.RWMutex
	failureLimit   int
	resetTimeout   time.Duration
	successThresh  int
}

func NewCircuitBreaker(failureLimit int, resetTimeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:         CircuitClosed,
		failureLimit:  failureLimit,
		resetTimeout:  resetTimeout,
		successThresh: 2,
	}
}

func (cb *CircuitBreaker) Call(fn func() error) error {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	if cb.state == CircuitOpen {
		if time.Since(cb.lastFailTime) > cb.resetTimeout {
			cb.state = CircuitHalf
			cb.successCount = 0
			cb.failureCount = 0
		} else {
			return fmt.Errorf("circuit breaker is open")
		}
	}

	err := fn()

	if err != nil {
		cb.failureCount++
		cb.lastFailTime = time.Now()

		if cb.failureCount >= cb.failureLimit {
			cb.state = CircuitOpen
			return fmt.Errorf("circuit breaker opened after %d failures: %w", cb.failureCount, err)
		}

		return err
	}

	cb.failureCount = 0

	if cb.state == CircuitHalf {
		cb.successCount++
		if cb.successCount >= cb.successThresh {
			cb.state = CircuitClosed
		}
	}

	return nil
}

func (cb *CircuitBreaker) GetState() CircuitState {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()
	return cb.state
}

type ConnectionPool struct {
	mutex              sync.Mutex
	conns              []*Connection
	availableConns     chan *Connection
	maxConnections     int
	connectionTimeout  time.Duration
	uri                string
	circuitBreaker     *CircuitBreaker
}

type Connection struct {
	uri      string
	timeout  time.Duration
	created  time.Time
	lastUsed time.Time
}

func NewConnectionPool(uri string, maxConnections int, timeout time.Duration, failureLimit int, resetTimeout time.Duration) *ConnectionPool {
	return &ConnectionPool{
		uri:               uri,
		maxConnections:    maxConnections,
		connectionTimeout: timeout,
		availableConns:    make(chan *Connection, maxConnections),
		conns:             make([]*Connection, 0, maxConnections),
		circuitBreaker:    NewCircuitBreaker(failureLimit, resetTimeout),
	}
}

func (cp *ConnectionPool) GetConnection() (*Connection, error) {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	select {
	case conn := <-cp.availableConns:
		conn.lastUsed = time.Now()
		return conn, nil
	default:
		if len(cp.conns) < cp.maxConnections {
			conn := &Connection{
				uri:      cp.uri,
				timeout:  cp.connectionTimeout,
				created:  time.Now(),
				lastUsed: time.Now(),
			}
			cp.conns = append(cp.conns, conn)
			return conn, nil
		}
	}

	select {
	case conn := <-cp.availableConns:
		conn.lastUsed = time.Now()
		return conn, nil
	case <-time.After(cp.connectionTimeout):
		return nil, fmt.Errorf("timeout waiting for available connection")
	}
}

func (cp *ConnectionPool) ReleaseConnection(conn *Connection) {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	select {
	case cp.availableConns <- conn:
	default:
	}
}

func (cp *ConnectionPool) Close() error {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	for len(cp.availableConns) > 0 {
		<-cp.availableConns
	}

	cp.conns = make([]*Connection, 0)
	return nil
}

type LibvirtClient struct {
	pool *ConnectionPool
}

func NewLibvirtClient(uri string, maxConnections int, timeout time.Duration, failureLimit int, resetTimeout time.Duration) *LibvirtClient {
	return &LibvirtClient{
		pool: NewConnectionPool(uri, maxConnections, timeout, failureLimit, resetTimeout),
	}
}

func (lc *LibvirtClient) GetCircuitBreakerState() CircuitState {
	return lc.pool.circuitBreaker.GetState()
}

func (lc *LibvirtClient) Close() error {
	return lc.pool.Close()
}

func (lc *LibvirtClient) Ping() error {
	return lc.pool.circuitBreaker.Call(func() error {
		conn, err := lc.pool.GetConnection()
		if err != nil {
			return fmt.Errorf("failed to get connection: %w", err)
		}
		defer lc.pool.ReleaseConnection(conn)

		// Simulate libvirt connection test
		if conn.uri == "" {
			return fmt.Errorf("connection URI not set")
		}

		return nil
	})
}
