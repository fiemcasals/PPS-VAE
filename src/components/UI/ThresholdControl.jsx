import React from "react";
import { useStore } from "../../store/useStore";

export function ThresholdControl() {
    const cameraMode = useStore((state) => state.cameraMode);
    const thresholds = useStore((state) => state.detectionThresholds);
    const setThreshold = useStore((state) => state.setDetectionThreshold);

    if (cameraMode !== "DRIVER" && cameraMode !== "BIFOCAL") return null;

    const targetKey = cameraMode === "DRIVER" ? "frontal" : "bifocal";
    const value = thresholds[targetKey];

    return (
        <div
            style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 100,
                pointerEvents: "auto",
                background: "rgba(0, 0, 0, 0.6)",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #00FFFF",
            }}
        >
            <label
                style={{
                    color: "#00FFFF",
                    fontFamily: "monospace",
                    marginBottom: "10px",
                    textAlign: "center",
                    fontSize: "12px",
                }}
            >
                EXIGENCIA
                <br />
                IA
            </label>
            <div style={{ position: "relative", height: "150px", width: "30px" }}>
                <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={value}
                    onChange={(e) => setThreshold(targetKey, parseFloat(e.target.value))}
                    style={{
                        writingMode: "bt-lr", /* IE/Edge */
                        WebkitAppearance: "slider-vertical", /* WebKit */
                        width: "100%",
                        height: "100%",
                        cursor: "pointer",
                    }}
                />
            </div>
            <span style={{ color: "white", marginTop: "5px", fontFamily: "monospace" }}>
                {(value * 100).toFixed(0)}%
            </span>
        </div>
    );
}
