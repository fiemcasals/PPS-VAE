# PPS-VAE: Autonomous Vehicle Simulator

Un simulador de vehículos autónomos construido con React, Three.js y Cannon.js.

## 🚀 Cómo Iniciar

### Prerrequisitos
Asegúrate de tener instalado [Node.js](https://nodejs.org/).

### Instalación Rápida (Recomendado)
Para configurar el entorno completo (instalar Node.js, Python, crear el entorno virtual y configurar Nginx localmente) ejecuta:
```bash
./setup_env.sh
```

### Ejecutar en Desarrollo
Para iniciar tanto el servidor backend (Django) como el frontend (Vite) simultáneamente:
```bash
./run_local.sh
```
Luego abre tu navegador en la URL asignada a tu servidor local (usualmente `http://comandovae.misitiowebpersonal.com.ar/` si usaste `setup_env.sh`, o `http://localhost:5173/dashboard/`).

## 🛠 Instalación y Ejecución Manual

Si prefieres no usar los scripts automatizados:
1.  **Frontend:** `npm install` y luego `npm run dev`
2.  **Backend:** `python3 -m venv venv`, `source venv/bin/activate`, `pip install -r pps_backend/requirements.txt` y luego `python pps_backend/manage.py runserver`

## 📖 Documentación
Para entender la estructura del proyecto y las reglas de desarrollo, consulta [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).
