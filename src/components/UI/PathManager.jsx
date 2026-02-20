import React from "react";
import { useStore } from "../../store/useStore";

export function PathManager({ isOpen, onClose, onLoadAbsolute }) { // MAURI: Added onLoadAbsolute prop
    const savedPaths = useStore((state) => state.savedPaths);
    // const loadRecordedPath = useStore((state) => state.loadRecordedPath); // MAURI: Deprecated here
    const deleteRecordedPath = useStore((state) => state.deleteRecordedPath);
    const saveCurrentPath = useStore((state) => state.saveCurrentPath);
    const currentPath = useStore((state) => state.currentPath);

    if (!isOpen) return null;

    const pathNames = Object.keys(savedPaths);

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
                <h3>Rutas Grabadas</h3>
                <button
                    onClick={onClose}
                    style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}
                >
                    ❌
                </button>
            </div>

            {/* BOTÓN PARA GUARDAR RUTA ACTUAL (SI HAY UNA) */}
            {currentPath && currentPath.length > 0 && (
                <div style={{ marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #333" }}>
                    <button
                        onClick={() => {
                            const name = prompt("Nombre para guardar ruta actual:", "Ruta Calculada 1");
                            if (name) {
                                saveCurrentPath(name);
                            }
                        }}
                        style={{
                            width: "100%",
                            padding: "8px",
                            background: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        💾 Guardar Ruta Actual ({currentPath.length} puntos)
                    </button>
                </div>
            )}

            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {pathNames.length === 0 && (
                    <p style={{ color: "#888", fontSize: "0.9em" }}>
                        No hay rutas guardadas.
                    </p>
                )}
                {pathNames.map((name) => (
                    <div
                        key={name}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "5px",
                            background: "#222",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #333"
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "1em", fontWeight: "bold", color: "#00FFFF" }}>{name}</span>
                            <span style={{ fontSize: "0.8em", color: "#888" }}>Points: {savedPaths[name].length}</span>
                        </div>

                        <div style={{ display: "flex", gap: "5px" }}>
                            <button
                                onClick={() => {
                                    loadRecordedPath(name);
                                    onClose();
                                }}
                                style={{
                                    background: "#28a745",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: "0.8em",
                                    padding: "5px 10px",
                                    borderRadius: "4px",
                                }}
                            >
                                Load
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm(`¿Borrar ruta "${name}"?`)) {
                                        deleteRecordedPath(name);
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
                    </div>
                ))}
            </div>
        </div>
    );
}
