/**
 * graphBuilder.js
 * 
 * Módulo encargado de construir el Grafo Macro (Puntos Rojos).
 * Genera nodos dispersos sobre la red vial y los conecta si son alcanzables.
 */

export const buildTopology = (gridData, gridSize) => {
    console.time("BuildTopology");

    // 1. Identificar Celdas Candidatas (Carreteras y Destinos)
    const roadCells = [];
    const destinations = [];

    Object.entries(gridData).forEach(([key, cell]) => {
        const [x, z] = key.split(',').map(Number);
        if (cell.type === 'destination') {
            destinations.push({ id: key, x, z, type: 'destination' });
        } else if (cell.type === 'road') {
            roadCells.push({ id: key, x, z, type: 'road' });
        }
    });

    // 2. Generar Nodos Macro (Sampling)
    // - Los destinos SIEMPRE son nodos.
    // - Las carreteras se muestrean con una distancia mínima (Radio de exclusión).
    const macroNodes = {}; // Map: id -> { id, x, z, type, neighbors: [] }

    // Agregar Destinos primero
    destinations.forEach(d => {
        macroNodes[d.id] = { ...d, neighbors: [] };
    });

    // Configuración de Densidad
    // Radio de exclusión: Qué tan separados queremos los puntos rojos (aprox 20-30 metros)
    // GridSize suele ser ~2m. 15 celdas = 30 metros.
    const SEPARATION_RADIUS = gridSize * 3;
    const SEPARATION_SQ = SEPARATION_RADIUS ** 2;

    // Barajar carreteras para sampling aleatorio (Poisson-ish)
    // MAURI: Reemplazamos shuffle puro por un shuffle ponderado por "Centralidad".
    // 1. Calculamos "Centralidad": Cuántos vecinos tiene que TAMBIÉN son carretera.
    // Esto prioriza celdas en el centro de la calle (lejos de los bordes).
    roadCells.forEach(cell => {
        let centralityScore = 0;
        // Kernel de 3x3 o 5x5 alrededor de la celda
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                if (dx === 0 && dz === 0) continue;
                const nk = `${cell.x + dx * gridSize},${cell.z + dz * gridSize}`;
                const neighbor = gridData[nk];
                if (neighbor && (neighbor.type === 'road' || neighbor.type === 'destination')) {
                    centralityScore++;
                }
            }
        }
        cell.score = centralityScore;
    });

    // 2. Ordenamos por Score Descendente (Los más centrales primero)
    // Agregamos un poco de ruido aleatorio para que no sea siempre idéntico el grafo
    roadCells.sort((a, b) => (b.score + Math.random()) - (a.score + Math.random()));

    roadCells.forEach(cell => {
        // Verificar distancia con nodos ya existentes
        let tooClose = false;
        for (const existingId in macroNodes) {
            const existing = macroNodes[existingId];
            const d2 = (cell.x - existing.x) ** 2 + (cell.z - existing.z) ** 2;
            if (d2 < SEPARATION_SQ) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            macroNodes[cell.id] = { ...cell, neighbors: [] };
        }
    });

    console.log(`[Topología] Nodos Macro generados: ${Object.keys(macroNodes).length}`);

    // 3. Conectar Nodos (Construir Aristas)
    // Para cada nodo, buscar otros nodos macro alcanzables dentro de un radio máximo.
    // MAURI: "Minimal Diameter": Reducimos el radio de conexión al mínimo posible
    // para evitar saltos o conexiones diagonales.
    // SEPARATION es 3. CONNECTION debe ser apenas un poco más (4.5) para tolerar jitter.
    // SEPARATION es 3. CONNECTION debe ser generoso para asegurar diagonales y evitar islas.
    const CONNECTION_RADIUS = gridSize * 6.0;

    Object.values(macroNodes).forEach(node => {
        findNeighborsBFS(node, macroNodes, gridData, gridSize, CONNECTION_RADIUS);
    });

    console.timeEnd("BuildTopology");
    return macroNodes;
};

// Helper: Fisher-Yates Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Helper: BFS para encontrar vecinos macro alcanzables
const findNeighborsBFS = (startNode, allNodes, gridData, gridSize, maxDist) => {
    const queue = [{ x: startNode.x, z: startNode.z, dist: 0 }];
    const visited = new Set();
    visited.add(startNode.id);

    // Limite de iteraciones por seguridad (evitar espirales infinitos en mapas muy grandes)
    let ops = 0;
    const MAX_OPS = 500;

    while (queue.length > 0 && ops < MAX_OPS) {
        ops++;
        const current = queue.shift();

        // Si nos alejamos demasiado, cortamos esta rama
        if (current.dist > maxDist) continue;

        // Direcciones cardinales + diagonales
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dx, dz] of dirs) {
            const nx = current.x + dx * gridSize; // Ojo: gridSize escalar
            const nz = current.z + dz * gridSize;

            // Reconstruir key (cuidado con decimales/redondeo si gridSize no es entero perfecto)
            // Asumimos que las keys en gridData son ints o coherentes con la generación.
            // Mejor buscar la celda más cercana o usar la lógica de coordenadas exacta.
            // En PPS-VAE parece que las keys son "x,z" directas. 
            // Si x avanzó gridSize, debería coincidir.

            // FIX: Para asegurar match con gridData, usamos Math.round si es necesario, pero
            // idealmente sumamos enteros si gridSize es 1, o floats controlados.
            // Asumamos que gridData keys son `${x},${z}`.

            const key = `${nx},${nz}`;

            if (visited.has(key)) continue;

            const cell = gridData[key];
            // Solo caminar por Road/Destination parking
            if (cell && (cell.type === 'road' || cell.type === 'destination' || cell.type === 'parking')) {
                visited.add(key);

                // ¿Es este un Nodo Macro?
                if (allNodes[key] && key !== startNode.id) {
                    // ¡Encontramos un vecino!
                    // Agregamos arista y NO seguimos expandiendo desde aquí (para no saltar nodos)
                    // (Opcional: Si queremos redundancia, podríamos seguir, pero "tapar" caminos es mejor)
                    const distToNeighbor = current.dist + gridSize; // Aprox
                    // Calcular distancia real euclidiana para mayor precisión en el peso
                    const realDist = Math.hypot(startNode.x - nx, startNode.z - nz);

                    startNode.neighbors.push({
                        id: key,
                        dist: realDist
                    });
                } else {
                    // Sigue siendo camino intermedio
                    queue.push({ x: nx, z: nz, dist: current.dist + gridSize });
                }
            }
        }
    }
};

