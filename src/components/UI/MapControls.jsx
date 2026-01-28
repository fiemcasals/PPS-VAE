import React from "react";
import { useStore } from "../../store/useStore";

export function MapControls() {
  const clearMap = useStore((state) => state.clearMap);

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 10,
        display: "flex",
        gap: "10px",
      }}
    >
      <button onClick={clearMap} style={btnStyle}>
        Limpiar Mapa
      </button>
      <div
        style={{
          color: "white",
          background: "rgba(0,0,0,0.6)",
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        Clic en el suelo para trazar ruta
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "10px",
  cursor: "pointer",
  background: "#444",
  color: "white",
  border: "none",
  borderRadius: "5px",
};
