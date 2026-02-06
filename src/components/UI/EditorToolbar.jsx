import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { ScenarioManager } from "./ScenarioManager";
import { PathManager } from "./PathManager";
// Importamos la versión ASYNC del buscador para no congelar la pantalla
import { findPathAsync } from "../../utils/pathfinding";

export function EditorToolbar() {
  const [open, setOpen] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showPaths, setShowPaths] = useState(false); // Estado para PathManager
  const [showDestinations, setShowDestinations] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // MAURI: Estado para menú de configuración
  const [isCalculating, setIsCalculating] = useState(false);
  // ... (omitting lines for brevity in prompt, but in tool call I must be precise or use multiple chunks)
  // I will use multi_replace to be safe and cleaner.


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
  const saveCurrentPath = useStore((state) => state.saveCurrentPath); // Added for save button
  const currentPath = useStore((state) => state.currentPath); // Added for save button visibility

  // Submenú de construcciones
  const [showConstruction, setShowConstruction] = useState(false);

  // Submenú de Itinerarios (Derecha)
  const [showItineraries, setShowItineraries] = useState(false);
  const [itinerary, setItinerary] = useState([]); // Array of keys

  // MAURI: Helper to ensure exclusive submenu opening
  const toggleSubmenu = (menuName) => {
    // Close all first, but if we are clicking the one already open, toggle it (close it)
    // Actually simpler: if active, close. If inactive, open and close others.

    // States to manage: Construction, Destinations, Itineraries, Settings
    const states = {
      construction: [showConstruction, setShowConstruction],
      destinations: [showDestinations, setShowDestinations],
      itineraries: [showItineraries, setShowItineraries],
      settings: [showSettings, setShowSettings]
    };

    const [currentVal, setLimit] = states[menuName];

    // If opening, close others
    if (!currentVal) {
      Object.keys(states).forEach(key => {
        if (key !== menuName) states[key][1](false);
      });
    }
    setLimit(!currentVal);
  };

  // Tools definitions
  const constructionTools = [
    { id: "road", label: "🛣️ Camino (Arrastrar)", color: "#333" },
    { id: "parking", label: "🅿️ Estacionamiento (Arrastrar)", color: "#8d6e63" },
    { id: "destination", label: "🚩 Destino", color: "#ffcc00" },
    { id: "tree", label: "🌲 Árbol", color: "#228b22" },
    { id: "person", label: "🧍 Persona", color: "#e91e63" },
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
        useStore.getState().config, // MAURI: Pass config
        (exploredNodes) => setExplored(exploredNodes)
      );

      if (result.path) {
        setPath(result.path);
        setExplored(result.explored);
        setTargetDestination(dest);
        setAutonomous(true);
        // setOpen(false); // Mantener abierto para seguir operando si se quiere
        setShowDestinations(false); // Cerrar panel de destinos al iniciar
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

  const handleItineraryDrive = async () => {
    if (isCalculating || itinerary.length === 0) return;
    setIsCalculating(true);
    setExplored([]);
    setPath([]);

    // Obtener estado inicial
    const { vehicleState } = useStore.getState();
    // Simular posición de inicio para el encadenamiento
    let currentStart = { x: vehicleState.x, z: vehicleState.z, heading: vehicleState.heading };

    let fullPath = [];
    let fullExplored = [];

    try {
      for (let i = 0; i < itinerary.length; i++) {
        const destKey = itinerary[i];
        const dest = gridData[destKey];
        if (!dest) continue;

        const [destX, destZ] = destKey.split(",").map(Number);

        // Calcular tramo
        const result = await findPathAsync(
          currentStart,
          { x: destX, z: destZ },
          gridData,
          GRID_SIZE,
          useStore.getState().config, // MAURI: Pass config
          // Solo mostramos explorados del tramo actual para no saturar, o podríamos acumular
          (exploredNodes) => setExplored(exploredNodes)
        );

        if (result.path && result.path.length > 0) {
          fullPath = [...fullPath, ...result.path];
          fullExplored = [...fullExplored, ...result.explored];

          // Actualizar 'Start' para el siguiente tramo (último punto del path actual)
          const lastPoint = result.path[result.path.length - 1];
          // Calcular heading basado en los últimos puntos para mantener continuidad
          let newHeading = currentStart.heading;
          if (result.path.length >= 2) {
            const prevPoint = result.path[result.path.length - 2];
            // Math.atan2(x, z) porque en este sistema 0 es Norte (+Z) aparentemente, o hay que chequear.
            // En pathfinding.js: nextX = ... sin(theta), nextZ = ... cos(theta).
            // Entonces x = sin, z = cos.
            // tan(theta) = x / z. -> theta = atan2(x, z).
            newHeading = Math.atan2(lastPoint.x - prevPoint.x, lastPoint.z - prevPoint.z);
          }
          currentStart = { x: lastPoint.x, z: lastPoint.z, heading: newHeading };

        } else {
          console.warn(`No se pudo trazar ruta al destino intermedio: ${destKey}`);
          alert(`No se pudo llegar a ${dest.name || "destino"}. abortando itinerario.`);
          break;
        }
      }

      if (fullPath.length > 0) {
        setPath(fullPath);
        setExplored(fullExplored); // Quizás mostrar todo lo explorado al final
        setAutonomous(true);
        // setOpen(false);
        setShowItineraries(false);
      }

    } catch (e) {
      console.error(e);
      alert("Error calculando itinerario");
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

            {/* MAURI: Allow tool usage even if recording, except maybe Stop Car which conflicts with simple recording?
                Actually, the user wants to use "Destinations" while recording.
                So we remove the !isRecording check for the buttons, or specific ones.
             */}
            {(true) && ( // Removed !isRecording block restriction
              <>
                {/* HERRAMIENTAS BÁSICAS */}
                <button
                  onClick={() => {
                    setAutonomous(false);
                    useStore.getState().setThrottle(0);
                    useStore.getState().setSteering(0);
                    setOpen(false);
                  }}
                  style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: "white", textAlign: "left", color: "red", fontWeight: "bold" }}
                >
                  🛑 Detener Auto
                </button>

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
                    toggleSubmenu("construction");
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

            <button onClick={() => toggleSubmenu("destinations")} style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: showDestinations ? "#e6f7ff" : "white", textAlign: "left", fontWeight: "bold", color: "#007bff", display: "flex", justifyContent: "space-between", borderLeft: showDestinations ? "3px solid #007bff" : "none" }}>
              <span>📍 Destinos</span>
              <span>{showDestinations ? "▶" : "▶"}</span>
            </button>

            <button onClick={() => toggleSubmenu("itineraries")} style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: showItineraries ? "#f3e5f5" : "white", textAlign: "left", fontWeight: "bold", color: "#9c27b0", display: "flex", justifyContent: "space-between", borderLeft: showItineraries ? "3px solid #9c27b0" : "none" }}>
              <span>🗺️ Itinerarios</span>
              <span>{showItineraries ? "▶" : "▶"}</span>
            </button>

            <div style={{ borderTop: "1px solid #eee", margin: "5px 0" }}></div>
            <button onClick={() => { setShowScenarios(true); setOpen(false); }} style={{ padding: "10px 20px", border: "none", cursor: "pointer", background: "white", textAlign: "left" }}>
              💾 Escenarios
            </button>
            {/* Rutas was removed from here */}

            <div style={{ borderTop: "1px solid #eee", margin: "5px 0" }}></div>

            {/* GEAR ICON FOR SETTINGS (TOGGLE) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSubmenu("settings");
              }}
              style={{
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                background: showSettings ? "#f0f0f0" : "white",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderLeft: showSettings ? "4px solid #666" : "none"
              }}>
              <span>⚙️ Configuración</span>
              <span>{showSettings ? "▼" : "▶"}</span>
            </button>
          </div>

          {/* SUBMENÚ LATERAL DE CONFIGURACIÓN */}
          {showSettings && !isRecording && (
            <SettingsPanel onClose={() => setShowSettings(false)} />
          )}

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

          {/* SUBMENÚ LATERAL DE DESTINOS */}
          {showDestinations && ( // Allow viewing even if recording
            <div style={{
              background: "white", borderRadius: "8px", padding: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              minWidth: "200px", maxHeight: "400px", overflowY: "auto", border: "1px solid #ddd"
            }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9em", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>📍 Seleccionar Destino</h4>

              {/* BOTÓN PARA GUARDAR RUTA ACTUAL (SI HAY UNA) */}
              {currentPath && currentPath.length > 0 && (
                <div style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px dashed #ccc" }}>
                  <p style={{ fontSize: "0.8em", margin: "0 0 5px 0", color: "#666" }}>Ruta Actual ({currentPath.length} ptos)</p>
                  <button
                    onClick={() => {
                      const name = prompt("Nombre para la ruta actual:", "Ruta Calculada");
                      if (name) {
                        saveCurrentPath(name);
                        alert("Ruta guardada exitosamente.");
                      }
                    }}
                    style={{
                      width: "100%", padding: "8px", background: "#4caf50", color: "white",
                      border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85em"
                    }}
                  >
                    💾 Guardar Ruta Actual
                  </button>
                </div>
              )}

              {destinations.length === 0 && <p style={{ fontSize: "0.8em", color: "#999" }}>No hay destinos creados.</p>}
              {destinations.map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleAutoDrive(key)}
                  style={{
                    display: "block", width: "100%", padding: "8px", marginBottom: "5px",
                    border: "1px solid #eee", borderRadius: "5px", background: "#f8f9fa",
                    textAlign: "left", cursor: "pointer", fontSize: "0.9em"
                  }}
                >
                  {val.name || "Destino sin nombre"}
                </button>
              ))}

              {/* SECCIÓN RUTAS GUARDADAS */}
              <div style={{ borderTop: "1px solid #eee", margin: "10px 0 5px 0", paddingTop: "5px" }}></div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9em", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>📀 Rutas Guardadas</h4>

              {Object.keys(savedPaths).length === 0 && (
                <p style={{ fontSize: "0.8em", color: "#999", fontStyle: "italic" }}>No hay rutas.</p>
              )}

              {Object.keys(savedPaths).map((name) => (
                <div key={name} style={{ display: "flex", gap: "2px", marginBottom: "5px" }}>
                  <button
                    onClick={async () => {
                      // MAURI: Smart Route Loading (Approach + Execute)
                      // 1. Obtener ruta guardada (raw, sin transformar)
                      const savedPath = savedPaths[name];
                      if (!savedPath || savedPath.length === 0) return;

                      setIsCalculating(true);
                      setExplored([]);
                      setPath([]);

                      try {
                        // 2. Calcular Approach (Desde donde estoy hasta el inicio de la ruta grabada)
                        const { vehicleState } = useStore.getState();
                        const startPoint = savedPath[0];

                        const result = await findPathAsync(
                          { x: vehicleState.x, z: vehicleState.z, heading: vehicleState.heading },
                          { x: startPoint.x, z: startPoint.z }, // Ir al inicio de la grabación
                          gridData,
                          GRID_SIZE,
                          useStore.getState().config, // MAURI: Pass config
                          (exploredNodes) => setExplored(exploredNodes)
                        );

                        if (result.path) {
                          // 3. Fusionar Approach + Recorded Path
                          // El approach nos deja en startPoint. Luego concatenamos la grabación.
                          // Evitamos duplicar el punto de unión si está muy cerca.
                          const combinedPath = [...result.path];

                          const lastApproach = result.path[result.path.length - 1];
                          if (Math.hypot(lastApproach.x - startPoint.x, lastApproach.z - startPoint.z) < 0.1) {
                            combinedPath.push(...savedPath.slice(1));
                          } else {
                            combinedPath.push(...savedPath);
                          }

                          setPath(combinedPath);
                          setExplored(result.explored);
                          setTargetDestination({ name: `Ruta: ${name} (Con Aproximación)` });
                          setAutonomous(true);
                          setShowDestinations(false);
                        } else {
                          alert("No se pudo calcular una ruta de aproximación al inicio de la grabación.");
                        }
                      } catch (e) {
                        console.error(e);
                        alert("Error calculando aproximación.");
                      } finally {
                        setIsCalculating(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: "1px solid #eee",
                      borderRadius: "5px",
                      background: "#e8f5e9",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.9em",
                      color: "#2e7d32",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                    title={`Cargar ruta: ${name}`}
                  >
                    {name}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Borrar "${name}"?`)) useStore.getState().deleteRecordedPath(name);
                    }}
                    style={{ border: "none", background: "#ffebee", color: "red", cursor: "pointer", borderRadius: "5px", padding: "0 8px" }}
                    title="Borrar"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SUBMENÚ LATERAL DE ITINERARIOS */}
          {showItineraries && ( // Allow viewing even if recording
            <div style={{
              background: "white", borderRadius: "8px", padding: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              minWidth: "220px", maxHeight: "500px", overflowY: "auto", border: "1px solid #ddd"
            }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9em", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>🗺️ Crear Itinerario</h4>

              {/* 1. SELECCIÓN */}
              <div style={{ marginBottom: "15px" }}>
                <p style={{ fontSize: "0.8em", fontWeight: "bold", margin: "5px 0" }}>Agregar Destinos:</p>
                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px" }}>
                  {destinations.map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setItinerary([...itinerary, key])}
                      style={{
                        display: "flex", justifyContent: "space-between", width: "100%", padding: "5px",
                        border: "none", borderBottom: "1px solid #eee", background: "white",
                        textAlign: "left", cursor: "pointer", fontSize: "0.85em"
                      }}
                    >
                      <span>📍 {val.name || "Destino"}</span>
                      <span style={{ color: "green" }}>+</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. LISTA ACTUAL */}
              <div style={{ marginBottom: "15px" }}>
                <p style={{ fontSize: "0.8em", fontWeight: "bold", margin: "5px 0" }}>Ruta Actual:</p>
                {itinerary.length === 0 && <p style={{ fontSize: "0.8em", color: "#999", fontStyle: "italic" }}>Vacío...</p>}

                {itinerary.map((key, idx) => {
                  const destObj = gridData[key];
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "4px", background: "#f1f8e9", padding: "4px", borderRadius: "4px" }}>
                      <span style={{ fontSize: "0.8em", fontWeight: "bold", marginRight: "5px" }}>{idx + 1}.</span>
                      <span style={{ fontSize: "0.85em", flex: 1 }}>{destObj?.name || "Desconocido"}</span>
                      <button
                        onClick={() => {
                          const newIt = [...itinerary];
                          newIt.splice(idx, 1);
                          setItinerary(newIt);
                        }}
                        style={{ border: "none", background: "transparent", color: "red", cursor: "pointer", fontWeight: "bold" }}
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 3. ACCIONES */}
              <div style={{ display: "flex", gap: "5px" }}>
                <button
                  onClick={handleItineraryDrive}
                  disabled={itinerary.length === 0 || isCalculating}
                  style={{
                    flex: 1, padding: "8px", background: isCalculating ? "#ccc" : "#4caf50", color: "white",
                    border: "none", borderRadius: "5px", cursor: isCalculating ? "wait" : "pointer", fontWeight: "bold"
                  }}
                >
                  {isCalculating ? "Calculando..." : "▶ INICIAR"}
                </button>
                <button
                  onClick={() => setItinerary([])}
                  style={{ padding: "8px", background: "#f44336", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                  title="Borrar todo"
                >
                  🗑️
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      <ScenarioManager isOpen={showScenarios} onClose={() => setShowScenarios(false)} />
      <PathManager isOpen={showPaths} onClose={() => setShowPaths(false)} />

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div >
  );
}

// Componente interno para manejar el formulario de configuración
function SettingsPanel({ onClose }) {
  const config = useStore((state) => state.config);
  const saveConfig = useStore((state) => state.saveConfig);
  const [localConfig, setLocalConfig] = React.useState(config);

  // MAURI: Sync local state when store config changes (e.g. after fetchConfig)
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSave = () => {
    saveConfig(localConfig);
    alert("Configuración guardada en Backend.");
  };

  // Accordion state: 'objectives' | 'planner' | 'pilot'
  const [activeGroup, setActiveGroup] = useState("objectives");

  const toggleGroup = (group) => {
    setActiveGroup(activeGroup === group ? null : group);
  };

  const GroupHeader = ({ id, label, icon }) => (
    <div
      onClick={() => toggleGroup(id)}
      style={{
        margin: "5px 0",
        borderBottom: "1px solid #eee",
        fontSize: "0.85em",
        color: activeGroup === id ? "#007bff" : "#555",
        fontWeight: activeGroup === id ? "bold" : "normal",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 2px",
        background: activeGroup === id ? "#f8f9fa" : "transparent"
      }}
    >
      <span>{icon} {label}</span>
      <span>{activeGroup === id ? "▼" : "▶"}</span>
    </div>
  );

  return (
    <div style={{
      background: "white",
      borderRadius: "8px",
      padding: "15px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      minWidth: "250px",
      border: "1px solid #ddd",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95em", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>⚙️ Configuración Auto</h4>

      {/* GRUPO 1: GENERAL */}
      <GroupHeader id="objectives" label="Objetivos" icon="🎯" />
      {activeGroup === "objectives" && (
        <div style={{ paddingLeft: "5px" }}>
          <div>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Umbral Llegada (Normal):</label>
            <input type="number" step="0.1" name="arrival_threshold" value={localConfig.arrival_threshold} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
          <div style={{ marginTop: "8px" }}>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Umbral Maniobra (R/D):</label>
            <input type="number" step="0.1" name="maneuver_threshold" value={localConfig.maneuver_threshold} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
          <div style={{ marginTop: "8px" }}>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Umbral Curva:</label>
            <input type="number" step="0.1" name="curve_threshold" value={localConfig.curve_threshold || 1.5} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
        </div>
      )}

      {/* GRUPO 2: PLANEADOR DE RUTAS (A*) */}
      <GroupHeader id="planner" label="Planeador (A*)" icon="🧠" />
      {activeGroup === "planner" && (
        <div style={{ paddingLeft: "5px" }}>
          <div>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Peso Marcha Atrás:</label>
            <input type="number" step="1.0" name="backward_weight" value={localConfig.backward_weight || 30.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
          <div style={{ marginTop: "8px" }}>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Costo Giro:</label>
            <input type="number" step="1.0" name="steering_cost" value={localConfig.steering_cost || 20.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
          <div style={{ marginTop: "8px" }}>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Costo Cambios (D/R):</label>
            <input type="number" step="10.0" name="gear_switch_cost" value={localConfig.gear_switch_cost || 150.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
        </div>
      )}

      {/* GRUPO 3: CONTROLADOR (PILOTO) */}
      <GroupHeader id="pilot" label="Piloto Automático" icon="🏎️" />
      {activeGroup === "pilot" && (
        <div style={{ paddingLeft: "5px" }}>
          <div>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Distancia Visión (Lookahead):</label>
            <input type="number" step="0.1" name="lookahead_distance" value={localConfig.lookahead_distance || 2.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
          <div style={{ marginTop: "8px" }}>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Sensibilidad Volante (Kp):</label>
            <input type="number" step="0.5" name="steering_kp" value={localConfig.steering_kp || 5.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
          <div style={{ marginTop: "8px" }}>
            <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Velocidad Base:</label>
            <input type="number" step="0.1" name="base_speed" value={localConfig.base_speed || 0.4} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
        <button
          onClick={handleSave}
          style={{ flex: 1, padding: "8px", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          💾 Guardar
        </button>
        {/* Opción para ir al Login Page del Backend si se desea */}
        <button
          onClick={() => window.open("http://localhost:8000/login/", "_blank")}
          style={{ padding: "8px", background: "#333", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          title="Ir al Login"
        >
          🔑
        </button>
      </div>
    </div>
  );
}
