#!/usr/bin/env bash

set -euo pipefail

if command -v docker >/dev/null 2>&1; then
  echo "Docker is already installed."
  docker --version
  exit 0
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to install Docker." >&2
  exit 1
fi

install_with_apt() {
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_with_dnf() {
  sudo dnf -y install dnf-plugins-core
  sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_with_yum() {
  sudo yum install -y yum-utils
  sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

if command -v apt-get >/dev/null 2>&1; then
  install_with_apt
elif command -v dnf >/dev/null 2>&1; then
  install_with_dnf
elif command -v yum >/dev/null 2>&1; then
  install_with_yum
else
  echo "Unsupported Linux distribution for automatic Docker installation." >&2
  exit 1
fi

sudo systemctl enable --now docker

if id -nG "$USER" | grep -qw docker; then
  :
else
  sudo usermod -aG docker "$USER" || true
fi

echo "Docker installation completed."
echo "Run 'newgrp docker' or log out and back in before using docker without sudo."
docker --version
