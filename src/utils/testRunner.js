import { useStore } from "../store/useStore";
import { findPathAsync } from "./pathfinding";

/**
 * Función encargada de iniciar un nuevo tramo de prueba aleatoria.
 * Busca un destino disponible en el mapa y calcula la ruta hacia él desde la posición actual del vehículo.
 *
 * Flujo:
 * 1. Obtiene la lista de destinos del Global Store.
 * 2. Selecciona uno al azar.
 * 3. Obtiene la posición actual del vehículo.
 * 4. Invoca al algoritmo A* (findPathAsync) para calcular la ruta.
 * 5. Si tiene éxito, actualiza el Store con la nueva ruta y activa el modo autónomo.
 */
export const startNextTestLeg = async () => {
    // 1. Obtener acceso al estado global FRESH (al momento de ejecución)
    const state = useStore.getState();
    const { gridData, GRID_SIZE, setPath, setExplored, setTargetDestination, setAutonomous, config } = state;

    // 2. Filtrar objetos del mapa que sean de tipo "destination" (Destinos marcados por el usuario)
    const destinations = Object.entries(gridData).filter(
        ([k, v]) => v.type === "destination"
    );

    // Si no hay destinos, no podemos hacer nada.
    if (destinations.length === 0) {
        console.warn("[TEST] No hay destinos definidos en el mapa.");
        return;
    }

    // 3. Elegir uno al azar
    // Math.random() da un valor entre 0 y 1. Multiplicamos por length y flooreamos para índice de array.
    const randomIdx = Math.floor(Math.random() * destinations.length);
    const [destKey, destVal] = destinations[randomIdx];

    // destKey es un string "x,z". Lo parseamos a números.
    const [destX, destZ] = destKey.split(",").map(Number);

    console.log(`[TEST] Iniciando tramo hacia: ${destVal.name || "Destino"} (${destX}, ${destZ})`);

    // 4. Obtener posición actual del vehículo para usar como punto de inicio (Start Node)
    const currentVacc = state.vehicleState;

    try {
        // 5. Llamada asíncrona al Pathfinding (A*)
        // Le pasamos la configuración actual (config) para que respete pesos y penalizaciones.
        const result = await findPathAsync(
            { x: currentVacc.x, z: currentVacc.z, heading: currentVacc.heading }, // Origen
            { x: destX, z: destZ }, // Destino
            gridData,               // Mapa de obstáculos
            GRID_SIZE,              // Tamaño de celda
            config,                 // Configuración (Pesos, Costos)
            (exploredNodes) => setExplored(exploredNodes) // Callback para visuailzar nodos explorados (debug)
        );

        // 6. Procesar Resultado
        if (result.path && result.path.length > 0) {
            console.log("[TEST] Ruta calculada con éxito. Activando piloto.");

            // Guardar la ruta en el Store
            setPath(result.path);
            // Guardar nodos explorados (para ver nube roja en editor)
            setExplored(result.explored);
            // Establecer el destino actual (para mostrar nombre en HUD)
            setTargetDestination(destVal);
            // ENCENDER EL MODO AUTÓNOMO
            setAutonomous(true);
        } else {
            console.error("[TEST] Falló el cálculo de ruta (no se encontró camino). Reintentando en breve...");
            // Opcional: Podríamos reintentar recursivamente, pero cuidado con el stack overflow infinito.
        }
    } catch (e) {
        console.error("[TEST] Error crítico durante cálculo de ruta:", e);
    }
};
