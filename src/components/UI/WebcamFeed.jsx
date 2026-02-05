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
        ctx.lineWidth = 4;
        ctx.font = "24px monospace";
        ctx.fillStyle = "#00FF00";

        predictions.forEach(prediction => {
            // Solo dibujamos si es "person" (opcional, para cumplir con el requisito estricto de detectar personas)
            // Pero el usuario dijo "identificar objetos" con el modelo. El modelo original tiene 20 clases. 
            // COCO tiene 80. Mostremos todo para impresionar, o filtremos si pide.
            // El código python mostraba todo.

            const [x, y, width, height] = prediction.bbox;

            // Dibujar rectangulo
            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.stroke();

            // Dibujar texto
            const text = `${prediction.class} ${(prediction.score * 100).toFixed(1)}%`;
            ctx.fillText(text, x, y > 20 ? y - 10 : y + 20);
        });

    }, [predictions]);

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
                            left: "-100%", // LEFT EYE HIDDEN
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
                            left: "-100%",
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
                left: "50%",
                transform: "translateX(-50%)",
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
