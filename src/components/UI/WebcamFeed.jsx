import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { useObjectDetection } from "../../hooks/useObjectDetection";

export function WebcamFeed() {
    const cameraMode = useStore((state) => state.cameraMode);
    const detectionThresholds = useStore((state) => state.detectionThresholds);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState(null);

    // Activamos detección solo si estamos en modo Bifocal
    const { predictions, isLoading } = useObjectDetection(videoRef, cameraMode === "BIFOCAL", detectionThresholds.bifocal);

    useEffect(() => {
        let stream = null;

        if (cameraMode === "BIFOCAL") {
            const getWebcam = async () => {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            // Prefer rear-facing camera or high resolution if possible
                            // facingMode: "environment", 
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        },
                        audio: false,
                    });

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                    }
                    setError(null);
                } catch (err) {
                    console.error("Error accessing webcam:", err);
                    setError("No se pudo acceder a la cámara. Asegúrate de dar permisos y conectar el dispositivo.");
                }
            };

            getWebcam();
        } else {
            // Stop stream if not in BIFOCAL mode
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }

        return () => {
            // Cleanup on unmount or mode change
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [cameraMode]);

    // Dibujar Cajas
    // MAURI: Logic for Stereo Vision (Bifocal)
    // Procesamos las predicciones para encontrar PARES (Ojo Izquierdo - Ojo Derecho)
    // y calcular distancia real usando disparidad.
    const pairedPredictions = [];
    const video = videoRef.current; // Get video element here for use in the next block
    if (cameraMode === "BIFOCAL" && video) {
        const width = video.videoWidth;
        const halfWidth = width / 2;

        // Separar detecciones
        const leftDetections = predictions.filter(p => (p.bbox[0] + p.bbox[2] / 2) < halfWidth);
        const rightDetections = predictions.filter(p => (p.bbox[0] + p.bbox[2] / 2) >= halfWidth);

        leftDetections.forEach(left => {
            // Buscar pareja en la derecha
            // Criterio: Misma Clase, Y similar (+- 50px), Altura similar (+- 20%)
            const match = rightDetections.find(right => {
                if (right.class !== left.class) return false;
                const dy = Math.abs(left.bbox[1] - right.bbox[1]);
                const dh = Math.abs(left.bbox[3] - right.bbox[3]);
                return dy < 50 && dh < (left.bbox[3] * 0.2);
            });

            let stereoDist = null;
            if (match) {
                // Calcular Disparidad
                // d = x_left - (x_right_adjusted)
                // Ojo: En SBS, el objeto en la derecha está desplazado a la izquierda relativo a su centro.
                // Disparidad = (CentroIzquierdo) - (CentroDerecho - AnchoMitad)
                // Cuanto más cerca, MAYOR disparidad (más separados visualmente).
                const cxL = left.bbox[0] + left.bbox[2] / 2;
                const cxR = match.bbox[0] + match.bbox[2] / 2;

                // Ajustar coordenada derecha al espacio local de la imagen derecha
                const cxR_local = cxR - halfWidth;

                const disparity = Math.abs(cxL - cxR_local);

                // Fórmula: Z = (f * B) / d
                // B (Baseline) = 0.12m (Dato Usuario)
                // f (FocalPixels) ~ 1000 (Estimación para webcam HD estándar FOV ~60°)
                // Ajuste fino: Si el usuario dice 12cm y ve distancias raras, ajustamos f.
                if (disparity > 0) {
                    stereoDist = (1000 * 0.12) / disparity;
                }
            }

            // Guardamos la predicción izquierda enriquecida
            pairedPredictions.push({ ...left, stereoDist });
        });
    } else {
        // Modo Mono o Driver: Pasamos todo sin procesar estéreo
        predictions.forEach(p => pairedPredictions.push(p));
    }

    useEffect(() => {
        if (!canvasRef.current || !videoRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        const video = videoRef.current;

        // Ajustar tamaño canvas al video
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Estilo de caja
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2; // MAURI: Thinner box
        ctx.font = "12px monospace"; // MAURI: Half size (24 -> 12)
        ctx.fillStyle = "#00FF00";

        // Usar las predicciones procesadas
        const listToRender = (cameraMode === "BIFOCAL") ? pairedPredictions : predictions;

        listToRender.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;

            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.stroke();

            // MAURI: Distance Estimation for People
            let distanceText = "";
            let distanceVal = null;

            // PRIORIDAD 1: Distancia Estéreo (Si existe par)
            if (prediction.stereoDist) {
                distanceVal = prediction.stereoDist;
                distanceText = `Dist: ${distanceVal.toFixed(2)}m (Stereo)`;
            }
            // PRIORIDAD 2: Estimación Monocular (Calibrada Webcam)
            else if (prediction.class === "person") {
                // Ajuste basado en feedback: 1.2m real -> leía mucho más.
                // Factor nuevo: 200 / height.
                distanceVal = 200 / height;
                distanceText = `Dist: ${distanceVal.toFixed(1)}m`;
            }

            // Dibujar texto en 2 lineas
            // Linea 1: Clase y Score
            const line1 = `${prediction.class} ${(prediction.score * 100).toFixed(0)}%`;
            ctx.fillText(line1, x, y > 24 ? y - 14 : y + 14);

            // Linea 2: Distancia (DEBAJO)
            if (distanceText) {
                ctx.fillText(distanceText, x, y > 24 ? y - 2 : y + 26);
            }
        });

    }, [predictions, cameraMode, pairedPredictions]); // Dependencia actualizada para recalcular pares

    if (cameraMode !== "BIFOCAL") return null;

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "black",
                zIndex: 50,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {error ? (
                <div style={{ color: "red", textAlign: "center", background: "rgba(0,0,0,0.8)", padding: "20px", borderRadius: "8px" }}>
                    <h3> ERROR DE CÁMARA </h3>
                    <p>{error}</p>
                </div>
            ) : (
                // Contenedor 'crop'
                <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
                    {/* Video */}
                    <video
                        ref={videoRef}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: "0", // MAURI: SHOW LEFT EYE (0% instead of -100%)
                            width: "200%",
                            height: "100%",
                            objectFit: "fill"
                        }}
                        autoPlay
                        playsInline
                        muted
                    />
                    {/* Canvas Overlay perféctamente alineado al video (mismo left/width) */}
                    <canvas
                        ref={canvasRef}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: "0", // MAURI: MATCH VIDEO (LEFT EYE)
                            width: "200%",
                            height: "100%",
                            pointerEvents: "none"
                        }}
                    />
                </div>
            )}

            {/* Overlay Title */}
            <div style={{
                position: "absolute",
                top: "20px",
                left: "20px", // MAURI: Left Align to be safe in split/crop views
                // transform: "translateX(-50%)", // No centering needed
                color: "lime",
                fontFamily: "monospace",
                fontSize: "1.5rem",
                background: "rgba(0,0,0,0.5)",
                padding: "5px 15px",
                borderRadius: "4px",
                display: "flex",
                gap: "20px"
            }}>
                <span>VISTA CÁMARA BIFOCO</span>
                {isLoading && <span style={{ color: "yellow", fontSize: "1rem" }}>(Cargando IA...)</span>}
            </div>
        </div>
    );
}
