import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { ScenarioManager } from "./ScenarioManager";
// Importamos la versión ASYNC del buscador para no congelar la pantalla
import { findPathAsync } from "../../utils/pathfinding";

export function EditorToolbar() {
  const [open, setOpen] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showDestinations, setShowDestinations] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Acciones y estado del Store
  const selectedTool = useStore((state) => state.selectedTool);
  const setTool = useStore((state) => state.setTool);
  const gridData = useStore((state) => state.gridData);
  const GRID_SIZE = useStore((state) => state.GRID_SIZE);
  const setPath = useStore((state) => state.setPath);
  const setExplored = useStore((state) => state.setExplored);
  const setAutonomous = useStore((state) => state.setAutonomous);
  const setTargetDestination = useStore((state) => state.setTargetDestination);
  const setTestConfig = useStore((state) => state.setTestConfig);

  // --- RECORDING STATE ---
  const isRecording = useStore((state) => state.isRecording);
  const setRecording = useStore((state) => state.setRecording);
  const saveRecordedPath = useStore((state) => state.saveRecordedPath);
  const savedPaths = useStore((state) => state.savedPaths);
  const loadRecordedPath = useStore((state) => state.loadRecordedPath);
  const deleteRecordedPath = useStore((state) => state.deleteRecordedPath);

  // Submenú de construcciones
  const [showConstruction, setShowConstruction] = useState(false);

  // Tools definitions
  const constructionTools = [
    { id: "road", label: "🛣️ Camino (Arrastrar)", color: "#333" },
    { id: "parking", label: "🅿️ Estacionamiento (Arrastrar)", color: "#8d6e63" },
    { id: "destination", label: "🚩 Destino", color: "#ffcc00" },
    { id: "tree", label: "🌲 Árbol", color: "#228b22" },
    { id: "streetlight", label: "💡 Farola", color: "#f1c40f" },
    { id: "flag", label: "🇦🇷 Bandera", color: "#74acdf" },
    { id: "building", label: "🏭 Galpón (Arrastrar)", color: "#8b4513" },
    { id: "floor", label: "⬜ Baldosas (Arrastrar)", color: "#95a5a6" },
    { id: "pool", label: "🏊 Pileta (Arrastrar)", color: "#3498db" },
    { id: "quincho", label: "⛺ Quincho (Arrastrar)", color: "#d35400" },
    { id: "eraser", label: "🧽 Borrar", color: "#999" },
  ];

  const handleAutoDrive = async (destKey) => {
    // ... (Mismo código de antes)
    if (isCalculating) return;
    const dest = gridData[destKey];
    if (!dest) return;

    const [destX, destZ] = destKey.split(",").map(Number);
    const { vehicleState } = useStore.getState();

    setExplored([]);
    setPath([]);
    setIsCalculating(true);

    try {
      const result = await findPathAsync(
        { x: vehicleState.x, z: vehicleState.z, heading: vehicleState.heading },
        { x: destX, z: destZ },
        gridData,
        GRID_SIZE,
        (exploredNodes) => setExplored(exploredNodes)
      );

      if (result.path) {
        setPath(result.path);
        setExplored(result.explored);
        setTargetDestination(dest);
        setAutonomous(true);
        setOpen(false);
      } else {
        setExplored(result.explored);
        alert("Fallo en la navegación. Revisa obstáculos.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleStartTest = () => {
    // ... (Mismo código)
    const countStr = prompt("¿Cuántos destinos aleatorios quieres testear?", "5");
    const count = parseInt(countStr);
    if (!count || count <= 0) return;
    const destEntries = Object.entries(gridData).filter(([k, v]) => v.type === "destination");
    if (destEntries.length === 0) { alert("No hay destinos."); return; }
    setTestConfig({ active: true, remaining: count });
    const randomIdx = Math.floor(Math.random() * destEntries.length);
    handleAutoDrive(destEntries[randomIdx][0]);
  };

  // --- LOGICA DE GRABACIÓN ---
  const handlePencilClick = () => {
    if (isRecording) {
      // STOP RECORDING
      const name = prompt("Nombre para la ruta grabada:", "Mi Ruta 1");
      if (name) {
        saveRecordedPath(name);
        alert(`Ruta "${name}" guardada. Puedes reproducirla desde '🤖 Auto Drive'.`);
      } else {
        setRecording(false); // Cancelar sin guardar
      }
    } else {
      // MENU O START RECORDING (El usuario pidió que el lápiz sirva para grabar)
      // Mantengo el menú abierto con long click o click derecho? 
      // La solicitud dice: "al lapiz le agreges una funcion... cambia de nombre a 'detener'"
      // Así que asumo que el botón principal abre el menú, y DENTRO del menú ponemos la opción de grabar.
      // O BIEN, que el botón principal CAMBIA de función.
      // Voy a poner la opción de GRABAR dentro del menú para no perder las heramientas de edición.
      setOpen(!open);
    }
  };

  const destinations = Object.entries(gridData).filter(
    ([key, val]) => val.type === "destination",
  );

  return (
    <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1000 }}>
      {/* BOTÓN PRINCIPAL (LÁPIZ / GRABANDO) */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: "24px",
          padding: "10px",
          marginTop: "150px",
          cursor: "pointer",
          borderRadius: "50%",
          border: isRecording ? "4px solid red" : "none", // Indicador visual
          background: isRecording ? "#ffeebb" : "white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          animation: isRecording ? "pulse 1s infinite" : "none",
        }}
        title={isRecording ? "Grabando... Click para opciones" : "Herramientas"}
      >
        {isRecording ? "🔴" : "✏️"}
      </button>

      {/* CONTENEDOR DE MENÚS (Flex para ponerlos lado a lado) */}
      {open && (
        <div style={{ display: "flex", alignItems: "flex-start", marginTop: "10px", gap: "10px" }}>

          {/* MENÚ PRINCIPAL */}
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              minWidth: "180px",
            }}
          >
            {/* SECCIÓN GRABACIÓN */}
            <button
              onClick={() => {
                if (isRecording) {
                  // DETENER (Guardar)
                  const name = prompt("Nombre de la ruta:", "Ruta 1");
                  if (name) saveRecordedPath(name);
                  else setRecording(false);
                } else {
                  // INICIAR
                  if (confirm("¿Iniciar grabación de ruta? Conduce manualmente.")) {
                    setRecording(true);
                  }
                }
                setOpen(false);
              }}
              style={{
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                background: isRecording ? "#ffeebb" : "white",
                color: isRecording ? "red" : "black",
                fontWeight: "bold",
                textAlign: "left",
                borderBottom: "1px solid #eee"
              }}
            >
              {isRecording ? "⏹️ DETENER GRABACIÓN" : "⏺️ GRABAR RECORRIDO"}
            </button>

            {!isRecording && (
              <>
                {/* HERRAMIENTAS BÁSICAS */}
                <button
                  onClick={() => { setTool("none"); setOpen(false); }}
                  style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: selectedTool === "none" ? "#e0e0e0" : "white", textAlign: "left" }}
                >
                  ✋ Navegar
                </button>

                {/* GRUPO CONSTRUCCIONES (ACTIVADOR DEL SUBMENÚ) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConstruction(!showConstruction);
                  }}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    cursor: "pointer",
                    background: showConstruction ? "#fff5e6" : "white",
                    textAlign: "left",
                    fontWeight: "bold",
                    color: "#d35400",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderLeft: showConstruction ? "4px solid #d35400" : "none"
                  }}
                >
                  <span>🏗️ Construcciones</span>
                  <span>{showConstruction ? "▶" : "▶"}</span>
                </button>
              </>
            )}

            <div style={{ borderTop: "1px solid #eee", margin: "5px 0" }}></div>

            <button onClick={handleStartTest} style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: "white", textAlign: "left", fontWeight: "bold", color: "#dc3545" }}>
              🧪 Test Random
            </button>

            <button onClick={() => setShowDestinations(!showDestinations)} style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: "white", textAlign: "left", fontWeight: "bold", color: "#007bff" }}>
              🤖 Auto / Playback
            </button>

            {showDestinations && (
              <div style={{ background: "#f8f9fa", padding: "5px", maxHeight: "200px", overflowY: "auto" }}>
                {/* LISTA DE RUTAS GRABADAS */}
                {Object.keys(savedPaths).length > 0 && (
                  <>
                    <div style={{ fontSize: "0.8em", color: "#666", padding: "2px 5px" }}>📼 GRABACIONES</div>
                    {Object.keys(savedPaths).map((name) => (
                      <div key={name} style={{ display: "flex", alignItems: "center" }}>
                        <button
                          onClick={() => { loadRecordedPath(name); setAutonomous(true); }}
                          style={{ flex: 1, padding: "5px 10px", border: "none", background: "transparent", textAlign: "left", fontSize: "0.9em", cursor: "pointer", color: "#28a745" }}
                        >
                          ▶ {name}
                        </button>
                        <button onClick={() => deleteRecordedPath(name)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>❌</button>
                      </div>
                    ))}
                    <div style={{ borderBottom: "1px solid #ddd", margin: "5px 0" }}></div>
                  </>
                )}

                {/* LISTA DE DESTINOS NORMALES */}
                <div style={{ fontSize: "0.8em", color: "#666", padding: "2px 5px" }}>🚩 DESTINOS</div>
                {destinations.map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleAutoDrive(key)}
                    style={{ display: "block", width: "100%", padding: "5px 10px", border: "none", background: "transparent", textAlign: "left", fontSize: "0.9em", cursor: "pointer" }}
                  >
                    📍 {val.name || "Destino"}
                  </button>
                ))}
              </div>
            )}

            <div style={{ borderTop: "1px solid #eee", margin: "5px 0" }}></div>
            <button onClick={() => { setShowScenarios(true); setOpen(false); }} style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: "white", textAlign: "left" }}>
              💾 Escenarios
            </button>
          </div>

          {/* SUBMENÚ LATERAL DE CONSTRUCCIONES */}
          {showConstruction && !isRecording && (
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                padding: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                minWidth: "220px",
                border: "1px solid #ddd"
              }}
            >
              {constructionTools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTool(t.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px",
                    border: selectedTool === t.id ? "2px solid #d35400" : "1px solid #eee",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: selectedTool === t.id ? "#ffecd9" : "white",
                    fontSize: "0.85em",
                    color: "#333",
                    height: "80px",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "1.5em", marginBottom: "5px" }}>
                    {t.label.split(" ")[0]}
                  </span>
                  <span>
                    {t.label.replace(/^[^\s]+\s/, "")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ScenarioManager isOpen={showScenarios} onClose={() => setShowScenarios(false)} />

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
