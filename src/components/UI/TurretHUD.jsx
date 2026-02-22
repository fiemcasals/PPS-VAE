import React from "react";
import { TurretJoystick } from "./TurretJoystick";
import { useStore } from "../../store/useStore";

/**
 * HUD para el modo torreta.
 * Muestra: joystick de torreta + indicadores de ángulo.
 * No incluye controles de conducción (throttle, steering).
 */
export function TurretHUD({ onBack }) {
    const turretYaw = useStore((state) => state.turretYaw);
    const turretPitch = useStore((state) => state.turretPitch);
    const vehicleState = useStore((state) => state.vehicleState);

    const yawDeg = Math.round((turretYaw * 180) / Math.PI);
    const pitchDeg = Math.round((turretPitch * 180) / Math.PI);

    return (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <TurretJoystick />

            {/* Botón Volver (Lápiz) */}
            <button
                onClick={onBack}
                title="Volver al Editor"
                style={{
                    position: "fixed",
                    top: "40px",
                    left: "40px",
                    width: "50px",
                    height: "50px",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    border: "2px solid #e94560",
                    borderRadius: "12px",
                    color: "#e94560",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    pointerEvents: "auto",
                    zIndex: 100001,
                    fontSize: "24px",
                    backdropFilter: "blur(5px)",
                    boxShadow: "0 0 15px rgba(233, 69, 96, 0.3)",
                    transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e94560";
                    e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
                    e.currentTarget.style.color = "#e94560";
                }}
            >
                ✏️
            </button>

            {/* Indicador de ángulos */}
            <div style={{
                position: "fixed", bottom: 40, right: 40,
                background: "rgba(0,0,0,0.6)", border: "1px solid rgba(233,69,96,0.3)",
                borderRadius: 12, padding: "16px 24px",
                color: "#fff", fontFamily: "monospace", fontSize: "0.85rem",
                backdropFilter: "blur(10px)", pointerEvents: "auto",
                zIndex: 100000,
            }}>
                <div style={{ color: "#e94560", fontWeight: 700, marginBottom: 8, letterSpacing: 2, fontSize: "0.7rem" }}>
                    TORRETA
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                    <div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", marginBottom: 2 }}>AZIMUT</div>
                        <div style={{ fontSize: "1.2rem", color: "#e94560" }}>{yawDeg}°</div>
                    </div>
                    <div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", marginBottom: 2 }}>ELEVACIÓN</div>
                        <div style={{ fontSize: "1.2rem", color: "#e94560" }}>{pitchDeg}°</div>
                    </div>
                </div>
            </div>

            {/* Crosshair central */}
            <div style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none", zIndex: 99999,
            }}>
                {/* Cruz */}
                <div style={{
                    width: 2, height: 30, background: "rgba(233,69,96,0.6)",
                    position: "absolute", top: -15, left: -1,
                }} />
                <div style={{
                    width: 30, height: 2, background: "rgba(233,69,96,0.6)",
                    position: "absolute", top: -1, left: -15,
                }} />
                {/* Gap central */}
                <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    border: "1px solid rgba(233,69,96,0.4)",
                    position: "absolute", top: -4, left: -4,
                    background: "rgba(0,0,0,0.3)",
                }} />
            </div>
        </div>
    );
}
