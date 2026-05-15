#!/bin/bash
# setup-vps.sh — Preparar el VPS para el primer deploy y CI/CD
# Ejecutar UNA VEZ en el servidor: bash setup-vps.sh

set -e

REPO_URL="${1:-https://github.com/TUUSUARIO/qa-assist-mvp.git}"
DEPLOY_PATH="${2:-/home/ubuntu/qa-assist}"

echo "=== 1. Instalar Docker ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    echo "Docker instalado. Puede ser necesario hacer logout/login para que surta efecto."
else
    echo "Docker ya instalado."
fi

echo "=== 2. Clonar repositorio ==="
if [ ! -d "$DEPLOY_PATH" ]; then
    git clone "$REPO_URL" "$DEPLOY_PATH"
else
    echo "Directorio ya existe, haciendo pull..."
    cd "$DEPLOY_PATH" && git pull
fi

echo "=== 3. Crear .env de producción ==="
if [ ! -f "$DEPLOY_PATH/server/.env" ]; then
    cp "$DEPLOY_PATH/server/.env.example" "$DEPLOY_PATH/server/.env"
    echo ""
    echo "⚠️  IMPORTANTE: Editar el archivo de entorno antes de continuar:"
    echo "   nano $DEPLOY_PATH/server/.env"
    echo ""
    echo "   Variables requeridas:"
    echo "   - CORS_ORIGIN=https://tu-dominio.com"
    echo "   - JWT_SECRET=<aleatorio>"
    echo "   - JWT_REFRESH_SECRET=<aleatorio>"
    echo "   - ADMIN_EMAIL=tu@email.com"
    echo "   - SMTP_HOST, SMTP_USER, SMTP_PASS (para reset de contraseña)"
else
    echo ".env ya existe."
fi

echo "=== 4. Generar clave SSH para GitHub Actions ==="
SSH_KEY_PATH="$HOME/.ssh/github_actions_deploy"
if [ ! -f "$SSH_KEY_PATH" ]; then
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$SSH_KEY_PATH" -N ""
    echo ""
    echo "✅ Clave SSH generada."
    echo ""
    echo "=== CLAVE PÚBLICA (agregar a ~/.ssh/authorized_keys en este servidor) ==="
    cat "$SSH_KEY_PATH.pub"
    echo ""
    echo "Ejecutá: cat $SSH_KEY_PATH.pub >> ~/.ssh/authorized_keys"
    echo ""
    echo "=== CLAVE PRIVADA (copiar como secret VPS_SSH_KEY en GitHub) ==="
    echo "GitHub → repo → Settings → Secrets → Actions → New secret"
    echo "Nombre: VPS_SSH_KEY"
    cat "$SSH_KEY_PATH"
    echo ""
else
    echo "Clave SSH ya existe en $SSH_KEY_PATH"
fi

echo "=== 5. Secrets requeridos en GitHub Actions ==="
echo ""
echo "Ir a: https://github.com/TUUSUARIO/qa-assist-mvp/settings/secrets/actions"
echo ""
echo "Crear los siguientes secrets:"
echo "  VPS_HOST     → $(curl -s ifconfig.me)"
echo "  VPS_USER     → $USER"
echo "  VPS_SSH_KEY  → (contenido de $SSH_KEY_PATH)"
echo "  VPS_PATH     → $DEPLOY_PATH"
echo ""
echo "=== Setup completo ==="
echo "Próximos pasos:"
echo "1. Editar $DEPLOY_PATH/server/.env"
echo "2. Agregar la clave pública a authorized_keys"
echo "3. Agregar los secrets en GitHub"
echo "4. Hacer un push a main para triggear el primer deploy automático"
