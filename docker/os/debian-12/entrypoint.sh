#!/bin/bash
set -e

VNC_PASS="${VNC_PASSWORD:-reemote}"
VNC_RES="${VNC_RESOLUTION:-1280x720}"
VNC_DEPTH="${VNC_DEPTH:-24}"

mkdir -p /home/reemote/.vnc
echo "$VNC_PASS" | vncpasswd -f > /home/reemote/.vnc/passwd
chmod 600 /home/reemote/.vnc/passwd
chown reemote:reemote /home/reemote/.vnc/passwd

cat > /home/reemote/.vnc/xstartup <<'EOF'
#!/bin/sh
export DISPLAY=:1
export XKL_XMODMAP_DISABLE=1
startxfce4 &
EOF
chmod +x /home/reemote/.vnc/xstartup
chown reemote:reemote /home/reemote/.vnc/xstartup

rm -f /tmp/.X1-lock /tmp/.X11-unix/X1 2>/dev/null || true

su - reemote -c "vncserver :1 -geometry $VNC_RES -depth $VNC_DEPTH -fg &"

for i in $(seq 1 15); do
  if su - reemote -c "DISPLAY=:1 xdpyinfo" > /dev/null 2>&1; then break; fi
  sleep 1
done

echo "VNC ready — starting websockify on :6080"
exec websockify 0.0.0.0:6080 localhost:5901
