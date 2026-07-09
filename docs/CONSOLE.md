# Remote Console Implementation (Phase 3)

## Overview

Phase 3 implements remote console access to virtual machines via VNC protocol over WebSocket, enabling web-based VM interaction without plugins.

## Architecture

```
┌─────────────────┐
│  Browser Client │
│  (JavaScript)   │
└────────┬────────┘
         │ JSON/WebSocket
         ↓
┌─────────────────────────────────────┐
│  WebSocket Console Handler          │
│  (console/websocket.go)             │
│  - Session management               │
│  - Message routing                  │
│  - Permission checking              │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Console Session                    │
│  - User/VM binding                  │
│  - Activity tracking                │
│  - Statistics collection            │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  VNC Proxy                          │
│  (console/vnc_proxy.go)             │
│  - Connection pooling               │
│  - Frame handling                   │
│  - Input routing                    │
│  - Bandwidth tracking               │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  VNC Protocol Handler               │
│  (console/vnc_protocol.go)          │
│  - Protocol parsing                 │
│  - Message serialization            │
│  - RFB 3.8 support                  │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  VM via Hypervisor                  │
│  (QEMU/KVM)                         │
└─────────────────────────────────────┘
```

## Components

### 1. VNC Protocol (`console/vnc_protocol.go`)

Implements RFB (Remote Framebuffer) Protocol 3.8 specification.

**Message Types**:

**Server → Client**:
- `FramebufferUpdate` (0) - Screen frame data
- `SetColorMapEntries` (1) - Color palette
- `Bell` (2) - Alert tone
- `ServerCutText` (3) - Clipboard data

**Client → Server**:
- `SetPixelFormat` (0) - Screen format negotiation
- `SetEncodings` (2) - Compression methods
- `FramebufferUpdateRequest` (3) - Request screen update
- `KeyEvent` (4) - Keyboard input
- `PointerEvent` (5) - Mouse input
- `ClientCutText` (6) - Clipboard data

**Encodings Supported**:
```
EncodingRaw (0)              # Uncompressed
EncodingCopyRect (1)         # Copy region
EncodingRRE (2)              # Run-length encoding
EncodingCoRRE (4)            # Compact RLE
EncodingHextile (5)          # Tiled compression
EncodingZLIB (6)             # Full zlib
EncodingTight (7)            # Tight compression
EncodingZRLE (16)            # ZRLE
EncodingJPEG (21)            # JPEG
EncodingPseudoCursor (-239)  # Cursor shape
EncodingPseudoDesktopSize (-223) # Desktop resize
```

### 2. VNC Proxy (`console/vnc_proxy.go`)

Bridges WebSocket connection to VNC server.

**Key Features**:
- **Connection Pooling**: Reuse TCP connections to VM
- **Thread-Safe**: RWMutex protected statistics
- **Bandwidth Tracking**: Bytes sent/received, frames, events
- **Input Handling**: Keyboard (KeyEvent) and mouse (PointerEvent)
- **Statistics**: Real-time performance metrics

**Methods**:
```go
Connect(ctx)                      // Connect to VM's VNC port
Close()                           // Disconnect
WriteMessage(data []byte)         // Send to VM
ReadMessage(maxSize)              // Read from VM
HandleKeyEvent(event)             // Process keyboard
HandlePointerEvent(event)         // Process mouse
HandleFramebufferUpdate(update)   // Send frame to client
GetStats()                        // Performance metrics
```

**Statistics Tracked**:
- BytesSent / BytesReceived
- FramesSent
- KeyEvents / MouseEvents
- Uptime, LastActivity
- Bandwidth (bytes/sec)

### 3. Console Session (`console/websocket.go`)

Represents a user's connection to a VM console.

**Lifecycle**:
```
Create → Connect → Active → Disconnect → Close
```

**Session Data**:
- Session ID (unique identifier)
- User ID (who is connecting)
- VM ID (which VM)
- VM Address (network location)
- Connected timestamp
- Last activity timestamp
- VNC proxy instance

**Session Methods**:
```go
Connect(ctx)              // Establish VNC connection
Close()                   // Disconnect and cleanup
IsActive()                // Check if still connected
UpdateActivity()          // Track last access time
GetStats()                // Session statistics
```

### 4. Console Manager (`console/websocket.go`)

Manages multiple concurrent console sessions.

**Responsibilities**:
- Create new sessions
- Retrieve active sessions
- Clean up inactive sessions (timeout after 30 minutes)
- Maintain global session registry

**Methods**:
```go
CreateSession(id, userID, vmID, address)
GetSession(sessionID)
CloseSession(sessionID)
ListSessions()
CleanupInactive(timeout)          // Remove stale sessions
```

### 5. Frame Compression (`console/compression.go`)

Optimizes bandwidth usage with multiple compression algorithms.

**Compression Types**:
- **None**: Raw frames (reference)
- **ZLIB**: RFC 1950 (RFC 1951 + header)
- **Deflate**: RFC 1951 (raw DEFLATE)

**Adaptive Compression**:
- Monitors total compression ratio
- Adjusts level based on bandwidth
- Level 1-9 (1=fastest, 9=smallest)

**Bandwidth Optimizer**:
```go
OptimizeFrame(frame)               // Compress
AdjustQuality(bytesPerSecond)      // Dynamic adjustment
GetCompressionRatio()              // Current ratio
```

**Adjustment Strategy**:
```
bytesPerSecond / targetBitrate:
  > 1.5 → Level 9 (maximum compression)
  > 1.2 → Level 8
  0.8-1.2 → Level 6 (balanced)
  < 0.5 → Level 1 (minimum latency)
```

## API Endpoints (Phase 3)

### Console Connection

**POST** `/api/v1/vms/{vm_id}/console/connect`

Request:
```json
{}
```

Response:
```json
{
  "session_id": "uuid-string",
  "status": "connected"
}
```

**Requirements**:
- User must have "view" permission on VM
- Returns session ID for all subsequent requests

### Console Message (Input)

**POST** `/api/v1/console/{session_id}/message`

**Keyboard Event**:
```json
{
  "type": "key",
  "data": {
    "key": 65,
    "down": true
  }
}
```

**Pointer Event**:
```json
{
  "type": "pointer",
  "data": {
    "x": 100,
    "y": 200,
    "button_mask": 1
  }
}
```

**Button Mask** (XButton):
- Bit 0: Left button
- Bit 1: Middle button
- Bit 2: Right button
- Bits 3-7: Reserved

### Console Stats

**GET** `/api/v1/console/{session_id}/stats`

Response:
```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "vm_id": "uuid",
  "created_at": "2024-01-15T10:30:00Z",
  "last_activity": "2024-01-15T10:35:00Z",
  "uptime": "5m30s",
  "bandwidth": 1024000,
  "bytes_sent": 5120000,
  "bytes_received": 2560000,
  "frames_sent": 500,
  "key_events": 150,
  "mouse_events": 250
}
```

### Console Disconnect

**POST** `/api/v1/console/{session_id}/disconnect`

Response:
```json
{
  "status": "disconnected"
}
```

## Security Considerations

### Authentication
- ✅ JWT token required for all console endpoints
- ✅ Token validated before session creation
- ✅ User ID extracted from token

### Authorization
- ✅ Permission check before connect:
  - User must have "view" access minimum
  - Read-only mode for "view" permission
  - Full control with "control" permission
- ✅ Admin can override permissions

### Data Protection
- ✅ VNC traffic can be encrypted (TLS over TCP)
- ✅ WebSocket runs over HTTPS in production
- ✅ Frame compression doesn't include metadata

### Session Management
- ✅ Session timeout after 30 minutes of inactivity
- ✅ Automatic cleanup of disconnected sessions
- ✅ Per-user session limits (configurable)

## Performance Optimization

### Bandwidth Management

1. **Selective Updates**:
   - Client requests only changed regions
   - Server sends incremental updates
   - Reduces unnecessary data transfer

2. **Compression**:
   - ZLIB compression for typical frames
   - Adaptive level based on bandwidth
   - Configurable compression ratio threshold

3. **Frame Rate Limiting**:
   - Server limits update frequency
   - Client batches input events
   - Reduces CPU usage

### Resource Usage

**Per Session**:
- Memory: ~10MB base + 1MB per VNC buffer
- CPU: Proportional to frame rate and compression
- Network: 1-10 Mbps depending on activity

**Pooling**:
- Reuses TCP connections
- Limits concurrent connections per VM
- Prevents resource exhaustion

## Browser Integration

### JavaScript Client Library (Phase 4)

```javascript
// Create console client
const console = new ConsoleClient('http://localhost:8443/api/v1');

// Connect
const session = await console.connect(vmId);

// Render framebuffer
canvas.updateFrame(session.frameData);

// Send input
session.sendKey(65, true);  // 'A' down
session.sendPointer(100, 200, 1);  // Click at (100,200)

// Monitor stats
const stats = await session.getStats();
console.log(`Bandwidth: ${stats.bandwidth} bps`);

// Disconnect
await session.disconnect();
```

### HTML Structure (Phase 4)

```html
<div id="console">
  <canvas id="framebuffer" width="1024" height="768"></canvas>
  <div id="stats">
    <span id="bandwidth">Bandwidth: --</span>
    <span id="fps">FPS: --</span>
  </div>
</div>
```

## Troubleshooting

### Issue: "Connection refused" to VM

**Cause**: VM not running or VNC port not open

**Solution**:
1. Verify VM is powered on: `virsh list --all`
2. Check VNC is enabled in VM XML
3. Verify network connectivity
4. Check firewall rules

### Issue: High latency/lag

**Cause**: Network congestion or low compression

**Solution**:
1. Increase compression level (adaptive will auto-adjust)
2. Check network bandwidth: `iftop`
3. Reduce frame rate if CPU-limited
4. Check VM CPU usage: `top`

### Issue: Session timeout after inactivity

**Cause**: Default 30-minute timeout

**Solution**:
1. Configure SESSION_TIMEOUT in .env
2. Implement keep-alive pings in client
3. Manual reconnect if needed

## Future Enhancements

### WebRTC Fallback
- Direct peer-to-peer console access
- Lower latency for LAN connections
- Automatic fallback if VNC fails

### SPICE Protocol
- Better Windows VM support
- Native USB redirection
- Video codec acceleration

### Clipboard Sync
- Bidirectional clipboard support
- Secure clipboard encryption
- Configurable access control

### USB/Device Redirection
- Local printer access
- USB device passthrough
- Smart card support

### Recording & Playback
- Session recording for audit
- Replay functionality
- Video export

## Testing

### Unit Tests
- VNC protocol parsing
- Compression algorithms
- Session management

### Integration Tests
- End-to-end console connection
- Input handling
- Bandwidth tracking

### Load Tests
- 100+ concurrent sessions
- Bandwidth limits
- Memory usage

### Security Tests
- Permission validation
- Token expiry
- Session hijacking prevention

## Configuration

**Environment Variables**:
```bash
CONSOLE_SESSION_TIMEOUT=30m        # Session timeout
CONSOLE_MAX_SESSIONS_PER_USER=5    # Limit per user
CONSOLE_BANDWIDTH_TARGET=10m       # Target bitrate
CONSOLE_COMPRESSION_LEVEL=6        # Default (1-9)
CONSOLE_VNC_TIMEOUT=30s            # Connection timeout
CONSOLE_CLEANUP_INTERVAL=5m        # Cleanup task interval
```

## Implementation Status

✅ **Phase 3 (Complete)**:
- VNC Protocol implementation (RFB 3.8)
- VNC Proxy with pooling
- Console sessions with lifecycle
- Frame compression (ZLIB/Deflate)
- WebSocket message handling
- Input event routing
- Bandwidth tracking
- Statistics collection
- Permission integration

📋 **Phase 4 (Planned)**:
- React console viewer component
- Canvas rendering
- Real-time statistics display
- Input device handling
- Responsive design
