#!/bin/bash
# run_local.sh
# Script para iniciar el Frontend (Vite) y Backend (Django) simultáneamente

echo "🚀 Iniciando Simulador Automotriz (Vite + Django)..."

# 1. Iniciar el Backend (Django) en el puerto 8000 en segundo plano
echo "🐍 Levantando Backend..."
cd pps_backend || exit
source ../venv/bin/activate
python manage.py runserver &
DJANGO_PID=$!
cd ..

# 2. Iniciar el Frontend (Vite) en el puerto 5173 en primer plano
echo "⚛️ Levantando Frontend..."
npm run dev &
VITE_PID=$!

# Atrapar la señal (Ctrl+C) para cerrar ambos procesos limpiamente
trap "echo 'Terminando procesos...'; kill $DJANGO_PID $VITE_PID; exit" SIGINT SIGTERM

# Esperar a que terminen los procesos
wait $DJANGO_PID $VITE_PID
