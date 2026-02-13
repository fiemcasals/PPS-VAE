import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { useObjectDetection } from "../../hooks/useObjectDetection";

export function DetectionsHUD() {
    const cameraMode = useStore((state) => state.cameraMode);
    const isDetectionEnabled = useStore((state) => state.isDetectionEnabled); // MAURI: Global Toggle
    const detectionThresholds = useStore((state) => state.detectionThresholds);
    const canvasRef = useRef(null);
    const [sourceElement, setSourceElement] = useState(null);

    // Buscar el canvas de Three.js al montar
    useEffect(() => {
        const findCanvas = () => {
            const canvas = document.querySelector("canvas");
            if (canvas) {
                setSourceElement({ current: canvas }); // Mock ref structure
            } else {
                // Retry if not found immediately
                setTimeout(findCanvas, 500);
            }
        };
        findCanvas();
    }, []);

    // MAURI: Active ONLY if enabled AND NOT in Driver mode (Front Camera disabled per request)
    const isActive = isDetectionEnabled && cameraMode !== "DRIVER" && !!sourceElement;
    const { predictions, isLoading } = useObjectDetection(sourceElement, isActive, detectionThresholds.frontal);

    // Dibujar
    useEffect(() => {
        if (!canvasRef.current || !sourceElement) return;
        const ctx = canvasRef.current.getContext("2d");
        const source = sourceElement.current;

        // Match size
        if (canvasRef.current.width !== source.width || canvasRef.current.height !== source.height) {
            canvasRef.current.width = source.width;
            canvasRef.current.height = source.height;
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!isActive) return;

        ctx.strokeStyle = "#00FFFF"; // Cyan para simulacion
        ctx.lineWidth = 3;
        ctx.font = "20px monospace";
        ctx.fillStyle = "#00FFFF";

        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;

            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.stroke();

            // MAURI: Distance Estimation for People
            let distanceInfo = "";
            if (prediction.class === "person") {
                // Heurística de Distancia Monocular
                // D = (RealHeight * FocalLength) / ImageHeight
                // Asumimos altura persona ~1.7m y Factor Focal ~1000 (ajustable)
                const estimatedDist = (1.7 * 1000) / height;
                distanceInfo = ` - ${estimatedDist.toFixed(1)}m`;
            }

            const text = `${prediction.class} ${(prediction.score * 100).toFixed(0)}%${distanceInfo}`;
            ctx.fillText(text, x, y > 20 ? y - 10 : y + 20);
        });

    }, [predictions, isActive, sourceElement]);

    if (!isActive) return null;

    return (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 20 }}>
            {/* Título */}
            <div style={{
                position: "absolute",
                top: "100px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "cyan",
                background: "rgba(0,0,0,0.5)",
                padding: "5px",
                borderRadius: "4px"
            }}>
                VISTA FRONTAL - DETECCION ACTIVADA
                <br />
                <span style={{ fontSize: "0.8em", color: isLoading ? "yellow" : "lime" }}>
                    {isLoading ? "(CARGANDO IA...)" : `(DETECTANDO: ${predictions.length})`}
                </span>
            </div>

            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
}
