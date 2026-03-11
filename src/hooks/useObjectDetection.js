import { useState, useEffect, useRef } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

export function useObjectDetection(sourceRef, isActive = true, threshold = 0.5) {
    const [model, setModel] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const detectionLoopRef = useRef(null);

    // Cargar modelo al inicio
    useEffect(() => {
        async function loadModel() {
            try {
                // console.log("Cargando modelo COCO-SSD (Local)...");
                // MAURI: Cargamos desde la carpeta local public/models
                // Esto requiere que hayas ejecutado "download_model.sh" previamente.
                const loadedModel = await cocoSsd.load({
                    base: "lite_mobilenet_v2",
                    modelUrl: `${import.meta.env.BASE_URL}models/lite_mobilenet_v2/model.json`
                });
                setModel(loadedModel);
                setIsLoading(false);
                // console.log("Modelo cargado.");
            } catch (err) {
                console.warn("[ObjectDetection] No se pudo cargar el modelo (¿Sin Internet?). Modo Offline activado.");
                // console.error("Error cargando modelo:", err); // Suppress stack trace
                setIsLoading(false);
            }
        }
        loadModel();
    }, []);

    // Loop de detección
    useEffect(() => {
        if (!model || !isActive || !sourceRef.current) return;

        const detect = async () => {
            // Verificamos si la fuente está lista
            let isReady = false;
            if (sourceRef.current instanceof HTMLVideoElement) {
                isReady = sourceRef.current.readyState === 4;
            } else if (sourceRef.current instanceof HTMLCanvasElement) {
                isReady = sourceRef.current.width > 0 && sourceRef.current.height > 0;
            } else {
                // Imagen u otro
                isReady = !!sourceRef.current;
            }

            if (isReady) {
                try {
                    // Ajustamos threshold dinámicamente
                    const preds = await model.detect(sourceRef.current, 20, threshold);

                    // FILTRO: Solo detectamos personas (Activo)
                    const personPreds = preds.filter(p => p.class === "person");
                    setPredictions(personPreds);

                    // TODO: Descomentar para detectar todo
                    // setPredictions(preds);
                } catch (e) {
                    console.warn("Error en deteccion:", e);
                }
            }
            detectionLoopRef.current = requestAnimationFrame(detect);
        };

        detect();

        return () => {
            if (detectionLoopRef.current) {
                cancelAnimationFrame(detectionLoopRef.current);
            }
        };
    }, [model, isActive, sourceRef, threshold]);

    return { predictions, isLoading };
}
