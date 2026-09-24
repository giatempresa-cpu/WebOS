#!/bin/bash

echo "=========================================="
echo "    Instalador Automático - WebOS Server  "
echo "    Powered by GIAT                       "
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute este script como root (sudo bash install.sh)"
  exit
fi

echo "[1/4] Instalando dependências do sistema..."
apt-get update -qq
apt-get install -y python3 glances curl wget -qq

# URL base do seu repositório no GitHub
REPO_URL="https://raw.githubusercontent.com/giatempresa-cpu/WebOS/main"

echo "[2/4] Baixando arquivos da interface web do GitHub..."
mkdir -p /var/www/html
wget -qO /var/www/html/index.html "$REPO_URL/index.html"
wget -qO /var/www/html/style.css "$REPO_URL/style.css"
wget -qO /var/www/html/app.js "$REPO_URL/app.js"
chmod -R 755 /var/www/html/

echo "[3/4] Baixando e configurando a API Python no backend..."
wget -qO /usr/local/bin/webos_api.py "$REPO_URL/webos_api.py"
chmod +x /usr/local/bin/webos_api.py

cat << 'EOF' > /etc/systemd/system/webos-api.service
[Unit]
Description=WebOS Native Actions API
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /usr/local/bin/webos_api.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] Iniciando serviços..."
systemctl daemon-reload
systemctl enable webos-api.service --now >/dev/null 2>&1
systemctl restart webos-api.service

# Cria o diretório padrão se não existir
mkdir -p /media/videos

echo ""
echo "=========================================="
echo "    Instalação Concluída com Sucesso!     "
echo "=========================================="
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "Acesse no seu navegador: http://$LOCAL_IP"
