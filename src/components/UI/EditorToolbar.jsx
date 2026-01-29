import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { ScenarioManager } from "./ScenarioManager";

export function EditorToolbar() {
  const [open, setOpen] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const { selectedTool, setTool } = useStore();

  const tools = [
    { id: "none", label: "✋ Navegar", color: "#666" },
    { id: "road", label: "🛣️ Camino", color: "#333" },
    { id: "eraser", label: "🧽 Borrar", color: "#999" },
    { id: "destination", label: "🚩 Destino", color: "#ffcc00" },
  ];

  return (
    <div
      style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1000 }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: "24px",
          padding: "10px",
          //quiero separarlo de la parte superior de la pantalla
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
