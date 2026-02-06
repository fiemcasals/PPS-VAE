#!/bin/bash
# Script para descargar el modelo COCO-SSD localmente

mkdir -p public/models/lite_mobilenet_v2
cd public/models/lite_mobilenet_v2

BASE_URL="https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2"

echo "Descargando model.json..."
wget -q "$BASE_URL/model.json" -O model.json

if [ -f model.json ]; then
    echo "model.json descargado."
    # Leer el JSON para encontrar los archivos binarios (shards)
    # Usamos grep/sed básico para extraer nombres de archivos .bin
    grep -o '"[^"]*\.bin"' model.json | tr -d '"' | sort | uniq | while read -r bin_file; do
        echo "Descargando $bin_file..."
        wget -q "$BASE_URL/$bin_file" -O "$bin_file"
    done
    echo "¡Descarga completa!"
else
    echo "Error: No se pudo descargar model.json. Verifica tu conexión."
fi
