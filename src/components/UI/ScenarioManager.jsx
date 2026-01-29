import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { useScenarios } from "../../hooks/useScenarios";

export function ScenarioManager({ isOpen, onClose }) {
    const [scenarioName, setScenarioName] = useState("");
    const gridData = useStore((state) => state.gridData);
    const loadGridData = useStore((state) => state.loadGridData);
    const { scenariosList, saveScenario, loadScenario, deleteScenario } =
        useScenarios();

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "rgba(0,0,0,0.95)",
                padding: "20px",
                borderRadius: "12px",
                color: "white",
                pointerEvents: "auto",
                width: "300px",
                zIndex: 200000,
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                border: "1px solid #333",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                }}
            >
                <h3>Escenarios</h3>
                <button
                    onClick={onClose}
                    style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}
                >
                    ❌
                </button>
            </div>

            <div style={{ marginBottom: "15px" }}>
                <input
                    type="text"
                    placeholder="Nombre del escenario"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "5px",
                        marginBottom: "5px",
                        background: "#222",
                        color: "white",
                        border: "1px solid #444",
                    }}
                />
                <button
                    onClick={() => {
                        saveScenario(scenarioName, gridData);
                        setScenarioName("");
                    }}
                    disabled={!scenarioName.trim()}
                    style={{
                        width: "100%",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        padding: "5px",
                        cursor: "pointer",
                    }}
                >
                    Guardar Actual
                </button>
            </div>

            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {scenariosList.length === 0 && (
                    <p style={{ color: "#888", fontSize: "0.9em" }}>
                        No hay escenarios guardados.
                    </p>
                )}
                {scenariosList.map((name) => (
                    <div
                        key={name}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "5px",
                            background: "#222",
                            padding: "5px",
                            borderRadius: "4px",
                        }}
                    >
                        <span style={{ fontSize: "0.9em" }}>{name}</span>
                        <div>
                            <button
                                onClick={() => loadGridData(loadScenario(name))}
                                style={{
                                    background: "#007bff",
                                    border: "none",
                                    color: "white",
                                    marginRight: "5px",
                                    cursor: "pointer",
                                    fontSize: "0.8em",
                                    padding: "2px 5px",
                                }}
                            >
                                Load
                            </button>
                            <button
                                onClick={() => deleteScenario(name)}
                                style={{
                                    background: "#dc3545",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: "0.8em",
                                    padding: "2px 5px",
                                }}
                            >
                                Del
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
