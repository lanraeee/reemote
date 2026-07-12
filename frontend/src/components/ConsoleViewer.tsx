import React, { useEffect, useRef, useState } from 'react';

interface ConsoleViewerProps {
  vmId: string;
  sessionId: string;
  vncHost: string;
  vncPort: number;
  vncPassword?: string;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function ConsoleViewer({ vmId, sessionId, vncHost, vncPort, vncPassword }: ConsoleViewerProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
  const [connState, setConnState] = useState<ConnectionState>('connecting');
  const [statusMsg, setStatusMsg] = useState('Initialising connection…');
  const [resolution, setResolution] = useState('');
  const [clipboardText, setClipboardText] = useState('');
  const [showClipboard, setShowClipboard] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!vncHost || !vncPort) {
      setConnState('error');
      setStatusMsg('No VNC host or port configured for this VM.');
      return;
    }

    let rfb: any;

    async function connect() {
      try {
        // Dynamic import so vite can tree-shake it properly
        const RFBModule = await import('@novnc/novnc');
        const RFB = RFBModule.default ?? (RFBModule as any);

        if (!screenRef.current) return;

        const url = `ws://${vncHost}:${vncPort}/websockify`;

        rfb = new RFB(screenRef.current, url, {
          credentials: vncPassword ? { password: vncPassword } : undefined,
        });

        rfb.scaleViewport = true;
        rfb.resizeSession = true;
        rfb.clipViewport = false;
        rfb.showDotCursor = true;

        rfb.addEventListener('connect', () => {
          setConnState('connected');
          setStatusMsg('Connected');
        });

        rfb.addEventListener('disconnect', (e: any) => {
          setConnState('disconnected');
          setStatusMsg(e.detail?.clean ? 'Session ended cleanly' : 'Connection lost — check the VM is running and VNC is accessible');
        });

        rfb.addEventListener('securityfailure', (e: any) => {
          setConnState('error');
          setStatusMsg(`Authentication failed: ${e.detail?.reason || 'wrong password'}`);
        });

        rfb.addEventListener('credentialsrequired', () => {
          setConnState('error');
          setStatusMsg('VNC password required — set it on the VM record');
        });

        rfb.addEventListener('desktopname', (e: any) => {
          // We can show the remote desktop name if needed
        });

        rfb.addEventListener('capabilities', () => {
          if (rfb._fbWidth && rfb._fbHeight) {
            setResolution(`${rfb._fbWidth}×${rfb._fbHeight}`);
          }
        });

        rfb.addEventListener('clipboard', (e: any) => {
          setClipboardText(e.detail?.text || '');
        });

        rfbRef.current = rfb;
      } catch (err: any) {
        setConnState('error');
        setStatusMsg(`Failed to load VNC client: ${err.message}`);
      }
    }

    connect();

    return () => {
      if (rfbRef.current) {
        try { rfbRef.current.disconnect(); } catch {}
        rfbRef.current = null;
      }
    };
  }, [vncHost, vncPort, vncPassword]);

  function sendClipboard() {
    if (rfbRef.current && clipboardText) {
      rfbRef.current.clipboardPasteFrom(clipboardText);
    }
  }

  function sendCtrlAltDel() {
    rfbRef.current?.sendCtrlAltDel();
  }

  function toggleFullscreen() {
    const el = screenRef.current?.closest('.console-wrapper') as HTMLElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }

  const stateColor = {
    connecting:   'text-amber-400',
    connected:    'text-emerald-400',
    disconnected: 'text-slate-400',
    error:        'text-red-400',
  }[connState];

  const stateDot = {
    connecting:   'bg-amber-400 animate-pulse',
    connected:    'bg-emerald-400 pulse-dot',
    disconnected: 'bg-slate-500',
    error:        'bg-red-500',
  }[connState];

  return (
    <div className="console-wrapper flex flex-col h-full bg-[#0a0a0a]">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111] border-b border-[#222] flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stateDot}`} />
          <span className={`text-xs font-medium ${stateColor}`}>{statusMsg}</span>
          {resolution && <span className="text-xs text-slate-600 ml-2">{resolution}</span>}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={sendCtrlAltDel}
            disabled={connState !== 'connected'}
            title="Send Ctrl+Alt+Del"
            className="px-3 py-1.5 text-xs font-mono bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-40 text-slate-300 rounded border border-[#333] transition-colors"
          >
            Ctrl+Alt+Del
          </button>
          <button
            onClick={() => setShowClipboard(s => !s)}
            disabled={connState !== 'connected'}
            title="Clipboard"
            className="px-3 py-1.5 text-xs bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-40 text-slate-300 rounded border border-[#333] transition-colors"
          >
            Clipboard
          </button>
          <button
            onClick={toggleFullscreen}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="px-3 py-1.5 text-xs bg-[#1e1e1e] hover:bg-[#2a2a2a] text-slate-300 rounded border border-[#333] transition-colors"
          >
            {fullscreen ? '⊡' : '⊞'}
          </button>
        </div>
      </div>

      {/* Clipboard panel */}
      {showClipboard && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] border-b border-[#222]">
          <input
            type="text"
            value={clipboardText}
            onChange={e => setClipboardText(e.target.value)}
            placeholder="Type text to paste into remote session…"
            className="flex-1 px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
          />
          <button
            onClick={sendClipboard}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            Paste to VM
          </button>
        </div>
      )}

      {/* VNC canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Overlay shown while not yet connected */}
        {connState !== 'connected' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#050505]">
            {connState === 'connecting' && (
              <>
                <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-4" />
                <p className="text-slate-300 text-sm font-medium">Connecting to {vncHost}:{vncPort}…</p>
                <p className="text-slate-600 text-xs mt-2">Make sure the VM is running and websockify is active on port {vncPort}</p>
              </>
            )}
            {(connState === 'disconnected' || connState === 'error') && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
                  </svg>
                </div>
                <p className="text-slate-200 text-sm font-medium mb-1">{connState === 'error' ? 'Connection failed' : 'Disconnected'}</p>
                <p className="text-slate-500 text-xs text-center max-w-xs px-4">{statusMsg}</p>

                <div className="mt-6 p-4 bg-[#111] rounded-xl border border-[#222] text-xs text-slate-500 max-w-sm">
                  <p className="text-slate-400 font-semibold mb-2">Requirements</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>VM must be powered on</li>
                    <li>VNC server running on the VM (e.g. tigervnc, qemu-kvm)</li>
                    <li>websockify running: <code className="text-blue-400">websockify {vncPort} localhost:5900</code></li>
                    <li>Port {vncPort} reachable from browser</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* noVNC mounts here */}
        <div
          ref={screenRef}
          className="w-full h-full"
          style={{ cursor: connState === 'connected' ? 'none' : 'default' }}
        />
      </div>
    </div>
  );
}
