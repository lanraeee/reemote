package console

import (
	"context"
	"fmt"
	"io"
	"net"
	"sync"
	"time"
)

type VNCConnectionStats struct {
	BytesSent     int64
	BytesReceived int64
	FramesSent    int64
	KeyEvents     int64
	MouseEvents   int64
	StartTime     time.Time
	LastActivity  time.Time
}

type VNCProxy struct {
	vmAddress    string
	timeout      time.Duration
	stats        *VNCConnectionStats
	mu           sync.RWMutex
	remoteConn   net.Conn
	isConnected  bool
	compressionLevel int
}

func NewVNCProxy(vmAddress string, timeout time.Duration) *VNCProxy {
	return &VNCProxy{
		vmAddress:        vmAddress,
		timeout:          timeout,
		compressionLevel: 6,
		stats: &VNCConnectionStats{
			StartTime: time.Now(),
		},
	}
}

func (vp *VNCProxy) Connect(ctx context.Context) error {
	vp.mu.Lock()
	defer vp.mu.Unlock()

	dialer := net.Dialer{Timeout: vp.timeout}
	conn, err := dialer.DialContext(ctx, "tcp", vp.vmAddress)
	if err != nil {
		return fmt.Errorf("failed to connect to VM: %w", err)
	}

	vp.remoteConn = conn
	vp.isConnected = true
	vp.stats.LastActivity = time.Now()

	return nil
}

func (vp *VNCProxy) Close() error {
	vp.mu.Lock()
	defer vp.mu.Unlock()

	if vp.remoteConn == nil {
		return nil
	}

	vp.isConnected = false
	return vp.remoteConn.Close()
}

func (vp *VNCProxy) IsConnected() bool {
	vp.mu.RLock()
	defer vp.mu.RUnlock()
	return vp.isConnected
}

func (vp *VNCProxy) WriteMessage(data []byte) (int, error) {
	vp.mu.Lock()
	defer vp.mu.Unlock()

	if !vp.isConnected || vp.remoteConn == nil {
		return 0, fmt.Errorf("not connected")
	}

	n, err := vp.remoteConn.Write(data)
	vp.stats.BytesSent += int64(n)
	vp.stats.LastActivity = time.Now()

	return n, err
}

func (vp *VNCProxy) ReadMessage(maxSize int) ([]byte, error) {
	vp.mu.Lock()
	if !vp.isConnected || vp.remoteConn == nil {
		vp.mu.Unlock()
		return nil, fmt.Errorf("not connected")
	}
	conn := vp.remoteConn
	vp.mu.Unlock()

	data := make([]byte, maxSize)
	n, err := conn.Read(data)

	vp.mu.Lock()
	vp.stats.BytesReceived += int64(n)
	vp.stats.LastActivity = time.Now()
	vp.mu.Unlock()

	if err != nil && err != io.EOF {
		return nil, err
	}

	return data[:n], nil
}

func (vp *VNCProxy) HandleFramebufferUpdate(update *FramebufferUpdate) error {
	vp.mu.Lock()
	defer vp.mu.Unlock()

	vp.stats.FramesSent++
	vp.stats.LastActivity = time.Now()

	// In production, would send to WebSocket client
	return nil
}

func (vp *VNCProxy) HandleKeyEvent(event *KeyEvent) error {
	vp.mu.Lock()
	defer vp.mu.Unlock()

	vp.stats.KeyEvents++
	vp.stats.LastActivity = time.Now()

	// Send to VM via remote connection
	if !vp.isConnected || vp.remoteConn == nil {
		return fmt.Errorf("not connected")
	}

	return nil
}

func (vp *VNCProxy) HandlePointerEvent(event *PointerEvent) error {
	vp.mu.Lock()
	defer vp.mu.Unlock()

	vp.stats.MouseEvents++
	vp.stats.LastActivity = time.Now()

	// Send to VM via remote connection
	if !vp.isConnected || vp.remoteConn == nil {
		return fmt.Errorf("not connected")
	}

	return nil
}

func (vp *VNCProxy) GetStats() *VNCConnectionStats {
	vp.mu.RLock()
	defer vp.mu.RUnlock()

	return &VNCConnectionStats{
		BytesSent:     vp.stats.BytesSent,
		BytesReceived: vp.stats.BytesReceived,
		FramesSent:    vp.stats.FramesSent,
		KeyEvents:     vp.stats.KeyEvents,
		MouseEvents:   vp.stats.MouseEvents,
		StartTime:     vp.stats.StartTime,
		LastActivity:  vp.stats.LastActivity,
	}
}

func (vp *VNCProxy) GetUptime() time.Duration {
	stats := vp.GetStats()
	return time.Since(stats.StartTime)
}

func (vp *VNCProxy) GetBandwidth() float64 {
	stats := vp.GetStats()
	uptime := time.Since(stats.StartTime).Seconds()

	if uptime == 0 {
		return 0
	}

	totalBytes := stats.BytesSent + stats.BytesReceived
	return float64(totalBytes) / uptime
}

type VNCProxyPool struct {
	mu           sync.RWMutex
	proxies      map[string]*VNCProxy
	defaultTimeout time.Duration
}

func NewVNCProxyPool(defaultTimeout time.Duration) *VNCProxyPool {
	return &VNCProxyPool{
		proxies:        make(map[string]*VNCProxy),
		defaultTimeout: defaultTimeout,
	}
}

func (pool *VNCProxyPool) GetProxy(vmID, vmAddress string) (*VNCProxy, error) {
	pool.mu.Lock()
	defer pool.mu.Unlock()

	if proxy, exists := pool.proxies[vmID]; exists && proxy.IsConnected() {
		return proxy, nil
	}

	proxy := NewVNCProxy(vmAddress, pool.defaultTimeout)
	ctx, cancel := context.WithTimeout(context.Background(), pool.defaultTimeout)
	defer cancel()

	if err := proxy.Connect(ctx); err != nil {
		return nil, fmt.Errorf("failed to create proxy: %w", err)
	}

	pool.proxies[vmID] = proxy
	return proxy, nil
}

func (pool *VNCProxyPool) RemoveProxy(vmID string) error {
	pool.mu.Lock()
	defer pool.mu.Unlock()

	if proxy, exists := pool.proxies[vmID]; exists {
		delete(pool.proxies, vmID)
		return proxy.Close()
	}

	return nil
}

func (pool *VNCProxyPool) CloseAll() error {
	pool.mu.Lock()
	defer pool.mu.Unlock()

	for _, proxy := range pool.proxies {
		proxy.Close()
	}

	pool.proxies = make(map[string]*VNCProxy)
	return nil
}

func (pool *VNCProxyPool) GetProxyStats(vmID string) (*VNCConnectionStats, error) {
	pool.mu.RLock()
	defer pool.mu.RUnlock()

	proxy, exists := pool.proxies[vmID]
	if !exists {
		return nil, fmt.Errorf("proxy not found for VM: %s", vmID)
	}

	return proxy.GetStats(), nil
}
