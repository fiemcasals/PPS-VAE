import React from "react";
import { useStore } from "../../store/useStore";
import "./styles/Controls.css";

export default function Throttle() {
  const throttle = useStore((state) => state.controls.throttle);
  const setThrottle = useStore((state) => state.setThrottle);

  const handleInput = (e) => {
    const val = parseFloat(e.target.value);
    setThrottle(val);
  };

  // Esta es la parte que faltaba conectar:
  const handleReset = () => {
    console.log("Throttle UI -> Reset a 0");
    setThrottle(0);
  };

  return (
    <div
      className="throttle-container"
      style={{ pointerEvents: "auto", zIndex: 1000 }}
    >
      <span className="throttle-label">Potencia</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={throttle}
        onInput={handleInput}
        // AGREGAMOS ESTOS DOS:
        onMouseUp={handleReset} // Para PC
        onTouchEnd={handleReset} // Para Celulares/Tablets
        className="throttle-input"
      />
    </div>
  );
}
