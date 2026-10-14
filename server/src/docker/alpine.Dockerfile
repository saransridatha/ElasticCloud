FROM alpine:3.20
ENV OS_DEFAULT_USER=alpine

RUN apk update && \
    apk add --no-cache \
      openssh \
      iproute2 \
      iptables \
      sudo \
      curl \
      wget \
      bash \
      procps \
      shadow

RUN mkdir -p /var/run/sshd && \
    id -u alpine >/dev/null 2>&1 || useradd -m -s /bin/bash alpine && \
    passwd -d alpine && \
    echo 'alpine ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    mkdir -p /home/alpine/.ssh /root/.ssh && \
    chmod 700 /home/alpine/.ssh /root/.ssh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22
CMD ["/entrypoint.sh"]
