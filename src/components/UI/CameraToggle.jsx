import React from "react";
import { useStore } from "../../store/useStore";

export function CameraToggle() {
  const cameraMode = useStore((state) => state.cameraMode);
  const setCameraMode = useStore((state) => state.setCameraMode);

  const toggleMode = () => {
    setCameraMode(cameraMode === "FOLLOW" ? "FREE" : "FOLLOW");
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "40px",
        right: "40px",
        pointerEvents: "auto",
        zIndex: 100,
      }}
    >
      <button
        onClick={toggleMode}
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "10px 20px",
          borderRadius: "8px",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "14px",
          backdropFilter: "blur(4px)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => (e.target.style.background = "rgba(0, 0, 0, 0.8)")}
        onMouseLeave={(e) => (e.target.style.background = "rgba(0, 0, 0, 0.6)")}
      >
        CAMARA: {cameraMode === "FOLLOW" ? "SEGUIMIENTO" : "LIBRE"}
      </button>
    </div>
  );
}
