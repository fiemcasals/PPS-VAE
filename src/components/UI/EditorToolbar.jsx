import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { ScenarioManager } from "./ScenarioManager";
import { findPath } from "../../utils/pathfinding";

export function EditorToolbar() {
  const [open, setOpen] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showDestinations, setShowDestinations] = useState(false);

  // Acciones y estado del Store
  const selectedTool = useStore((state) => state.selectedTool);
  const setTool = useStore((state) => state.setTool);
  const gridData = useStore((state) => state.gridData);
  const GRID_SIZE = useStore((state) => state.GRID_SIZE); // Importante para el pathfinding
  const setPath = useStore((state) => state.setPath);
  const setExplored = useStore((state) => state.setExplored); // Para debug visual
  const setAutonomous = useStore((state) => state.setAutonomous);
  const setTargetDestination = useStore((state) => state.setTargetDestination);

  const tools = [
    { id: "none", label: "✋ Navegar", color: "#666" },
    { id: "road", label: "🛣️ Camino", color: "#333" },
    { id: "eraser", label: "🧽 Borrar", color: "#999" },
    { id: "destination", label: "🚩 Destino", color: "#ffcc00" },
  ];

  // ... dentro de EditorToolbar ...
  const handleAutoDrive = (destKey) => {
    const dest = gridData[destKey];
    if (!dest) return;

    const [destX, destZ] = destKey.split(",").map(Number);
    const { vehicleState } = useStore.getState();

    const result = findPath(
      { x: vehicleState.x, z: vehicleState.z, heading: vehicleState.heading },
      { x: destX, z: destZ },
      gridData,
      GRID_SIZE,
    );

    if (result.path) {
      setPath(result.path);
      setExplored(result.explored);
      setTargetDestination(dest);
      setAutonomous(true);
      setOpen(false);
    } else {
      setExplored(result.explored);
      console.error("DEBUG INFO: Revisa la nube de puntos rojos en el mapa.");
      alert(`Fallo en la navegación:
      - Nodos explorados: ${result.explored.length}
      - ¿Inicio bloqueado?: Revisa la consola (F12)
      - Sugerencia: Asegúrate de que el camino sea lo suficientemente ancho para el auto (4.5m x 2m)`);
    }
  };

  const destinations = Object.entries(gridData).filter(
    ([key, val]) => val.type === "destination",
  );

  return (
    <div
      style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1000 }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: "24px",
          padding: "10px",
          marginTop: "150px",
          cursor: "pointer",
          borderRadius: "50%",
          border: "none",
          background: "white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        ✏️
      </button>

      {open && (
        <div
          style={{
            background: "white",
            marginTop: "10px",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            minWidth: "150px",
          }}
        >
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                setOpen(false);
              }}
              style={{
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                background: selectedTool === t.id ? "#e0e0e0" : "white",
                textAlign: "left",
              }}
            >
              {t.label}
            </button>
          ))}

          <div style={{ borderTop: "1px solid #eee", margin: "5px 0" }}></div>

          <button
            onClick={() => setShowDestinations(!showDestinations)}
            style={{
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
              background: "white",
              textAlign: "left",
              fontWeight: "bold",
              color: "#007bff",
            }}
          >
            🤖 Auto Drive
          </button>

          {showDestinations && (
            <div style={{ background: "#f8f9fa", padding: "5px" }}>
              {destinations.length === 0 && (
                <div
                  style={{ padding: "5px", fontSize: "0.8em", color: "#666" }}
                >
                  Sin destinos
                </div>
              )}
              {destinations.map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleAutoDrive(key)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "5px 10px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    fontSize: "0.9em",
                    cursor: "pointer",
                  }}
                >
                  📍 {val.name || "Destino"}
                </button>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid #eee", margin: "5px 0" }}></div>
          <button
            onClick={() => {
              setShowScenarios(true);
              setOpen(false);
            }}
            style={{
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
              background: "white",
              textAlign: "left",
            }}
          >
            💾 Escenarios
          </button>
        </div>
      )}

      <ScenarioManager
        isOpen={showScenarios}
        onClose={() => setShowScenarios(false)}
      />
    </div>
  );
}
