FROM debian:12
ENV DEBIAN_FRONTEND=noninteractive
ENV OS_DEFAULT_USER=debian

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      openssh-server \
      iproute2 \
      iptables \
      sudo \
      curl \
      wget \
      net-tools \
      procps \
      ca-certificates \
      bash && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/run/sshd && \
    id -u debian >/dev/null 2>&1 || useradd -m -s /bin/bash debian && \
    passwd -d debian && \
    echo 'debian ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    mkdir -p /home/debian/.ssh /root/.ssh && \
    chmod 700 /home/debian/.ssh /root/.ssh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22
CMD ["/entrypoint.sh"]
