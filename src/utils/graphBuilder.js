/**
 * graphBuilder.js
 * 
 * Módulo encargado de analizar el mapa de rejilla (gridData) y construir un Grafo Topológico.
 * Identifica nodos clave (Intersecciones y Destinos) y calcula las conexiones (aristas) entre ellos.
 * 
 * Uso:
 * const graph = buildTopology(gridData, gridSize);
 */

export const buildTopology = (gridData, gridSize) => {
    console.time("BuildTopology");
    const nodes = {}; // Mapa de nodos clave: { "x,z": { type, x, z, neighbors: [] } }

    // 1. Identificar Nodos Clave (Intersecciones y Destinos)
    Object.entries(gridData).forEach(([key, cell]) => {
        // Un destino SIEMPRE es un nodo clave
        if (cell.type === 'destination') {
            const [x, z] = key.split(',').map(Number);
            nodes[key] = { id: key, x, z, type: 'destination', neighbors: [] };
            return;
        }

        // Para carreteras, verificamos si es una intersección
        if (cell.type === 'road') {
            const [x, z] = key.split(',').map(Number);
            const neighborCount = countRoadNeighbors(x, z, gridData, gridSize);

            // Si tiene más de 2 caminos (Intersección en T o Cruz) o es un callejón sin salida (1 camino)
            // Nota: Incluimos dead-ends (1) para que el grafo cubra todo el mapa navegable.
            if (neighborCount !== 2) {
                nodes[key] = { id: key, x, z, type: 'intersection', neighbors: [] };
            }
        }
    });

    console.log(`[Topología] Nodos identificados: ${Object.keys(nodes).length}`);

    // 2. Construir Aristas (Conectar los nodos)
    // Para cada nodo clave, lanzamos un BFS/FloodFill limitado para encontrar sus vecinos clave inmediatos.
    Object.values(nodes).forEach(node => {
        findConnectedNodes(node, nodes, gridData, gridSize);
    });

    console.timeEnd("BuildTopology");
    return nodes;
};

// Cuenta cuántos vecinos accesibles tiene una celda (Road o Destination)
const countRoadNeighbors = (x, z, gridData, gridSize) => {
    let count = 0;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    dirs.forEach(([dx, dz]) => {
        const nx = x + dx;
        const nz = z + dz;
        const key = `${nx},${nz}`;
        const cell = gridData[key];

        // Es camino si existe y es road o destination
        if (cell && (cell.type === 'road' || cell.type === 'destination')) {
            count++;
        }
    });
    return count;
};

// Busca nodos clave conectados a 'startNode' siguiendo la carretera
const findConnectedNodes = (startNode, allNodes, gridData, gridSize) => {
    const queue = [{ x: startNode.x, z: startNode.z, dist: 0 }];
    const visited = new Set();
    visited.add(startNode.id);

    // BFS Local
    while (queue.length > 0) {
        const current = queue.shift();

        // Direcciones cardinales
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        dirs.forEach(([dx, dz]) => {
            const nx = current.x + dx;
            const nz = current.z + dz;
            const key = `${nx},${nz}`;

            // Si ya visitamos esta celda en este recorrido, saltar
            if (visited.has(key)) return;

            const cell = gridData[key];
            // Solo avanzamos por carretera/destinos
            if (cell && (cell.type === 'road' || cell.type === 'destination')) {
                visited.add(key);

                // ¿Es este vecino un Nodo Clave?
                if (allNodes[key]) {
                    // ¡Encontramos un vecino topológico!
                    // Agregamos la conexión (Arista) y NO seguimos explorando por esta rama.
                    // (La conexión es directa, no saltamos nodos)
                    startNode.neighbors.push({
                        id: key,
                        dist: current.dist + gridSize // Distancia acumulada + 1 paso
                    });
                } else {
                    // No es nodo clave (es tramo intermedio), seguimos explorando
                    queue.push({ x: nx, z: nz, dist: current.dist + gridSize });
                }
            }
        });
    }
};
