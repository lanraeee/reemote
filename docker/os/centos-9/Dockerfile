FROM almalinux:9

ENV VNC_PASSWORD=reemote \
    VNC_RESOLUTION=1280x720 \
    VNC_DEPTH=24 \
    DISPLAY=:1

RUN dnf -y groupinstall "Xfce" && \
    dnf -y install \
    tigervnc-server \
    python3 python3-pip \
    xdpyinfo dbus-x11 \
    curl wget nano vim sudo \
    && dnf clean all

RUN pip3 install websockify

RUN useradd -m -s /bin/bash reemote && \
    echo "reemote:reemote" | chpasswd && \
    echo "reemote ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/reemote && \
    chmod 440 /etc/sudoers.d/reemote

RUN mkdir -p /home/reemote/.vnc && chown -R reemote:reemote /home/reemote

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 6080

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
  CMD bash -c 'echo > /dev/tcp/localhost/6080' 2>/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
