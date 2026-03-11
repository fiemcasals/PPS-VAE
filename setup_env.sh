#!/bin/bash
# setup_env.sh
# Script para configurar el entorno de desarrollo en una nueva computadora (Linux/Ubuntu)

echo "🚀 Iniciando configuración del entorno local para PPS-VAE..."

# 1. Dependencias de Node.js
echo "📦 Instalando dependencias de Node.js (Frontend)..."
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado. Instala Node.js e intenta de nuevo."
    exit 1
fi
npm install

# 2. Entorno virtual y dependencias de Python
echo "🐍 Configurando entorno de Python (Backend)..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 no está instalado. Instalalo e intenta de nuevo."
    exit 1
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Entorno virtual (venv) creado."
fi

source venv/bin/activate
pip install -r pps_backend/requirements.txt
echo "✅ Dependencias de Python instaladas."

# 3. Configurar Nginx y Dominio Local
echo "🌐 Configurando Nginx y Dominio Local..."
echo "⚠️  Nota: Se pedirán permisos de administrador (sudo) para editar /etc/hosts y Nginx."

# Obtener ruta absoluta del proyecto
PROJECT_DIR=$(pwd)

# Crear archivo de configuración de Nginx para entorno local sin SSL (para evitar problemas con certs faltantes)
cat > pps_backend/comandovae.local.nginx.conf <<EOF
server {
    listen 80;
    server_name comandovae.misitiowebpersonal.com.ar comandovae;

    # Frontend (React/Vite) - todo lo que empieza con /dashboard/
    location /dashboard/ {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Vite dev server internal routes
    location /@vite/ { proxy_pass http://127.0.0.1:5173; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host \$host; }
    location /@react-refresh { proxy_pass http://127.0.0.1:5173; proxy_http_version 1.1; proxy_set_header Host \$host; }
    location /@fs/ { proxy_pass http://127.0.0.1:5173; proxy_http_version 1.1; proxy_set_header Host \$host; }
    location /node_modules/ { proxy_pass http://127.0.0.1:5173; proxy_http_version 1.1; proxy_set_header Host \$host; }
    location /models/ { proxy_pass http://127.0.0.1:5173; proxy_http_version 1.1; proxy_set_header Host \$host; }

    # Static files for Django
    location /static/ {
        alias $PROJECT_DIR/pps_backend/static/;
    }

    # Backend/Login/API (catch-all)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Copiar configuracion a nginx
sudo cp pps_backend/comandovae.local.nginx.conf /etc/nginx/sites-available/comandovae
sudo ln -sf /etc/nginx/sites-available/comandovae /etc/nginx/sites-enabled/comandovae

# Agregar al hosts si no existe
if ! grep -q "comandovae.misitiowebpersonal.com.ar" /etc/hosts; then
    echo "127.0.0.1 comandovae comandovae.misitiowebpersonal.com.ar" | sudo tee -a /etc/hosts
fi

# Reiniciar Nginx
sudo systemctl restart nginx
echo "✅ Nginx configurado y reiniciado."

echo "🎉 ¡Entorno configurado con éxito!"
echo "👉 Para iniciar los servidores, usa: ./run_local.sh"
echo "👉 Luego ingresa desde tu navegador a: http://comandovae.misitiowebpersonal.com.ar/"
