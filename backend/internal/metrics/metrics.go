package metrics

import (
	"sync"
	"sync/atomic"
	"time"
)

type Counter struct {
	value int64
}

func NewCounter() *Counter {
	return &Counter{}
}

func (c *Counter) Inc() {
	c.Add(1)
}

func (c *Counter) Add(delta int64) {
	atomic.AddInt64(&c.value, delta)
}

func (c *Counter) Value() int64 {
	return atomic.LoadInt64(&c.value)
}

type Gauge struct {
	value int64
}

func NewGauge() *Gauge {
	return &Gauge{}
}

func (g *Gauge) Set(value int64) {
	atomic.StoreInt64(&g.value, value)
}

func (g *Gauge) Get() int64 {
	return atomic.LoadInt64(&g.value)
}

func (g *Gauge) Inc() {
	atomic.AddInt64(&g.value, 1)
}

func (g *Gauge) Dec() {
	atomic.AddInt64(&g.value, -1)
}

type Histogram struct {
	mu      sync.Mutex
	buckets map[int64]int64
	sum     int64
	count   int64
}

func NewHistogram() *Histogram {
	return &Histogram{
		buckets: make(map[int64]int64),
	}
}

func (h *Histogram) Observe(value int64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.buckets[value]++
	h.sum += value
	h.count++
}

func (h *Histogram) ObserveDuration(start time.Time) {
	h.Observe(time.Since(start).Milliseconds())
}

func (h *Histogram) Count() int64 {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.count
}

func (h *Histogram) Sum() int64 {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.sum
}

func (h *Histogram) Mean() float64 {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.count == 0 {
		return 0
	}
	return float64(h.sum) / float64(h.count)
}

type Metrics struct {
	// API metrics
	HTTPRequestsTotal       *Counter
	HTTPRequestDuration     *Histogram
	HTTPErrors              *Counter
	HTTPRateLimitedRequests *Counter

	// Authentication metrics
	LoginAttempts     *Counter
	LoginSuccesses    *Counter
	LoginFailures     *Counter
	TokensGenerated   *Counter
	TokenValidations  *Counter

	// Console metrics
	ConsoleConnections    *Counter
	ConsoleDisconnections *Counter
	ConsoleSessionCount   *Gauge
	ConsoleFramesSent     *Counter
	ConsoleKeyEvents      *Counter
	ConsolePointerEvents  *Counter

	// VM metrics
	VMOperations     *Counter
	VMStateChanges   *Counter
	VMCreatedTotal   *Counter
	VMDeletedTotal   *Counter
	VMsRunning       *Gauge
	VMsStopped       *Gauge

	// Database metrics
	DBConnections      *Gauge
	DBQueryDuration    *Histogram
	DBQueryErrors      *Counter
	DBConnectionErrors *Counter

	// Libvirt metrics
	LibvirtConnections    *Gauge
	LibvirtOperations     *Counter
	LibvirtErrors         *Counter
	LibvirtCircuitBreaker *Gauge
}

var defaultMetrics *Metrics
var once sync.Once

func GetMetrics() *Metrics {
	once.Do(func() {
		defaultMetrics = &Metrics{
			HTTPRequestsTotal:       NewCounter(),
			HTTPRequestDuration:     NewHistogram(),
			HTTPErrors:              NewCounter(),
			HTTPRateLimitedRequests: NewCounter(),

			LoginAttempts:     NewCounter(),
			LoginSuccesses:    NewCounter(),
			LoginFailures:     NewCounter(),
			TokensGenerated:   NewCounter(),
			TokenValidations:  NewCounter(),

			ConsoleConnections:    NewCounter(),
			ConsoleDisconnections: NewCounter(),
			ConsoleSessionCount:   NewGauge(),
			ConsoleFramesSent:     NewCounter(),
			ConsoleKeyEvents:      NewCounter(),
			ConsolePointerEvents:  NewCounter(),

			VMOperations:     NewCounter(),
			VMStateChanges:   NewCounter(),
			VMCreatedTotal:   NewCounter(),
			VMDeletedTotal:   NewCounter(),
			VMsRunning:       NewGauge(),
			VMsStopped:       NewGauge(),

			DBConnections:      NewGauge(),
			DBQueryDuration:    NewHistogram(),
			DBQueryErrors:      NewCounter(),
			DBConnectionErrors: NewCounter(),

			LibvirtConnections:    NewGauge(),
			LibvirtOperations:     NewCounter(),
			LibvirtErrors:         NewCounter(),
			LibvirtCircuitBreaker: NewGauge(),
		}
	})
	return defaultMetrics
}

func Summary() map[string]interface{} {
	m := GetMetrics()
	return map[string]interface{}{
		"http": map[string]interface{}{
			"requests_total":       m.HTTPRequestsTotal.Value(),
			"errors":               m.HTTPErrors.Value(),
			"rate_limited":         m.HTTPRateLimitedRequests.Value(),
			"avg_duration_ms":      m.HTTPRequestDuration.Mean(),
		},
		"auth": map[string]interface{}{
			"login_attempts":     m.LoginAttempts.Value(),
			"login_successes":    m.LoginSuccesses.Value(),
			"login_failures":     m.LoginFailures.Value(),
			"tokens_generated":   m.TokensGenerated.Value(),
		},
		"console": map[string]interface{}{
			"connections":     m.ConsoleConnections.Value(),
			"disconnections":  m.ConsoleDisconnections.Value(),
			"active_sessions": m.ConsoleSessionCount.Get(),
			"frames_sent":     m.ConsoleFramesSent.Value(),
			"key_events":      m.ConsoleKeyEvents.Value(),
			"pointer_events":  m.ConsolePointerEvents.Value(),
		},
		"vm": map[string]interface{}{
			"operations":   m.VMOperations.Value(),
			"state_changes": m.VMStateChanges.Value(),
			"created_total": m.VMCreatedTotal.Value(),
			"deleted_total": m.VMDeletedTotal.Value(),
			"running":      m.VMsRunning.Get(),
			"stopped":      m.VMsStopped.Get(),
		},
		"database": map[string]interface{}{
			"connections":  m.DBConnections.Get(),
			"query_errors": m.DBQueryErrors.Value(),
			"avg_duration": m.DBQueryDuration.Mean(),
		},
		"libvirt": map[string]interface{}{
			"connections":     m.LibvirtConnections.Get(),
			"operations":      m.LibvirtOperations.Value(),
			"errors":          m.LibvirtErrors.Value(),
			"circuit_breaker": m.LibvirtCircuitBreaker.Get(),
		},
	}
}
