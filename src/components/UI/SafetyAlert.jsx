import React, { useEffect } from "react";
import { useStore } from "../../store/useStore";

export function SafetyAlert() {
    const nearestHumanDistance = useStore((state) => state.nearestHumanDistance);
    const safetyWarningAck = useStore((state) => state.safetyWarningAck);
    const setSafetyWarningAck = useStore((state) => state.setSafetyWarningAck);

    // Auto-reset ACK when clear
    useEffect(() => {
        if (nearestHumanDistance > 5.0 && safetyWarningAck) {
            setSafetyWarningAck(false);
        }
    }, [nearestHumanDistance, safetyWarningAck, setSafetyWarningAck]);

    if (nearestHumanDistance > 5.0 || safetyWarningAck) return null;

    const isStop = nearestHumanDistance < 1.0;
    const color = isStop ? "red" : "orange";
    const title = isStop ? "⛔ PARADA DE EMERGENCIA ⛔" : "⚠ PRECAUCIÓN - VELOCIDAD REDUCIDA ⚠";
    const msg = isStop
        ? "EL VEHÍCULO SE HA DETENIDO PORQUE SE DETECTÓ UNA PERSONA A MENOS DE 1 METRO."
        : "EL VEHÍCULO CIRCULA LENTO PORQUE SE DETECTÓ UNA PERSONA CERCANA (1m - 5m).";

    return (
        <div style={{
            position: "fixed", // MAURI: Changed from absolute to fixed for global centering
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            border: `6px solid ${color}`,
            padding: "30px",
            borderRadius: "15px",
            zIndex: 99999, // MAURI: Max z-index
            color: "white",
            textAlign: "center",
            minWidth: "500px",
            boxShadow: "0 0 100px rgba(0,0,0,1)"
        }}>
            <h2 style={{ color: color, marginTop: 0 }}>⚠️ {title} ⚠️</h2>
            <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{msg}</p>
            <p>Distancia: {nearestHumanDistance.toFixed(2)}m</p>

            <button
                onClick={() => setSafetyWarningAck(true)}
                style={{
                    marginTop: "15px",
                    padding: "10px 30px",
                    fontSize: "1.2rem",
                    backgroundColor: color,
                    color: "black",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: "bold"
                }}
            >
                ENTENDIDO
            </button>
        </div>
    );
}
