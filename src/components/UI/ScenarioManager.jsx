import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { useScenarios } from "../../hooks/useScenarios";

export function ScenarioManager({ isOpen, onClose }) {
    const [scenarioName, setScenarioName] = useState("");
    const gridData = useStore((state) => state.gridData);
    const loadGridData = useStore((state) => state.loadGridData);
    const { scenariosList, saveScenario, loadScenario, deleteScenario } =
        useScenarios();

    // Función para guardar el escenario actual en la memoria del navegador (LocalStorage)
    // Esta función es parte del hook useScenarios, pero su lógica interna es la siguiente:
    // 1. Verifica que el nombre del escenario no esté vacío.
    // 2. Obtiene el estado actual del diseño (gridData) directamente del store de Zustand.
    // 3. Crea un objeto de escenario con un ID único, el nombre, la fecha de última modificación y el gridData.
    // 4. Añade el nuevo escenario a la lista de escenarios existentes.
    // 5. Persiste la lista actualizada de escenarios en el localStorage bajo la clave "vae_scenarios"
    //    convirtiéndola a una cadena JSON.
    // 6. Limpia el campo de entrada del nombre del escenario.
    //
    // Ejemplo de la lógica de guardado (implementada dentro de useScenarios):
    /*
    const saveScenarioLogic = (nameToSave, currentGridData) => {
        if (!nameToSave.trim()) return;

        const newScenario = {
            id: Date.now(), // ID único basado en tiempo
            name: nameToSave,
            lastModified: new Date().toLocaleString(),
            gridData: currentGridData, // Guardamos TODO el mapa
        };

        // Recuperar escenarios existentes, añadir el nuevo y guardar
        const existingScenarios = JSON.parse(localStorage.getItem("vae_scenarios") || "[]");
        const updatedScenarios = [...existingScenarios, newScenario];
        localStorage.setItem("vae_scenarios", JSON.stringify(updatedScenarios));
        // En el hook, esto también actualizaría el estado interno de scenariosList
    };
    */

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
                        onClick={() => {
                            loadGridData(loadScenario(name));
                            onClose(); // MAURI: Cerrar menú al elegir
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
