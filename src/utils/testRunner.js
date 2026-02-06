import { useStore } from "../store/useStore";
import { findPathAsync } from "./pathfinding";
import { buildTopology } from "./graphBuilder";
import { findMacroPath, findNearestGraphNode } from "./topologyPathfinder";

/**
 * Función encargada de iniciar un nuevo tramo de prueba aleatoria.
 */
export const startNextTestLeg = async () => {
    // 1. Obtener acceso al estado global FRESH
    const state = useStore.getState();
    const { gridData, GRID_SIZE, setPath, setExplored, setTargetDestination, setAutonomous, config, navGraph, setNavGraph } = state;

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

    // --- MACRO-RUTA (DIJKSTRA) ---
    let macroPath = null;
    if (currentGraph) {
        const startGraphNode = findNearestGraphNode(currentGraph, currentVacc.x, currentVacc.z);
        const endGraphNode = findNearestGraphNode(currentGraph, destX, destZ);

        if (startGraphNode && endGraphNode) {
            console.log(`[TEST] Macro-Ruta: ${startGraphNode.id} -> ${endGraphNode.id}`);
            const pathIds = findMacroPath(currentGraph, startGraphNode.id, endGraphNode.id);

            if (pathIds) {
                console.log("[TEST] Secuencia de Nodos:", pathIds);
                // Convertir IDs a objetos nodo reales
                macroPath = pathIds.map(id => currentGraph[id]);
            } else {
                console.warn("[TEST] No se encontró ruta en el grafo (posiblemente inconexos).");
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
            macroPath // <--- Pasamos la ruta topológica como guía
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
