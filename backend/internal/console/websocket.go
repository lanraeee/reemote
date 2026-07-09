package console

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

type WebSocketMessage struct {
	Type    string          `json:"type"`
	Data    json.RawMessage `json:"data"`
	Payload interface{}     `json:"payload,omitempty"`
}

type KeyEventMessage struct {
	Key      uint32 `json:"key"`
	DownFlag bool   `json:"down"`
}

type PointerEventMessage struct {
	X           uint16 `json:"x"`
	Y           uint16 `json:"y"`
	ButtonMask  uint8  `json:"button_mask"`
}

type FramebufferUpdateMessage struct {
	Rectangles []struct {
		X        uint16 `json:"x"`
		Y        uint16 `json:"y"`
		Width    uint16 `json:"width"`
		Height   uint16 `json:"height"`
		Encoding int32  `json:"encoding"`
		Data     string `json:"data"`
	} `json:"rectangles"`
}

type ConsoleSession struct {
	id           string
	userID       string
	vmID         string
	vmAddress    string
	vncProxy     *VNCProxy
	mu           sync.RWMutex
	createdAt    time.Time
	lastActivity time.Time
	closed       bool
}

func NewConsoleSession(id, userID, vmID, vmAddress string) *ConsoleSession {
	return &ConsoleSession{
		id:        id,
		userID:    userID,
		vmID:      vmID,
		vmAddress: vmAddress,
		createdAt: time.Now(),
		vncProxy:  NewVNCProxy(vmAddress, 30*time.Second),
	}
}

func (cs *ConsoleSession) Connect(ctx context.Context) error {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	if cs.closed {
		return fmt.Errorf("session is closed")
	}

	if err := cs.vncProxy.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect VNC proxy: %w", err)
	}

	cs.lastActivity = time.Now()
	return nil
}

func (cs *ConsoleSession) Close() error {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	if cs.closed {
		return nil
	}

	cs.closed = true
	return cs.vncProxy.Close()
}

func (cs *ConsoleSession) IsActive() bool {
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	return !cs.closed && cs.vncProxy.IsConnected()
}

func (cs *ConsoleSession) UpdateActivity() {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	cs.lastActivity = time.Now()
}

func (cs *ConsoleSession) GetStats() map[string]interface{} {
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	stats := cs.vncProxy.GetStats()

	return map[string]interface{}{
		"session_id":    cs.id,
		"user_id":       cs.userID,
		"vm_id":         cs.vmID,
		"created_at":    cs.createdAt,
		"last_activity": cs.lastActivity,
		"uptime":        cs.vncProxy.GetUptime().String(),
		"bandwidth":     cs.vncProxy.GetBandwidth(),
		"bytes_sent":    stats.BytesSent,
		"bytes_received": stats.BytesReceived,
		"frames_sent":   stats.FramesSent,
		"key_events":    stats.KeyEvents,
		"mouse_events":  stats.MouseEvents,
	}
}

type ConsoleManager struct {
	mu       sync.RWMutex
	sessions map[string]*ConsoleSession
	proxyPool *VNCProxyPool
}

func NewConsoleManager() *ConsoleManager {
	return &ConsoleManager{
		sessions: make(map[string]*ConsoleSession),
		proxyPool: NewVNCProxyPool(30 * time.Second),
	}
}

func (cm *ConsoleManager) CreateSession(sessionID, userID, vmID, vmAddress string) (*ConsoleSession, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if _, exists := cm.sessions[sessionID]; exists {
		return nil, fmt.Errorf("session already exists")
	}

	session := NewConsoleSession(sessionID, userID, vmID, vmAddress)
	cm.sessions[sessionID] = session

	return session, nil
}

func (cm *ConsoleManager) GetSession(sessionID string) (*ConsoleSession, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	session, exists := cm.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session not found")
	}

	return session, nil
}

func (cm *ConsoleManager) CloseSession(sessionID string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	session, exists := cm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found")
	}

	delete(cm.sessions, sessionID)
	return session.Close()
}

func (cm *ConsoleManager) ListSessions() []*ConsoleSession {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	sessions := make([]*ConsoleSession, 0, len(cm.sessions))
	for _, session := range cm.sessions {
		sessions = append(sessions, session)
	}

	return sessions
}

func (cm *ConsoleManager) CleanupInactive(timeout time.Duration) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	now := time.Now()
	for sessionID, session := range cm.sessions {
		if !session.IsActive() || now.Sub(session.lastActivity) > timeout {
			delete(cm.sessions, sessionID)
			session.Close()
		}
	}
}

type WebSocketConsoleHandler struct {
	consoleManager *ConsoleManager
	sessionRepo    interface{} // Would be ConsoleSessionRepository in real impl
}

func NewWebSocketConsoleHandler(consoleManager *ConsoleManager) *WebSocketConsoleHandler {
	return &WebSocketConsoleHandler{
		consoleManager: consoleManager,
	}
}

func (wsh *WebSocketConsoleHandler) HandleConnect(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("session_id")
	if sessionID == "" {
		http.Error(w, "session_id required", http.StatusBadRequest)
		return
	}

	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(w, "X-User-ID header required", http.StatusUnauthorized)
		return
	}

	vmID := r.PathValue("vm_id")
	if vmID == "" {
		http.Error(w, "vm_id required", http.StatusBadRequest)
		return
	}

	// In production, would:
	// 1. Validate user has permission to access VM
	// 2. Get VM network address from libvirt
	// 3. Check permission level (view allows read-only)

	vmAddress := r.Header.Get("X-VM-Address")
	if vmAddress == "" {
		vmAddress = "localhost:5900"
	}

	// Create console session
	session, err := wsh.consoleManager.CreateSession(sessionID, userID, vmID, vmAddress)
	if err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}

	// Connect to VM
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := session.Connect(ctx); err != nil {
		wsh.consoleManager.CloseSession(sessionID)
		http.Error(w, fmt.Sprintf("failed to connect to VM: %v", err), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"session_id": sessionID,
		"status":     "connected",
	})
}

func (wsh *WebSocketConsoleHandler) HandleMessage(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("session_id")

	session, err := wsh.consoleManager.GetSession(sessionID)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	var msg WebSocketMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "invalid message", http.StatusBadRequest)
		return
	}

	session.UpdateActivity()

	switch msg.Type {
	case "key":
		var keyMsg KeyEventMessage
		if err := json.Unmarshal(msg.Data, &keyMsg); err != nil {
			http.Error(w, "invalid key message", http.StatusBadRequest)
			return
		}

		event := &KeyEvent{
			Type: 4,
			Key:  keyMsg.Key,
		}
		if keyMsg.DownFlag {
			event.DownFlag = 1
		}

		if err := session.vncProxy.HandleKeyEvent(event); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

	case "pointer":
		var pointerMsg PointerEventMessage
		if err := json.Unmarshal(msg.Data, &pointerMsg); err != nil {
			http.Error(w, "invalid pointer message", http.StatusBadRequest)
			return
		}

		event := &PointerEvent{
			Type:       5,
			ButtonMask: pointerMsg.ButtonMask,
			XPos:       pointerMsg.X,
			YPos:       pointerMsg.Y,
		}

		if err := session.vncProxy.HandlePointerEvent(event); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

	case "get_stats":
		stats := session.GetStats()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
		return

	default:
		http.Error(w, fmt.Sprintf("unknown message type: %s", msg.Type), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (wsh *WebSocketConsoleHandler) HandleDisconnect(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("session_id")

	if err := wsh.consoleManager.CloseSession(sessionID); err != nil {
		log.Printf("Error closing session %s: %v", sessionID, err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "disconnected"})
}

func (wsh *WebSocketConsoleHandler) StartCleanupRoutine(interval, timeout time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			wsh.consoleManager.CleanupInactive(timeout)
		}
	}()
}
