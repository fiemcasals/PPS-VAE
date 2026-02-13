import { useStore } from "../store/useStore";
import { findPathAsync } from "./pathfinding";
import { buildTopology } from "./graphBuilder";
import { computeDualGradient, findNearestGraphNode } from "./topologyPathfinder";

/**
 * Función encargada de iniciar un nuevo tramo de prueba aleatoria.
 */
export const startNextTestLeg = async () => {
    // 1. Obtener acceso al estado global FRESH
    const state = useStore.getState();
    const { gridData, GRID_SIZE, setPath, setExplored, setTargetDestination, setAutonomous, config, navGraph, setNavGraph, setActiveMacroPath } = state;

    // --- TOPOLOGÍA (GRAFO) ---
    // Si no existe el grafo (o si se quiere refrescar), lo construimos.
    let currentGraph = navGraph;
    // Si no hay grafo o está vacío, lo construimos ahora (Lazy Load)
    if (!currentGraph || Object.keys(currentGraph).length === 0) {
        if (Object.keys(gridData).length > 0) {
            console.log("[TEST] Construyendo Grafo Topológico...");
            currentGraph = buildTopology(gridData, GRID_SIZE);
            setNavGraph(currentGraph);
        }
    }

    // 2. Filtrar destinos
    const destinations = Object.entries(gridData).filter(
        ([k, v]) => v.type === "destination"
    );

    if (destinations.length === 0) {
        console.warn("[TEST] No hay destinos definidos.");
        return;
    }

    // 3. Elegir destino al azar
    const randomIdx = Math.floor(Math.random() * destinations.length);
    const [destKey, destVal] = destinations[randomIdx];
    const [destX, destZ] = destKey.split(",").map(Number);

    console.log(`[TEST] Iniciando tramo hacia: ${destVal.name || "Destino"} (${destX}, ${destZ})`);

    // 4. Obtener posición actual del vehículo
    const currentVacc = state.vehicleState;

    // --- GRADIENTE TOPOLÓGICO (DIJKSTRA) ---
    let macroContext = null;

    // Limpiar visualización anterior
    if (state.setActiveGradient) state.setActiveGradient({});

    if (currentGraph) {
        const startGraphNode = findNearestGraphNode(currentGraph, currentVacc.x, currentVacc.z);
        const endGraphNode = findNearestGraphNode(currentGraph, destX, destZ);

        if (startGraphNode && endGraphNode) {
            console.log(`[TEST] Calculando Gradiente: ${startGraphNode.id} -> ${endGraphNode.id}`);

            // Calcular Doble Gradiente
            try {
                const { startMap, endMap } = computeDualGradient(currentGraph, startGraphNode.id, endGraphNode.id);

                if (endMap && endMap[startGraphNode.id] !== Infinity) {
                    console.log("[TEST] Gradiente calculado con éxito.");

                    // Visualizar: StartMap (Distancia desde origen)
                    if (state.setActiveGradient) {
                        state.setActiveGradient(startMap);
                    }

                    // Contexto para A*: EndMap (Distancia al destino)
                    macroContext = {
                        graph: currentGraph,
                        gradientMap: endMap
                    };
                } else {
                    console.warn("[TEST] No se encontró ruta en el grafo (posiblemente inconexos).");
                }
            } catch (err) {
                console.error("[TEST] Error calculando gradiente:", err);
            }
        }
    }

    try {
        // 5. Llamada asíncrona al Pathfinding (A*)
        const result = await findPathAsync(
            { x: currentVacc.x, z: currentVacc.z, heading: currentVacc.heading },
            { x: destX, z: destZ },
            gridData,
            GRID_SIZE,
            config,
            (exploredNodes) => setExplored(exploredNodes),
            macroContext // <--- Pasamos el contexto de gradiente
        );

        // 6. Procesar Resultado
        if (result.path && result.path.length > 0) {
            console.log("[TEST] Ruta A* calculada con éxito.");
            setPath(result.path);
            setExplored(result.explored);
            setTargetDestination(destVal);
            setAutonomous(true);
        } else {
            console.error("[TEST] Falló el cálculo de ruta A*.");
        }
    } catch (e) {
        console.error("[TEST] Error crítico:", e);
    }
};
