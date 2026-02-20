import React, { useEffect } from "react";
import { useStore } from "../../store/useStore";

export function SafetyAlert() {
    const safetyStatus = useStore((state) => state.safetyStatus);
    const safetyAlertAck = useStore((state) => state.safetyAlertAck);
    const nearestHumanDistance = useStore((state) => state.nearestHumanDistance);
    const setAutonomous = useStore((state) => state.setAutonomous);
    const setThrottle = useStore((state) => state.setThrottle);
    const setSafetyAlertAck = useStore((state) => state.setSafetyAlertAck);

    // ONLY SHOW ALERT ON DANGER AND IF NOT ACKNOWLEDGED
    if (safetyStatus !== "DANGER" || safetyAlertAck) return null;

    return (
        <div style={{
            pointerEvents: "auto",
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(30, 0, 0, 0.98)", // Darker, cleaner red
            border: "4px solid red",
            padding: "50px",
            borderRadius: "30px",
            zIndex: 999999,
            color: "white",
            textAlign: "center",
            minWidth: "700px",
            boxShadow: "0 0 150px rgba(0,0,0,1), 0 0 30px rgba(255,0,0,0.5)",
            backdropFilter: "blur(10px)"
        }}>
            <h1 style={{ fontSize: "3.5rem", margin: "0 0 10px 0", color: "#ff4444" }}>🚨 PERSONA EN TRAYECTORIA 🚨</h1>
            <div style={{ height: "4px", background: "red", margin: "20px auto", width: "80%" }}></div>

            <p style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
                SISTEMA DE SEGURIDAD ACTIVADO
            </p>
            <p style={{ fontSize: "1.4rem", color: "#aaa" }}>
                Distancia al objetivo: <span style={{ color: "white" }}>{nearestHumanDistance.toFixed(2)}m</span>
            </p>

            <div style={{ margin: "40px 0", fontSize: "1.3rem", lineHeight: "1.6" }}>
                <p>El vehículo ha realizado un frenado de emergencia.<br />
                    Por favor, elija cómo proceder:</p>
            </div>

            <div style={{ display: "flex", gap: "30px", justifyContent: "center", marginTop: "30px" }}>
                <button
                    onClick={() => {
                        // MANUAL OVERRIDE: Clear everything and stop autonomous
                        setAutonomous(false);
                        setThrottle(0);
                        // Store update handles safetyStatus refresh automatically
                    }}
                    style={{
                        padding: "20px 30px",
                        fontSize: "1.2rem",
                        backgroundColor: "#333",
                        color: "white",
                        border: "1px solid #666",
                        borderRadius: "15px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        flex: 1,
                        transition: "all 0.2s"
                    }}
                >
                    DETENER Y TOMAR<br />CONTROL MANUAL
                </button>

                <button
                    onClick={() => {
                        // RESUME ROUTINE: Just acknowledge. 
                        // The store's updateSafetyStatus will keep it at throttle=0 
                        // while distance < 2.3m, but it remains in Autonomous mode.
                        setSafetyAlertAck(true);
                        console.log("[Safety] User acknowledged and chose to Resume Routine.");
                    }}
                    style={{
                        padding: "20px 30px",
                        fontSize: "1.2rem",
                        backgroundColor: "white",
                        color: "black",
                        border: "none",
                        borderRadius: "15px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        flex: 1,
                        boxShadow: "0 0 20px rgba(255,255,255,0.3)"
                    }}
                >
                    RETOMAR RUTINA<br />PLANIFICADA
                </button>
            </div>
        </div>
    );
}
