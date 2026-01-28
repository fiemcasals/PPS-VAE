import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../../store/useStore";

export default function Joystick() {
  // Conexión con las acciones del Store
  const setSteering = useStore((state) => state.setSteering);
  const setDirection = useStore((state) => state.setDirection);

  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMove = (e) => {
    if (!isDragging) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Coordenadas según el tipo de evento (Touch o Mouse)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rawX = clientX - rect.left - centerX;
    const rawY = clientY - rect.top - centerY;

    // Limitamos el movimiento a un radio de 50px
    const distance = Math.sqrt(rawX * rawX + rawY * rawY);
    const maxLimit = 50;

    const x = distance > maxLimit ? (rawX / distance) * maxLimit : rawX;
    const y = distance > maxLimit ? (rawY / distance) * maxLimit : rawY;

    setPos({ x, y });

    // --- LÓGICA DE CONTROL ---
    // 1. Steering (Dirección): -1 (Izquierda) a 1 (Derecha)
    const steerVal = x / maxLimit;
    setSteering(steerVal);

    // 2. Direction (Sentido): Solo cambia si el movimiento vertical es claro
    // Arriba es Drive (1), Abajo es Reverse (-1)
    if (y < -20) setDirection(1);
    else if (y > 20) setDirection(-1);
  };

  const handleEnd = () => {
    setIsDragging(false);
    setPos({ x: 0, y: 0 });
    setSteering(0); // Al soltar, las ruedas vuelven al centro
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={() => setIsDragging(true)}
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
        border: "3px solid #00f2ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none", // Evita el scroll del navegador al tocar
        pointerEvents: "auto",
        zIndex: 100000,
        boxShadow: "0 0 20px rgba(0, 242, 255, 0.2)",
      }}
    >
      {/* Guía visual del centro */}
      <div
        style={{
          position: "absolute",
          width: "4px",
          height: "4px",
          backgroundColor: "rgba(0, 242, 255, 0.3)",
          borderRadius: "50%",
        }}
      />

      {/* Bolita del Joystick (Thumb) */}
      <div
        style={{
          width: "55px",
          height: "55px",
          backgroundColor: "#00f2ff",
          borderRadius: "50%",
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          boxShadow: "0 0 25px #00f2ff",
          cursor: "grab",
          transition: isDragging ? "none" : "transform 0.2s ease-out", // Suaviza el regreso al centro
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
