import React from "react";
import { useStore } from "../../store/useStore";

export function CameraToggle() {
  const cameraMode = useStore((state) => state.cameraMode);
  const setCameraMode = useStore((state) => state.setCameraMode);
  const availableCameras = useStore((state) => state.availableCameras);
  const selectedCameraId = useStore((state) => state.selectedCameraId);
  const setSelectedCameraId = useStore((state) => state.setSelectedCameraId);

  const toggleMode = () => {
    const modes = ["FOLLOW", "FREE", "DRIVER", "BIFOCAL"];
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCameraMode(modes[nextIndex]);
  };

  const getLabel = (mode) => {
    switch (mode) {
      case "FOLLOW": return "SEGUIMIENTO";
      case "FREE": return "LIBRE";
      case "DRIVER": return "FRONTAL";
      case "BIFOCAL": return "BIFOCO";
      default: return "SEGUIMIENTO";
    }
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
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
          CAMARA VIRTUAL: {getLabel(cameraMode)}
        </button>

        {availableCameras && availableCameras.length > 0 && (
          <select
            value={selectedCameraId || ""}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            style={{
              background: "rgba(0, 0, 0, 0.6)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              padding: "5px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "12px",
              backdropFilter: "blur(4px)",
              width: "100%",
            }}
          >
            <option value="">Cámara Automática</option>
            {availableCameras.map((cam, idx) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Cámara ${idx + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
