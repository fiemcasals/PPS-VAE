import React, { useState, useEffect } from "react";
import { useESP32Connection } from "../../hooks/useESP32Connection";
import { useStore } from "../../store/useStore";

export function ESP32ControlPanel() {
    const [ip, setIp] = useState(() => {
        return localStorage.getItem("esp32_ip") || "192.168.0.50";
    });
    
    const { status, latency, txData, connect, disconnect } = useESP32Connection(ip);
    const setThrottle = useStore((state) => state.setThrottle);

    useEffect(() => {
        localStorage.setItem("esp32_ip", ip);
    }, [ip]);

    // Parada de Emergencia: desconecta el socket y frena el acelerador
    const handleEmergencyStop = () => {
        disconnect();
        setThrottle(0);
        console.warn("[EMERGENCY] ¡PARADA DE EMERGENCIA ACTIVADA!");
    };

    const isConnected = status === "CONNECTED";
    const isConnecting = status === "CONNECTING";
    const isDisconnected = status === "DISCONNECTED";
    const isError = status === "ERROR";

    // Colores de estado dinámicos
    let statusColor = "#f05454"; // Desconectado (Rojo)
    let statusText = "DESCONECTADO";
    let glowColor = "rgba(240, 84, 84, 0.4)";

    if (isConnected) {
        statusColor = "#00e676"; // Conectado (Verde neón)
        statusText = "CONECTADO";
        glowColor = "rgba(0, 230, 118, 0.4)";
    } else if (isConnecting) {
        statusColor = "#ffb300"; // Conectando (Ámbar)
        statusText = "CONECTANDO...";
        glowColor = "rgba(255, 179, 0, 0.4)";
    } else if (isError) {
        statusColor = "#ff3d00"; // Error (Rojo fuerte)
        statusText = "ERROR DE ENLACE";
        glowColor = "rgba(255, 61, 0, 0.5)";
    }

    return (
        <div style={{
            position: "fixed",
            top: "105px", // Justo debajo de la telemetría superior
            right: "40px",
            width: "320px",
            backgroundColor: "rgba(10, 12, 18, 0.82)",
            border: `1px solid ${isConnected ? "rgba(0, 230, 118, 0.4)" : "rgba(233, 69, 96, 0.35)"}`,
            borderRadius: "14px",
            padding: "16px",
            color: "#fff",
            fontFamily: "'Outfit', 'Inter', sans-serif",
            backdropFilter: "blur(12px)",
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px ${isConnected ? "rgba(0, 230, 118, 0.08)" : "rgba(0, 0, 0, 0)"}`,
            pointerEvents: "auto",
            zIndex: 100000,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
            {/* Header del Panel */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: statusColor,
                        boxShadow: `0 0 8px ${statusColor}`,
                        animation: isConnecting ? "pulse 1.2s infinite ease-in-out" : "none"
                    }} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1.5px", color: "rgba(255,255,255,0.8)" }}>
                        AUTO FÍSICO REAL
                    </span>
                </div>
                <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: statusColor,
                    backgroundColor: `rgba(${isConnected ? "0, 230, 118" : "240, 84, 84"}, 0.1)`,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: `1px solid rgba(${isConnected ? "0, 230, 118" : "240, 84, 84"}, 0.2)`
                }}>
                    {statusText}
                </span>
            </div>

            {/* Inputs de Configuración de IP */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "4px", fontWeight: 600 }}>
                        DIRECCIÓN IP VEHÍCULO (ESP32)
                    </div>
                    <input
                        type="text"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        disabled={!isDisconnected && !isError}
                        style={{
                            width: "100%",
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            color: "#fff",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                            outline: "none",
                            boxSizing: "border-box",
                            transition: "all 0.2s ease"
                        }}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                    {isDisconnected || isError ? (
                        <button
                            onClick={connect}
                            style={{
                                backgroundColor: "#e94560",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: "0 0 10px rgba(233, 69, 96, 0.3)"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
                        >
                            Enlazar
                        </button>
                    ) : (
                        <button
                            onClick={disconnect}
                            style={{
                                backgroundColor: "rgba(255, 255, 255, 0.1)",
                                color: "#f05454",
                                border: "1px solid rgba(240, 84, 84, 0.3)",
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(240, 84, 84, 0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                        >
                            Cortar
                        </button>
                    )}
                </div>
            </div>

            {/* Panel de Enlace de Datos Activo */}
            {isConnected && (
                <div style={{
                    backgroundColor: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "14px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
                        <span>Latencia de red: <strong style={{ color: latency < 15 ? "#00e676" : "#ffb300" }}>{latency} ms</strong></span>
                        <span>Frecuencia: <strong style={{ color: "#fff" }}>25 Hz</strong></span>
                    </div>

                    {/* Barra de Aceleración */}
                    <div style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", marginBottom: "4px" }}>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>POTENCIA MOTOR (ac)</span>
                            <span style={{ color: "#00e676", fontWeight: 700 }}>{txData.ac}%</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{
                                width: `${txData.ac}%`,
                                height: "100%",
                                backgroundColor: "#00e676",
                                boxShadow: "0 0 8px #00e676",
                                transition: "width 0.1s ease"
                            }} />
                        </div>
                    </div>

                    {/* Indicador de Dirección / Marcha */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", marginBottom: "4px" }}>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>ÁNGULO DIRECCIÓN (angle)</span>
                            <span style={{ color: "#e94560", fontWeight: 700 }}>{txData.angle}°</span>
                        </div>
                        
                        {/* Visualizador de volante 2D */}
                        <div style={{ position: "relative", width: "100%", height: "12px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "6px" }}>
                            <div style={{
                                position: "absolute",
                                left: "50%",
                                width: "2px",
                                height: "100%",
                                backgroundColor: "rgba(255,255,255,0.3)"
                            }} />
                            {/* Marcador del ángulo actual */}
                            <div style={{
                                position: "absolute",
                                // Mapeamos de -150 a 150 a porcentaje
                                left: `${50 + (Math.abs(txData.angle) - 90) * (txData.angle < 0 ? -1 : 1) * (50 / 60)}%`,
                                transform: "translateX(-50%)",
                                width: "8px",
                                height: "8px",
                                top: "2px",
                                borderRadius: "50%",
                                backgroundColor: txData.angle < 0 ? "#ffb300" : "#e94560",
                                boxShadow: `0 0 8px ${txData.angle < 0 ? "#ffb300" : "#e94560"}`
                            }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                            <span>IZQUIERDA</span>
                            <span style={{ color: txData.angle < 0 ? "#ffb300" : "#e94560" }}>
                                {txData.angle < 0 ? "REVERSA" : "ADELANTE"}
                            </span>
                            <span>DERECHA</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Parada de Emergencia */}
            {!isDisconnected && (
                <button
                    onClick={handleEmergencyStop}
                    style={{
                        width: "100%",
                        backgroundColor: "#f05454",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "10px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        letterSpacing: "1px",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(240, 84, 84, 0.4)",
                        transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.15)"}
                    onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
                >
                    🛑 PARADA DE EMERGENCIA
                </button>
            )}

            {/* Estilo para animación CSS */}
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 1; }
                    100% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
