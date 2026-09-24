cat << 'EOF_INSTALL' > install.sh
#!/bin/bash

echo "=========================================="
echo "    Instalador Automático - WebOS Server  "
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute este script como root (sudo ./install.sh)"
  exit
fi

echo "[1/4] Instalando dependências do sistema..."
apt-get update -qq
apt-get install -y python3 minidlna transmission-daemon glances curl -qq

echo "[2/4] Copiando arquivos da interface web..."
mkdir -p /var/www/html
cp index.html /var/www/html/
cp style.css /var/www/html/
cp app.js /var/www/html/
chmod -R 755 /var/www/html/

echo "[3/4] Configurando a API Python no backend..."
cp webos_api.py /usr/local/bin/
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

# Extra: Cria o diretório de videos se não existir
mkdir -p /media/videos

echo ""
echo "=========================================="
echo "    Instalação Concluída com Sucesso!     "
echo "=========================================="
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "Acesse no seu navegador: http://$LOCAL_IP"
EOF_INSTALL
chmod +x install.sh
