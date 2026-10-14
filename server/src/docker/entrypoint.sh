#!/bin/sh
set -e

OS_USER="${OS_DEFAULT_USER:-ubuntu}"

# Unlock user accounts in /etc/shadow so OpenSSH allows public-key authentication
passwd -d "$OS_USER" 2>/dev/null || true
passwd -d root 2>/dev/null || true

# Ensure SSH host keys exist
if [ ! -f /etc/ssh/ssh_host_rsa_key ] && [ ! -f /etc/ssh/ssh_host_ed25519_key ]; then
  ssh-keygen -A 2>/dev/null || true
fi

# Discover home directory reliably (avoid shell-dependent tilde expansion)
USER_HOME=$(getent passwd "$OS_USER" 2>/dev/null | cut -d: -f6)
if [ -z "$USER_HOME" ]; then
  USER_HOME="/home/$OS_USER"
fi

# Set up .ssh directories
mkdir -p "$USER_HOME/.ssh" /root/.ssh

# Inject SSH public key if provided in environment
if [ -n "$SSH_PUBLIC_KEY" ]; then
  echo "$SSH_PUBLIC_KEY" > "$USER_HOME/.ssh/authorized_keys"
  echo "$SSH_PUBLIC_KEY" > /root/.ssh/authorized_keys
  echo "[ElasticCloud Cloud-Init] SSH authorized_keys installed for $OS_USER and root"
fi

# Ensure correct SSH directory and key permissions
chmod 700 "$USER_HOME" "$USER_HOME/.ssh" /root /root/.ssh
if [ -f "$USER_HOME/.ssh/authorized_keys" ]; then
  chmod 600 "$USER_HOME/.ssh/authorized_keys"
fi
if [ -f /root/.ssh/authorized_keys ]; then
  chmod 600 /root/.ssh/authorized_keys
fi
chown -R "$OS_USER:$OS_USER" "$USER_HOME"

# Ensure sshd privilege separation directory exists
mkdir -p /var/run/sshd

# Configure sshd drop-in override
mkdir -p /etc/ssh/sshd_config.d
cat << 'EOF' > /etc/ssh/sshd_config.d/99-elastic.conf
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
PermitEmptyPasswords no
StrictModes no
PermitRootLogin prohibit-password
EOF

echo "[ElasticCloud Cloud-Init] Initialized micro-VM instance"
echo "[ElasticCloud Cloud-Init] User: $OS_USER (Home: $USER_HOME)"
echo "[ElasticCloud Cloud-Init] Starting OpenSSH Server on port 22..."

# Start sshd with explicit command-line override flags
SSHD_ARGS="-D -e -o PubkeyAuthentication=yes -o PasswordAuthentication=no -o PermitEmptyPasswords=no -o StrictModes=no -o AuthorizedKeysFile=.ssh/authorized_keys"

if [ -x /usr/sbin/sshd ]; then
  exec /usr/sbin/sshd $SSHD_ARGS
elif [ -x /usr/bin/sshd ]; then
  exec /usr/bin/sshd $SSHD_ARGS
else
  echo "[ElasticCloud Cloud-Init] sshd executable not found, entering shell fallback"
  exec /bin/sh
fi
