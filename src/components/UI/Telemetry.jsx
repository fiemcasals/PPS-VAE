import React from "react";
import { useStore } from "../../store/useStore";
import { VEHICLE_CONFIG } from "../Vehicle/Physics/vehicleConfig";
import "./styles/Telemetry.css";

export const Telemetry = () => {
  // Suscripción a los datos del Store
  const { steering, throttle, direction } = useStore((state) => state.controls);
  const speed = useStore((state) => state.telemetry.speed);

  return (
    <div
      className="telemetry-container"
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        color: "#00f2ff",
        fontFamily: "monospace",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: "15px",
        borderRadius: "8px",
        borderLeft: "4px solid #00f2ff",
        zIndex: 100000,
        pointerEvents: "none",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>SISTEMAS VAE</h3>
      <div style={{ fontSize: "18px", fontWeight: "bold" }}>
        VELOCIDAD: {speed.toFixed(1)} km/h
      </div>
      <hr style={{ borderColor: "rgba(0, 242, 255, 0.2)" }} />
      <div style={{ fontSize: "12px" }}>
        POTENCIA: {(throttle * 100).toFixed(0)}% <br />
        GIRO: {(steering * (VEHICLE_CONFIG.MAX_STEER_ANGLE * 180 / Math.PI)).toFixed(1)}° <br />
        SENTIDO: {direction === 1 ? "DRIVE (D)" : "REVERSE (R)"}
      </div>
    </div>
  );
};
