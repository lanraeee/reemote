FROM alpine:3.19

ENV VNC_PASSWORD=reemote \
    VNC_RESOLUTION=1280x720 \
    VNC_DEPTH=24

RUN apk add --no-cache \
    xfce4 xfce4-terminal \
    tigervnc \
    py3-websockify \
    dbus dbus-x11 \
    bash curl wget nano vim sudo shadow xdpyinfo \
    font-dejavu

RUN addgroup -S reemote && \
    adduser -S -G reemote -s /bin/bash reemote && \
    echo "reemote:reemote" | chpasswd && \
    echo "reemote ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

RUN mkdir -p /home/reemote/.vnc && chown -R reemote:reemote /home/reemote

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 6080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD bash -c 'echo > /dev/tcp/localhost/6080' 2>/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
