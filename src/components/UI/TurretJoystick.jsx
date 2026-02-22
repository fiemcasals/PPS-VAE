import React, { useState, useRef } from "react";
import { useStore } from "../../store/useStore";

/**
 * Joystick para controlar la torreta.
 * - Eje X: rotación horizontal (yaw) — 360° continuo
 * - Eje Y: elevación vertical (pitch) — limitada a 270°
 * Movimiento continuo: mientras se mantiene desplazado, la torreta sigue girando.
 */
export function TurretJoystick() {
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const animFrameRef = useRef(null);
    const inputRef = useRef({ x: 0, y: 0 });

    // Velocidad de rotación (radianes por frame)
    const YAW_SPEED = 0.04;
    const PITCH_SPEED = 0.025;

    // Loop de rotación continua
    const startRotationLoop = () => {
        const loop = () => {
            const { x, y } = inputRef.current;
            const store = useStore.getState();

            if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
                // Yaw: rotación continua (loop 0-2π)
                let newYaw = store.turretYaw - x * YAW_SPEED;
                // Normalizar a 0-2π
                if (newYaw > Math.PI * 2) newYaw -= Math.PI * 2;
                if (newYaw < 0) newYaw += Math.PI * 2;
                store.setTurretYaw(newYaw);

                // Pitch: limitado por el setter del store (-2.356 a 2.356)
                const newPitch = store.turretPitch + y * PITCH_SPEED;
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
                left: "40px",
                width: "140px",
                height: "140px",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                borderRadius: "50%",
                border: "3px solid #e94560",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                touchAction: "none",
                pointerEvents: "auto",
                zIndex: 100000,
                boxShadow: "0 0 20px rgba(233, 69, 96, 0.2)",
            }}
        >
            {/* Guías de ejes */}
            <div style={{
                position: "absolute", width: "1px", height: "80%",
                backgroundColor: "rgba(233, 69, 96, 0.15)",
            }} />
            <div style={{
                position: "absolute", width: "80%", height: "1px",
                backgroundColor: "rgba(233, 69, 96, 0.15)",
            }} />

            {/* Centro */}
            <div style={{
                position: "absolute", width: "4px", height: "4px",
                backgroundColor: "rgba(233, 69, 96, 0.3)", borderRadius: "50%",
            }} />

            {/* Thumb */}
            <div style={{
                width: "55px", height: "55px",
                backgroundColor: "#e94560",
                borderRadius: "50%",
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                boxShadow: "0 0 25px #e94560",
                cursor: "grab",
                transition: isDragging ? "none" : "transform 0.2s ease-out",
                pointerEvents: "none",
            }} />
        </div>
    );
}
