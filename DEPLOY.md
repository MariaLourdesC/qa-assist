# Deploy — QA Assist MVP

## Requisitos del servidor

- Ubuntu 22.04 / Debian 12
- 1 CPU, 1 GB RAM mínimo (recomendado: 2 GB)
- Docker + Docker Compose instalados
- Dominio apuntando al servidor (para HTTPS)

Costo estimado: **$6/mes** (DigitalOcean Basic Droplet o Hetzner CX11)

---

## Paso 1 — Preparar el servidor

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker --version && docker compose version
```

---

## Paso 2 — Subir el código

```bash
# En tu máquina local — crear el paquete
git archive --format=tar.gz HEAD > qa-assist.tar.gz
scp qa-assist.tar.gz usuario@IP_DEL_SERVIDOR:~/

# En el servidor
mkdir ~/qa-assist && cd ~/qa-assist
tar -xzf ~/qa-assist.tar.gz
```

O clonar directamente si el repo es privado:
```bash
git clone https://github.com/tuusuario/qa-assist-mvp.git ~/qa-assist
cd ~/qa-assist
```

---

## Paso 3 — Configurar variables de entorno

```bash
cd ~/qa-assist/server
cp .env.example .env
nano .env   # o vim .env
```

**Mínimo requerido para producción:**
```env
NODE_ENV=production
PORT=3001

# CORS — tu dominio sin trailing slash
CORS_ORIGIN=https://qa.miempresa.com

# Auth — generá valores únicos:
# node -e "require('crypto').randomBytes(32).toString('hex')"
JWT_SECRET=<genera-uno>
JWT_REFRESH_SECRET=<genera-otro>

# Admin
ADMIN_EMAIL=tu@email.com

# Email (para que funcione el reset de contraseña)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx    # App Password de Google
SMTP_FROM="QA Assist <no-reply@miempresa.com>"
APP_URL=https://qa.miempresa.com

# AI (opcional)
ANTHROPIC_API_KEY=sk-ant-...
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords

---

## Paso 4 — Primer deploy

```bash
cd ~/qa-assist
docker compose build
docker compose up -d

# Ver logs
docker compose logs -f
```

La app queda disponible en **http://IP_DEL_SERVIDOR**

---

## Paso 5 — HTTPS con Certbot (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Instalar nginx en el host como proxy HTTPS
sudo apt install nginx -y

# Crear config de nginx para tu dominio
sudo nano /etc/nginx/sites-available/qa-assist
```

Contenido del archivo:
```nginx
server {
    listen 80;
    server_name qa.miempresa.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name qa.miempresa.com;

    ssl_certificate     /etc/letsencrypt/live/qa.miempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qa.miempresa.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/qa-assist /etc/nginx/sites-enabled/
sudo certbot --nginx -d qa.miempresa.com
sudo systemctl reload nginx
```

La app queda disponible en **https://qa.miempresa.com** ✓

---

## Comandos útiles post-deploy

```bash
# Ver estado
docker compose ps

# Ver logs del backend
docker compose logs backend -f

# Reiniciar después de actualizar código
docker compose down
docker compose build
docker compose up -d

# Backup manual de la DB
docker compose exec backend sh -c "cp data/qa-assist.db /app/backups/manual-$(date +%Y%m%d).db"

# Copiar backup al host
docker cp qa-assist-backend:/app/backups ./backups-host

# Entrar al contenedor
docker compose exec backend sh
```

---

## Actualizar la app

```bash
cd ~/qa-assist
git pull
docker compose build
docker compose up -d
```

La base de datos persiste en el volumen Docker `qa_data` — no se pierde al reconstruir.

---

## Monitoreo básico

```bash
# CPU y RAM del contenedor
docker stats --no-stream

# Logs de errores
docker compose logs backend --since 1h | grep -i error
```

Para monitoreo avanzado: UptimeRobot (free tier) apunta a `https://qa.miempresa.com/api/health`
y te avisa por email si cae.
