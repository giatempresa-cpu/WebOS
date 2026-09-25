#!/bin/bash

echo "=========================================="
echo "    Instalador WebOS - GIAT Cloud         "
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "Execute como root (sudo bash install.sh)"
  exit 1
fi

echo "[1/4] Instalando dependências essenciais..."
apt-get update -qq
apt-get install -y python3 curl wget nginx git -qq

REPO_URL="https://raw.githubusercontent.com/giatempresa-cpu/WebOS/main"

echo "[2/4] Configurando o Nginx (Proxy Reverso na porta 8080)..."
mkdir -p /var/www/html
wget -qO /var/www/html/index.html "$REPO_URL/index.html"
wget -qO /var/www/html/style.css "$REPO_URL/style.css"
wget -qO /var/www/html/app.js "$REPO_URL/app.js"
chmod -R 755 /var/www/html/

cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;

    root /var/www/html;
    index index.html index.htm;
    server_name _;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8085/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
systemctl restart nginx

echo "[3/4] Instalando o VS Code Server (Porta 8443)..."
if ! command -v code-server &> /dev/null; then
    curl -fsSL https://code-server.dev/install.sh | sh
    systemctl enable --now code-server@$SUDO_USER
fi

echo "[4/4] Configurando a API do Backend..."
wget -qO /usr/local/bin/webos_api.py "$REPO_URL/webos_api.py"
chmod +x /usr/local/bin/webos_api.py

cat << 'EOF' > /etc/systemd/system/webos-api.service
[Unit]
Description=WebOS Native API
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /usr/local/bin/webos_api.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable webos-api.service --now >/dev/null 2>&1
systemctl restart webos-api.service

mkdir -p /media/videos

echo ""
echo "=========================================="
echo "    Instalação Concluída com Sucesso!     "
echo "=========================================="
EXT_IP=$(curl -s ifconfig.me)
echo "Acesse o WebOS em: http://$EXT_IP:8080"
echo "Acesse o VS Code em: http://$EXT_IP:8443"
