# Deploy - tela-elevador

Este documento descreve o deploy via Docker no servidor e as configuracoes de nginx/TLS.

## Resumo do ambiente

- Servidor: 130.250.189.175
- App container: tela-elevador
- Porta publica: 3080 (mapeada para 80 no container)
- Reverse proxy nginx no host
- Dominio: gramado.ewertondev.com.br (com www)
- Certificado: Let's Encrypt

## Deploy rapido (via SCP + Docker build no servidor)

No seu computador (Windows):

1. Criar pacote da aplicacao (sem node_modules/dist):

```
cd "c:\Users\Ewerton\Desktop\Projetos Dev\tela-elevador"
tar -czf tela-elevador.tar.gz --exclude=node_modules --exclude=dist --exclude=.git --exclude=.github --exclude=.vscode --exclude=*.log .
```

2. Enviar para o servidor:

```
scp "c:\Users\Ewerton\Desktop\Projetos Dev\tela-elevador\tela-elevador.tar.gz" root@130.250.189.175:/opt/tela-elevador.tar.gz
```

No servidor:

3. Descompactar, buildar e trocar o container:

```
rm -rf /opt/tela-elevador
mkdir -p /opt/tela-elevador
tar -xzf /opt/tela-elevador.tar.gz -C /opt/tela-elevador
cd /opt/tela-elevador

docker build -t tela-elevador:latest .

docker stop tela-elevador

docker rm tela-elevador

docker run -d --name tela-elevador --restart unless-stopped -p 3080:80 tela-elevador:latest
```

4. Verificar:

```
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | grep tela-elevador
curl -I http://127.0.0.1:3080
```

## Nginx no host (proxy do dominio para a porta 3080)

Arquivo atual:

- /etc/nginx/sites-available/gramado.ewertondev.com.br
- Link em /etc/nginx/sites-enabled/gramado.ewertondev.com.br

Conteudo atual:

```
server {
    listen 80;
    server_name gramado.ewertondev.com.br www.gramado.ewertondev.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name gramado.ewertondev.com.br www.gramado.ewertondev.com.br;

    ssl_certificate /etc/letsencrypt/live/gramado.ewertondev.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gramado.ewertondev.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Recarregar nginx:

```
nginx -t
systemctl reload nginx
```

## Certificado (Let's Encrypt)

Verificar certificados instalados:

```
certbot certificates
```

Renovacao manual:

```
certbot renew --dry-run
```

## Rollback rapido

Se precisar voltar para a imagem anterior:

```
docker images | grep tela-elevador

docker stop tela-elevador

docker rm tela-elevador

docker run -d --name tela-elevador --restart unless-stopped -p 3080:80 tela-elevador:<TAG_ANTERIOR>
```
