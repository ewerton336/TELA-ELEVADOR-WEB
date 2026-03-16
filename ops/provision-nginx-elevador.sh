#!/bin/bash
set -euo pipefail

DOMAIN="${DOMAIN:-elevador.ewertondev.com.br}"
WWW_DOMAIN="www.${DOMAIN}"
APP_PORT="${APP_PORT:-3080}"
SITE_FILE="/etc/nginx/sites-available/${DOMAIN}"
ENABLED_LINK="/etc/nginx/sites-enabled/${DOMAIN}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx nao encontrado"
  exit 1
fi

cat > "$SITE_FILE" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sfn "$SITE_FILE" "$ENABLED_LINK"
nginx -t
systemctl reload nginx

echo "vhost http criado para ${DOMAIN} -> 127.0.0.1:${APP_PORT}"

if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  echo "certificado ja existe para ${DOMAIN}"
  exit 0
fi

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "CERTBOT_EMAIL nao definido. configure DNS e execute:"
  echo "certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN} --agree-tos -m <email> --non-interactive"
  exit 0
fi

certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --agree-tos -m "$CERTBOT_EMAIL" --non-interactive
nginx -t
systemctl reload nginx

echo "certificado emitido para ${DOMAIN}"
