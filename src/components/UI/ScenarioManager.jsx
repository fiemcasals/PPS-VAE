import React, { useState, useRef } from "react";
import { useStore } from "../../store/useStore";
import { useScenarios } from "../../hooks/useScenarios";

export function ScenarioManager({ isOpen, onClose }) {
    const [scenarioName, setScenarioName] = useState("");
    const gridData = useStore((state) => state.gridData);
    const buildings = useStore((state) => state.buildings);
    const loadGridData = useStore((state) => state.loadGridData);
    const loadBuildings = useStore((state) => state.loadBuildings);
    const { scenariosList, saveScenario, loadScenario, deleteScenario } =
        useScenarios();

    // MAURI: Auto-load first scenario ONCE on startup
    const hasAutoLoaded = useRef(false);

    React.useEffect(() => {
        if (hasAutoLoaded.current) return; // Ya cargamos, no repetir
        if (scenariosList.length === 0) return; // Aún no hay escenarios

        // Verificar que el grid esté vacío (primera carga)
        const currentGridData = useStore.getState().gridData;
        if (Object.keys(currentGridData).length > 0) {
            hasAutoLoaded.current = true;
            return;
        }

        // Sort list: "Empty" goes last
        const sorted = [...scenariosList].sort((a, b) => {
            if (a.toLowerCase().includes("empty") || a.toLowerCase().includes("vacio")) return 1;
            if (b.toLowerCase().includes("empty") || b.toLowerCase().includes("vacio")) return -1;
            return a.localeCompare(b);
        });

        const first = sorted[0];
        // console.log("Auto-loading scenario:", first);
        const data = loadScenario(first);
        if (data) {
            if (data.gridData) {
                loadGridData(data.gridData);
                loadBuildings(data.buildings || []);
            } else {
                loadGridData(data);
                loadBuildings([]);
            }
            // Sincronizar escenario activo con el otro operador
            fetch("/api/sync/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ active_scenario: first }),
            }).catch(() => { });
        }
        hasAutoLoaded.current = true;
    }, [scenariosList]);

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
                        saveScenario(scenarioName, { gridData, buildings });
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
                        onClick={() => {
                            const data = loadScenario(name);
                            if (data.gridData) {
                                loadGridData(data.gridData);
                                loadBuildings(data.buildings || []);
                            } else {
                                loadGridData(data);
                                loadBuildings([]);
                            }
                            // Sincronizar escenario activo con el otro operador
                            fetch("/api/sync/", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "same-origin",
                                body: JSON.stringify({ active_scenario: name }),
                            }).catch(() => { });
                            onClose();
                        }}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "5px",
                            background: "#222",
                            padding: "10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#222")}
                    >
                        <span style={{ fontSize: "1em", fontWeight: "bold" }}>{name}</span>

                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Evitar cargar al borrar
                                if (window.confirm(`¿Borrar "${name}"?`)) {
                                    deleteScenario(name);
                                }
                            }}
                            style={{
                                background: "#dc3545",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "0.8em",
                                padding: "5px 10px",
                                borderRadius: "4px",
                            }}
                        >
                            Del
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
