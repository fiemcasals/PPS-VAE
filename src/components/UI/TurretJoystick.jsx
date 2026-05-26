import React, { useState, useRef } from "react";
import { useStore } from "../../store/useStore";

/**
 * Joystick para controlar la torreta.
 * - Eje X: rotación horizontal (yaw) — 360° continuo
 * - Eje Y: elevación vertical (pitch) — limitada a 270°
 * Movimiento continuo: mientras se mantiene desplazado, la torreta sigue girando.
 * 
 * Props:
 * - isFine: si es true, reduce las velocidades para un ajuste de precisión (ajuste fino).
 * - side: "left" | "right" para posicionamiento en pantalla.
 * - color: color principal en formato hexadecimal.
 * - shadowColor: color para el box-shadow (rgba).
 * - label: etiqueta flotante opcional.
 */
export function TurretJoystick({
    isFine = false,
    side = "left",
    color = "#e94560",
    shadowColor = "rgba(233, 69, 96, 0.2)",
    label = ""
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const animFrameRef = useRef(null);
    const inputRef = useRef({ x: 0, y: 0 });

    // Velocidades de rotación (radianes por frame)
    // Reducimos a una fracción para el ajuste fino
    const YAW_SPEED = isFine ? 0.005 : 0.04;
    const PITCH_SPEED = isFine ? 0.003 : 0.025;

    // Loop de rotación continua
    const startRotationLoop = () => {
        const loop = () => {
            const { x, y } = inputRef.current;
            const store = useStore.getState();

            if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
                // Yaw: Joystick Right (x > 0) -> Gira Derecha (+Yaw)
                let newYaw = store.turretYaw + x * YAW_SPEED;
                // Normalizar a 0-2π
                if (newYaw > Math.PI * 2) newYaw -= Math.PI * 2;
                if (newYaw < 0) newYaw += Math.PI * 2;
                store.setTurretYaw(newYaw);

                // Pitch: Joystick Up (y < 0) -> Mira Arriba (+Pitch)
                // Invertimos y porque en DOM 'y' es positivo hacia abajo
                const newPitch = store.turretPitch - y * PITCH_SPEED;
                store.setTurretPitch(newPitch);
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };
        animFrameRef.current = requestAnimationFrame(loop);
    };

    const stopRotationLoop = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rawX = clientX - rect.left - centerX;
        const rawY = clientY - rect.top - centerY;
        const distance = Math.sqrt(rawX * rawX + rawY * rawY);
        const maxLimit = 50;
        const x = distance > maxLimit ? (rawX / distance) * maxLimit : rawX;
        const y = distance > maxLimit ? (rawY / distance) * maxLimit : rawY;
        setPos({ x, y });
        inputRef.current = { x: x / maxLimit, y: y / maxLimit };
    };

    const handleStart = () => {
        setIsDragging(true);
        startRotationLoop();
    };

    const handleEnd = () => {
        setIsDragging(false);
        setPos({ x: 0, y: 0 });
        inputRef.current = { x: 0, y: 0 };
        stopRotationLoop();
    };

    return (
        <>
            {label && (
                <div style={{
                    position: "fixed",
                    bottom: "190px",
                    [side]: "40px",
                    width: "140px",
                    textAlign: "center",
                    color: color,
                    fontFamily: "monospace",
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    letterSpacing: "1.5px",
                    textShadow: `0 0 8px ${color}`,
                    pointerEvents: "none",
                    zIndex: 100000
                }}>
                    {label}
                </div>
            )}

            <div
                ref={containerRef}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                style={{
                    position: "fixed",
                    bottom: "40px",
                    [side]: "40px",
                    width: "140px",
                    height: "140px",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    borderRadius: "50%",
                    border: `3px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    touchAction: "none",
                    pointerEvents: "auto",
                    zIndex: 100000,
                    boxShadow: `0 0 20px ${shadowColor}`,
                }}
            >
                {/* Guías de ejes */}
                <div style={{
                    position: "absolute", width: "1px", height: "80%",
                    backgroundColor: `rgba(${isFine ? '245, 176, 65' : '233, 69, 96'}, 0.15)`,
                }} />
                <div style={{
                    position: "absolute", width: "80%", height: "1px",
                    backgroundColor: `rgba(${isFine ? '245, 176, 65' : '233, 69, 96'}, 0.15)`,
                }} />

                {/* Centro */}
                <div style={{
                    position: "absolute", width: "4px", height: "4px",
                    backgroundColor: `rgba(${isFine ? '245, 176, 65' : '233, 69, 96'}, 0.3)`, borderRadius: "50%",
                }} />

                {/* Thumb */}
                <div style={{
                    width: "55px", height: "55px",
                    backgroundColor: color,
                    borderRadius: "50%",
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    boxShadow: `0 0 25px ${color}`,
                    cursor: "grab",
                    transition: isDragging ? "none" : "transform 0.2s ease-out",
                    pointerEvents: "none",
                }} />
            </div>
        </>
    );
}
