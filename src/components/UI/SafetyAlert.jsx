import React, { useEffect } from "react";
import { useStore } from "../../store/useStore";

export function SafetyAlert() {
    const safetyStatus = useStore((state) => state.safetyStatus);
    const nearestHumanDistance = useStore((state) => state.nearestHumanDistance);
    const setAutonomous = useStore((state) => state.setAutonomous);
    const setThrottle = useStore((state) => state.setThrottle);

    // If SAFE or CAUTION, we don't block the screen (CAUTION is handled by indicator in Telemetry)
    // ONLY SHOW FULL SCREEN ALERT ON DANGER
    if (safetyStatus !== "DANGER") return null;

    return (
        <div style={{
            pointerEvents: "auto", // MAURI: Ensure clicks work even if parent has none
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(255, 0, 0, 0.95)", // Strong Red
            border: "6px solid white",
            padding: "40px",
            borderRadius: "20px",
            zIndex: 99999,
            color: "white",
            textAlign: "center",
            minWidth: "600px",
            boxShadow: "0 0 100px rgba(0,0,0,1)"
        }}>
            <h1 style={{ fontSize: "3rem", margin: "0 0 20px 0" }}>⛔ PELIGRO DETECTADO ⛔</h1>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                PERSONA DETECTADA A MENOS DE 2 METROS
            </p>
            <p style={{ fontSize: "1.2rem" }}>
                Distancia: {nearestHumanDistance.toFixed(2)}m
            </p>
            <p style={{ fontSize: "1.2rem", marginTop: "20px" }}>
                EL VEHÍCULO SE HA DETENIDO Y EL MODO AUTÓNOMO ESTÁ BLOQUEADO.
            </p>

            <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "30px" }}>
                <button
                    onClick={() => {
                        // Manual Override: User acknowledges, but system remains in DANGER state until person moves.
                        // We can't really "dismiss" the danger if the person is there.
                        // But maybe we allow switching to manual control?
                        // For now, this button just acknowledges the modal, but if distance is < 2m, it will likely reappear or throttle remains 0.
                        // Actually, let's make it a "FORCE MANUAL STOP" button just in case.
                        setAutonomous(false);
                        setThrottle(0);
                    }}
                    style={{
                        padding: "15px 40px",
                        fontSize: "1.5rem",
                        backgroundColor: "white",
                        color: "red",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                >
                    DETENER Y TOMAR CONTROL MANUAL
                </button>
            </div>
        </div>
    );
}
