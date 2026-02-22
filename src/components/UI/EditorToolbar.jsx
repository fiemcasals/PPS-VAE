import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { ScenarioManager } from "./ScenarioManager";
import { PathManager } from "./PathManager";
// Importamos la versión ASYNC del buscador para no congelar la pantalla
import { findPathAsync } from "../../utils/pathfinding";

// Importamos herramientas del Grafo Topológico
import { buildTopology } from "../../utils/graphBuilder";
import { computeDualGradient, findNearestGraphNode } from "../../utils/topologyPathfinder";

export function EditorToolbar() {
  const [open, setOpen] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  const [showDestinations, setShowDestinations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Acciones y estado del Store
  const selectedTool = useStore((state) => state.selectedTool);
  const setTool = useStore((state) => state.setTool);
  // MAURI: Missing hooks for detection toggle
  const isDetectionEnabled = useStore((state) => state.isDetectionEnabled);
  const setDetectionEnabled = useStore((state) => state.setDetectionEnabled);

  const gridData = useStore((state) => state.gridData);
  const GRID_SIZE = useStore((state) => state.GRID_SIZE);
  const setPath = useStore((state) => state.setPath);
  const setExplored = useStore((state) => state.setExplored);
  const setAutonomous = useStore((state) => state.setAutonomous);
  const setTargetDestination = useStore((state) => state.setTargetDestination);
  const setTestConfig = useStore((state) => state.setTestConfig);
  // Store navigation graph
  const navGraph = useStore((state) => state.navGraph);
  const setNavGraph = useStore((state) => state.setNavGraph);
  const setActiveMacroPath = useStore((state) => state.setActiveMacroPath);

  // --- RECORDING STATE ---
  const isRecording = useStore((state) => state.isRecording);
  const setRecording = useStore((state) => state.setRecording);
  const saveRecordedPath = useStore((state) => state.saveRecordedPath);
  const savedPaths = useStore((state) => state.savedPaths);
  const loadRecordedPath = useStore((state) => state.loadRecordedPath);
  const deleteRecordedPath = useStore((state) => state.deleteRecordedPath);
  const saveCurrentPath = useStore((state) => state.saveCurrentPath);
  const currentPath = useStore((state) => state.currentPath);

  // Submenú de construcciones
  const [showConstruction, setShowConstruction] = useState(false);

  const [showItineraries, setShowItineraries] = useState(false);
  const [itinerary, setItinerary] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState("default");

  // MAURI: Helper para saltar puntos iniciales demasiado cercanos
  const skipPointsNearStart = (path, pos, minDistance = 2.5) => {
    if (!path || path.length === 0) return [];
    let firstValidIndex = 0;
    for (let i = 0; i < path.length; i++) {
      const dist = Math.hypot(path[i].x - pos.x, path[i].z - pos.z);
      if (dist >= minDistance) {
        firstValidIndex = i;
        break;
      }
      // Si llegamos al final y ninguno cumple, devolvemos el último para no quedar vacíos
      if (i === path.length - 1) firstValidIndex = i;
    }
    return path.slice(firstValidIndex);
  };

  // Helper to ensure exclusive submenu opening
  const toggleSubmenu = (menuName) => {
    const states = {
      construction: [showConstruction, setShowConstruction],
      destinations: [showDestinations, setShowDestinations],
      itineraries: [showItineraries, setShowItineraries],
      settings: [showSettings, setShowSettings]
    };

    const [currentVal, setLimit] = states[menuName];

    if (!currentVal) {
      Object.keys(states).forEach(key => {
        if (key !== menuName) states[key][1](false);
      });
    }
    setLimit(!currentVal);
  };

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

  // MAURI: Helper para obtener/construir el grafo
  const getOrBuildGraph = () => {
    // Si ya existe (cache), lo usamos para que los nodos NO se muevan al recalcular ruta.
    if (navGraph) return navGraph;

    // Si no existe, construimos uno nuevo.
    const graph = buildTopology(gridData, GRID_SIZE);

    // IMPORTANTE: Actualizar el store para que el Visualizador vea EL MISMO grafo
    // Usamos setTimeout para no bloquear el render actual si esto se llama durante un evento
    setTimeout(() => setNavGraph(graph), 0);

    return graph;
  };

  // MAURI: Reaccionar a cambios en el mapa para mantener la visualización actualizada
  // (Opcional, pero ayuda a que se vean los puntos rojos al editar)
  React.useEffect(() => {
    // Debounce para no quemar CPU mientras arrastra
    const timer = setTimeout(() => {
      const graph = buildTopology(gridData, GRID_SIZE);
      setNavGraph(graph);
    }, 500);
    return () => clearTimeout(timer);
  }, [gridData, GRID_SIZE, setNavGraph]);

  const handleAutoDrive = async (destKey) => {
    if (isCalculating) return;
    const dest = gridData[destKey];
    if (!dest) return;

    const [destX, destZ] = destKey.split(",").map(Number);
    const { vehicleState } = useStore.getState();

    setExplored([]);
    setPath([]);
    useStore.getState().setActiveMacroPath([]); // Clear previous macro path
    setIsCalculating(true);

    // 1. Construir/Obtener Grafo Topológico
    const graph = getOrBuildGraph();

    // 2. Encontrar nodos de inicio y fin en el grafo
    const startNode = findNearestGraphNode(graph, vehicleState.x, vehicleState.z);

    // MAURI FIX: Resolver destino usando Nearest también, porque la simplificación cambia las claves
    const endNode = findNearestGraphNode(graph, destX, destZ);

    // MAURI: Logic change - Sequential Routing
    // Instead of A* with Heuristic, we will do: Start -> Node1 -> Node2 ... -> Destination
    let fullPath = [];
    let fullExplored = [];

    try {
      setExplored([]);

      // 1. Identificar Nodos de Inicio y Fin en el Grafo
      const startNode = findNearestGraphNode(graph, vehicleState.x, vehicleState.z);
      // El EndNode lo sacamos directamente del ID del destino si es posible, o buscamos el más cercano
      const endNode = findNearestGraphNode(graph, destX, destZ);

      if (!startNode || !endNode) {
        alert("No se pudo conectar con la red vial (Grafo).");
        setIsCalculating(false);
        return;
      }

      console.log(`[Editor] Calculating Gradient Field from ${endNode.id}...`);

      // 2. Calcular DOBLE GRADIENTE
      // - startMap: Cosine (Visual) -> Distancia desde Origen
      // - endMap: Heuristic (Nav) -> Distancia al Destino
      const { startMap, endMap } = computeDualGradient(graph, startNode.id, endNode.id);

      if (!endMap || endMap[startNode.id] === Infinity) {
        alert("Destino inalcanzable (Isla desconectada).");
        setIsCalculating(false);
        return;
      }

      console.log(`[Editor] Gradient calculated.`);

      // 3. COMBINAR GRADIENTES PONDERADOS
      // Para generar una pendiente "cuesta abajo" hacia el destino:
      // Weight(End) > Weight(Start).
      // Costo = Start + (End * 2.5).
      // - En camino óptimo: Start sube 1, End baja 1. Neto: Baja 1.5. (Pendiente suave).
      // - En desvío/callejón: Start sube 1, End sube 1. Neto: Sube 3.5. (Pared vertical).
      // Esto crea un "río" que fluye hacia el destino, con orillas muy empinadas.
      const weightedMap = {};
      Object.keys(graph).forEach(key => {
        const s = startMap[key] || 0;
        const e = endMap[key] || Infinity;
        if (e === Infinity) {
          weightedMap[key] = Infinity;
        } else {
          weightedMap[key] = s + (e * 5.0); // MAURI: Stronger Gradient 5.0
        }
      });

      // Visualización: Pasar { start, end } para los textos pequeños, y usar weightedMap para lógica interna?
      // No, activeGradient soporta { start, end, total: weightedMap } si lo modificamos.
      // O simplemente pasamos { start, end } y dejamos que el visualizador calcule el total ponderado.
      // Vamos a pasar `weightedMap` como 'total' explícito en un objeto extendido.
      useStore.getState().setActiveGradient({
        start: startMap,
        end: endMap,
        total: weightedMap
      });

      // 4. Ejecutar A* Guiado por COSTO PONDERADO (weightedMap)
      const result = await findPathAsync(
        { x: vehicleState.x, z: vehicleState.z, heading: vehicleState.heading },
        { x: destX, z: destZ },
        gridData,
        GRID_SIZE,
        (exploredNodes) => setExplored(exploredNodes),
        { graph, gradientMap: weightedMap }
      );

      if (result.path && result.path.length > 0) {
        // MAURI: Aggressive skip (remove points within 2.5m)
        const smoothedPath = skipPointsNearStart(result.path, { x: vehicleState.x, z: vehicleState.z }, 2.5);
        setPath(smoothedPath);
        setExplored(result.explored);
        setTargetDestination(dest);
        setAutonomous(true);
      } else {
        alert("No se encontró ruta (A* falló incluso con guía).");
      }
    } catch (e) {
      console.error(e);
      alert("Error en sistema de navegación.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleItineraryDrive = async () => {
    if (isCalculating || itinerary.length === 0) return;
    // MAURI: Close menus immediately for feedback
    setOpen(false);
    setShowDestinations(false);
    setIsCalculating(true);
    setExplored([]);
    setPath([]);

    const { vehicleState } = useStore.getState();
    let currentStart = { x: vehicleState.x, z: vehicleState.z, heading: vehicleState.heading };

    let fullPath = [];
    let fullExplored = [];

    // Construir grafo una vez para todo el itinerario
    const graph = getOrBuildGraph();

    try {
      for (let i = 0; i < itinerary.length; i++) {
        const destKey = itinerary[i];
        const dest = gridData[destKey];
        if (!dest) continue;

        const [destX, destZ] = destKey.split(",").map(Number);

        // --- LÓGICA MACRO PARA CADA TRAMO ---
        const startNode = findNearestGraphNode(graph, currentStart.x, currentStart.z);
        // const endNodeId = destKey; // destKey might not be exact node ID if simplified graph
        const endNode = findNearestGraphNode(graph, destX, destZ);

        let weightedMap = null;

        if (startNode && endNode) {
          // MAURI: Use Dual Gradient (Same as handleAutoDrive)
          const { startMap, endMap } = computeDualGradient(graph, startNode.id, endNode.id);

          if (endMap && endMap[startNode.id] !== Infinity) {
            weightedMap = {};
            Object.keys(graph).forEach(key => {
              const s = startMap[key] || 0;
              const e = endMap[key] || Infinity;
              if (e === Infinity) {
                weightedMap[key] = Infinity;
              } else {
                weightedMap[key] = s + (e * 5.0); // Strong gradient
              }
            });

            // Update Visualization for this leg (can overwrite previous)
            useStore.getState().setActiveGradient({
              start: startMap,
              end: endMap,
              total: weightedMap
            });

            // MAURI DEBUG
            const wKeys = Object.keys(weightedMap);
            if (wKeys.length > 0) {
              console.log(`[Itinerary] WeightedMap Generated. Size: ${wKeys.length}. Sample: ${wKeys[0]} = ${weightedMap[wKeys[0]]}`);
            } else {
              console.warn("[Itinerary] WeightedMap is EMPTY!");
            }
          }
        }
        // ------------------------------------

        const result = await findPathAsync(
          currentStart,
          { x: destX, z: destZ },
          gridData,
          GRID_SIZE,
          (exploredNodes) => setExplored(exploredNodes),
          { graph, gradientMap: weightedMap } // <--- MAURI: Pass correct context object
        );

        if (result.path && result.path.length > 0) {
          // MAURI: Skip first point of EACH leg to avoid duplication at joins
          // but allow closer targets in intermediate points.
          // However, for the VERY FIRST point of the itinerary, we apply the 2.5m margin.
          const isFirstLeg = i === 0;
          const legPath = isFirstLeg
            ? skipPointsNearStart(result.path, currentStart, 2.5)
            : result.path.slice(1);

          fullPath = [...fullPath, ...legPath];
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

  const handleLoadAbsolute = async (name) => {
    const savedPaths = useStore.getState().savedPaths;
    const rawPath = savedPaths[name];
    if (!rawPath || rawPath.length === 0) return;

    // MAURI: Sanitize path - Eliminate points at exactly (0,0) that could be recording artifacts
    // This prevents the car from trying to "go back to origin" before starting the real path.
    const path = rawPath.filter(pt => Math.abs(pt.x) > 0.001 || Math.abs(pt.z) > 0.001);
    if (path.length === 0) {
      console.warn(`[Playback] Path '${name}' is empty after origin-filtering.`);
      return;
    }

    // 1. Get Start Node of the Path
    const startPoint = path[0];
    const { vehicleState } = useStore.getState();
    const currentPos = { x: vehicleState.x, z: vehicleState.z };

    // 2. Compute Gradient to Start Point (So Approach uses it!)
    const startNode = findNearestGraphNode(pathfindingGraph, currentPos.x, currentPos.z);
    const endNode = findNearestGraphNode(pathfindingGraph, startPoint.x, startPoint.z);

    let weightedMap = null;
    if (startNode && endNode) {
      console.log(`[Playback] Computing Gradient from ${startNode.id} to Path Start ${endNode.id}`);
      const { startMap, endMap } = computeDualGradient(pathfindingGraph, startNode.id, endNode.id);

      // Visualize this gradient too!
      useStore.getState().setActiveGradient({
        start: startMap,
        end: endMap,
        total: null // We only care about the flow to start
      });

      // Create weighted map for A*
      if (endMap && endMap[startNode.id] !== Infinity) {
        weightedMap = {};
        Object.keys(pathfindingGraph).forEach(key => {
          const s = startMap[key] || 0;
          const e = endMap[key] || Infinity;
          if (e !== Infinity) {
            // Dominant Gradient to Path Start
            weightedMap[key] = s + (e * 5.0);
          }
        });
      }
    }

    // 3. Calculate Approach Path (A*)
    const cellSize = useStore.getState().GRID_SIZE;
    const gridData = useStore.getState().gridData;
    const distToStart = Math.hypot(currentPos.x - startPoint.x, currentPos.z - startPoint.z);

    let approachPath = null;
    if (distToStart > 1.2) {
      console.log("[Playback] Calculating Approach Path...");
      const result = await findPathAsync(
        { x: currentPos.x, z: currentPos.z, heading: vehicleState.heading },
        { x: startPoint.x, z: startPoint.z },
        gridData,
        cellSize,
        null, // No progress callback
        { graph: pathfindingGraph, gradientMap: weightedMap } // Pass the gradient!
      );
      approachPath = result.path;
    } else {
      console.log("[Playback] Already at start point (dist < 1.2m). Skipping approach.");
    }

    // 3.5 Refresh current position after async calculation (Car might have moved!)
    const { vehicleState: latestVehicle } = useStore.getState();
    const latestPos = { x: latestVehicle.x, z: latestVehicle.z };

    let finalPath = [];
    if (approachPath && approachPath.length > 0) {
      console.log(`[Playback] Approach Path found: ${approachPath.length} points.`);
      // Concatenate: Approach + Recorded
      const combined = [...approachPath, ...path.slice(1)];
      // MAURI: Use latest position for accurate skipping
      finalPath = skipPointsNearStart(combined, latestPos, 1.2);
    } else {
      if (distToStart < 2.0) {
        console.warn("[Playback] Very close to start. Using recorded path with 1.2m skip.");
        finalPath = skipPointsNearStart(path, latestPos, 1.2);
      } else {
        console.warn("[Playback] No Approach Path found and not close. Using raw path.");
        finalPath = [...path];
      }
    }

    // 4. Set Path and Go
    if (finalPath.length > 0) {
      console.log(`[Playback] Final Path ready with ${finalPath.length} points.`);
      console.log(`[Playback] Vehicle Pos: {x: ${currentPos.x.toFixed(2)}, z: ${currentPos.z.toFixed(2)}}`);
      console.log(`[Playback] First Path Point: {x: ${finalPath[0].x.toFixed(2)}, z: ${finalPath[0].z.toFixed(2)}}`);
      if (finalPath.length > 1) {
        console.log(`[Playback] Second Path Point: {x: ${finalPath[1].x.toFixed(2)}, z: ${finalPath[1].z.toFixed(2)}}`);
      }
      useStore.getState().setPath(finalPath);
      useStore.getState().setTargetDestination({ name: `Playback: ${name}` });
      useStore.getState().setAutonomous(true);
      setShowPaths(false); // Close modal
    } else {
      console.error("[Playback] Resulting path is empty!");
    }
  };

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
            {/* SECCIÓN DETECCIÓN (Solicitada dentro del Lápiz) */}
            <button
              onClick={() => {
                setDetectionEnabled(!isDetectionEnabled);
                // setOpen(false); // Mantener abierto para ver el cambio de color
              }}
              style={{
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                background: "white",
                color: isDetectionEnabled ? "green" : "grey",
                fontWeight: "bold",
                textAlign: "left",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "1.2em" }}>👁️</span>
              {isDetectionEnabled ? "Detección ON" : "Detección OFF"}
            </button>

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
      <PathManager
        isOpen={showPaths}
        onClose={() => setShowPaths(false)}
        onLoadAbsolute={handleLoadAbsolute}
      />

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

// Componente interno reutilizable para el header de grupo
const GroupHeader = ({ id, label, icon, activeGroup, toggleGroup }) => (
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
    <span>{activeGroup === id ? "▶" : "▷"}</span>
  </div>
);

// Componente interno para manejar el formulario de configuración
function SettingsPanel({ onClose }) {
  const config = useStore((state) => state.config);
  const saveConfig = useStore((state) => state.saveConfig);
  const isDetectionEnabled = useStore((state) => state.isDetectionEnabled);
  const setDetectionEnabled = useStore((state) => state.setDetectionEnabled);
  const [localConfig, setLocalConfig] = React.useState(config);

  // MAURI: Sync local state when store config changes (e.g. after fetchConfig)
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string or intermediate states (like "0.")
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Parse values back to numbers before saving
    const configToSave = {};
    for (const key in localConfig) {
      const val = localConfig[key];
      // Keep booleans as is, parse strings to float if they are numbers
      if (typeof val === 'boolean') {
        configToSave[key] = val;
      } else if (!isNaN(parseFloat(val))) {
        configToSave[key] = parseFloat(val);
      } else {
        configToSave[key] = val;
      }
    }
    saveConfig(configToSave);
    alert("Configuración guardada en Backend.");
  };

  // Accordion state: 'objectives' | 'planner' | 'pilot'
  const [activeGroup, setActiveGroup] = useState(null);

  const toggleGroup = (group) => {
    setActiveGroup(activeGroup === group ? null : group);
  };

  return (
    <div style={{
      position: "relative", // Needed for absolute positioning context
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

      {/* Main List - Headers Only */}
      <GroupHeader id="vehicle" label="Vehículo (Medidas)" icon="🚗" activeGroup={activeGroup} toggleGroup={toggleGroup} />
      <GroupHeader id="objectives" label="Objetivos" icon="🎯" activeGroup={activeGroup} toggleGroup={toggleGroup} />
      <GroupHeader id="planner" label="Planeador (A*)" icon="🧠" activeGroup={activeGroup} toggleGroup={toggleGroup} />
      <GroupHeader id="pilot" label="Piloto Automático" icon="🏎️" activeGroup={activeGroup} toggleGroup={toggleGroup} />
      <GroupHeader id="visualization" label="Visualización" icon="👁️" activeGroup={activeGroup} toggleGroup={toggleGroup} />

      {/* Footer Buttons (Always Visible in Main Panel) */}
      <div style={{ display: "flex", gap: "5px", marginTop: "auto", paddingTop: "10px", borderTop: "1px solid #eee" }}>
        <button
          onClick={handleSave}
          style={{ flex: 1, padding: "8px", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          💾 Guardar
        </button>
        <button
          onClick={() => window.open("/", "_blank")}
          style={{ padding: "8px", background: "#333", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          title="Ir al Login"
        >
          🔑
        </button>
      </div>

      {/* Side Panel - Content */}
      {activeGroup && (
        <div style={{
          position: "absolute",
          left: "100%", // Anchored to the right edge
          top: 0,
          marginLeft: "10px", // Spacing from main panel
          background: "white",
          padding: "15px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          border: "1px solid #ddd",
          width: "300px",
          zIndex: 1000,
          maxHeight: "80vh",
          overflowY: "auto"
        }}>
          {/* GRUPO 0: VEHÍCULO */}
          {activeGroup === "vehicle" && (
            <div>
              <h5 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #eee" }}>🚗 Vehículo</h5>
              <div>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Ancho (m):</label>
                <input type="number" step="0.1" name="vehicle_width" value={localConfig.vehicle_width || 1.5} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Largo (m):</label>
                <input type="number" step="0.1" name="vehicle_length" value={localConfig.vehicle_length || 3.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
            </div>
          )}

          {/* GRUPO 1: OBJETIVOS */}
          {activeGroup === "objectives" && (
            <div>
              <h5 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #eee" }}>🎯 Objetivos de Llegada</h5>
              <div>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Umbral Camino Normal:</label>
                <input type="number" step="0.1" name="arrival_threshold" value={localConfig.arrival_threshold} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Umbral en Curvas:</label>
                <input type="number" step="0.1" name="arrival_threshold_curve" value={localConfig.arrival_threshold_curve} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Umbral Cambio Marcha:</label>
                <input type="number" step="0.1" name="arrival_threshold_gear" value={localConfig.arrival_threshold_gear} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
            </div>
          )}

          {/* GRUPO 2: PLANEADOR */}
          {activeGroup === "planner" && (
            <div>
              <h5 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #eee" }}>🧠 A* Planner</h5>
              <div>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Margen Obstáculos (Seguridad):</label>
                <input type="number" step="0.1" name="collision_margin" value={localConfig.collision_margin} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Peso Caminos (Gradient):</label>
                <input type="number" step="0.1" name="gradient_weight" value={localConfig.gradient_weight} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Paso A* (Step Size):</label>
                <input type="number" step="0.1" name="step_size" value={localConfig.step_size} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Peso Distancia (Heuristic):</label>
                <input type="number" step="0.1" name="base_heuristic_weight" value={localConfig.base_heuristic_weight} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Límite Iteraciones:</label>
                <input type="number" step="1000" name="debug_iter_limit" value={localConfig.debug_iter_limit} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Penalización Densidad (Exploration):</label>
                <input type="number" step="0.1" name="density_weight" value={localConfig.density_weight} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px", borderTop: "1px dashed #ccc", paddingTop: "5px" }}></div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Peso Marcha Atrás:</label>
                <input type="number" step="0.1" name="backward_weight" value={localConfig.backward_weight} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Costo Giro:</label>
                <input type="number" step="0.1" name="steering_cost" value={localConfig.steering_cost} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Costo Brusquedad (Smoothness):</label>
                <input type="number" step="0.1" name="steering_change_cost" value={localConfig.steering_change_cost} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Costo Cambios (D/R):</label>
                <input type="number" step="0.1" name="gear_switch_cost" value={localConfig.gear_switch_cost} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
            </div>
          )}

          {/* GRUPO 3: PILOTO */}
          {activeGroup === "pilot" && (
            <div>
              <h5 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #eee" }}>🏎️ Piloto Automático</h5>
              <div>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Distancia Visión (Lookahead):</label>
                <input type="number" step="0.1" name="lookahead_distance" value={localConfig.lookahead_distance || 2.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "block", marginBottom: "3px" }}>Sensibilidad Volante (Kp):</label>
                <input type="number" step="0.5" name="steering_kp" value={localConfig.steering_kp || 5.0} onChange={handleChange} style={{ width: "100%", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "0.85em", display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span>Velocidad Base:</span>
                  <span style={{ fontWeight: "bold", color: "#007bff" }}>{localConfig.base_speed?.toFixed(2)}</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "0.8em" }}>🐢</span>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    name="base_speed"
                    value={localConfig.base_speed || 0.4}
                    onChange={handleChange}
                    style={{ flex: 1, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.8em" }}>🐇</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  name="base_speed"
                  value={localConfig.base_speed || 0.4}
                  onChange={handleChange}
                  style={{ width: "100%", marginTop: "5px", padding: "5px", border: "1px solid #ccc", borderRadius: "4px", textAlign: "center" }}
                />
              </div>
            </div>
          )}

          {/* GRUPO 4: VISUALIZACIÓN */}
          {activeGroup === "visualization" && (
            <div>
              <h5 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #eee" }}>👁️ Visualización</h5>
              <div style={{ marginBottom: "8px", display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="show_graph_debug"
                  checked={localConfig.show_graph_debug !== false}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, show_graph_debug: e.target.checked }))}
                  style={{ transform: "scale(1.2)", marginRight: "8px" }}
                />
                <label style={{ fontSize: "0.85em" }}>Mostrar Nodos (Grafo)</label>
              </div>
              <div style={{ marginBottom: "8px", display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="show_path_debug"
                  checked={localConfig.show_path_debug !== false}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, show_path_debug: e.target.checked }))}
                  style={{ transform: "scale(1.2)", marginRight: "8px" }}
                />
                <label style={{ fontSize: "0.85em" }}>Mostrar Recorrido</label>
              </div>
              <div style={{ marginBottom: "8px", display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="show_target_debug"
                  checked={localConfig.show_target_debug !== false}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, show_target_debug: e.target.checked }))}
                  style={{ transform: "scale(1.2)", marginRight: "8px" }}
                />
                <label style={{ fontSize: "0.85em" }}>Mostrar Target (Bola Azul)</label>
              </div>
            </div>
          )}
        </div>
      )}



    </div>
  );
}
