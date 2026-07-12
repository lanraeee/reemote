FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    VNC_PASSWORD=reemote \
    VNC_RESOLUTION=1280x720 \
    VNC_DEPTH=24 \
    DISPLAY=:1

RUN apt-get update && apt-get install -y --no-install-recommends \
    xfce4 xfce4-terminal \
    tigervnc-standalone-server tigervnc-tools \
    python3 python3-websockify \
    dbus-x11 x11-utils \
    curl wget nano vim sudo \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash reemote && \
    echo "reemote:reemote" | chpasswd && \
    echo "reemote ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/reemote && \
    chmod 440 /etc/sudoers.d/reemote

RUN mkdir -p /home/reemote/.vnc && chown -R reemote:reemote /home/reemote

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 6080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD bash -c 'echo > /dev/tcp/localhost/6080' 2>/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
