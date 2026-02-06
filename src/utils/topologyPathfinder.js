/**
 * topologyPathfinder.js
 * 
 * Algoritmo Dijkstra de Alto Nivel para navegar el Grafo Topológico.
 * Encuentra la secuencia de nodos (Intersecciones/Destinos) óptima.
 */

export const findMacroPath = (graph, startNodeId, endNodeId) => {
    // Verificación básica
    if (!graph[startNodeId] || !graph[endNodeId]) {
        console.warn("[TopoPath] Nodos de inicio o fin no existen en el grafo.");
        return null;
    }

    // Estructuras para Dijkstra
    const distances = {};
    const previous = {};
    const pq = new Set(); // Simple Priority Queue (Set para iterar y buscar min)

    // Inicialización
    Object.keys(graph).forEach(nodeId => {
        distances[nodeId] = Infinity;
        pq.add(nodeId);
    });

    distances[startNodeId] = 0;

    while (pq.size > 0) {
        // Buscar nodo con menor distancia en el set
        let minNode = null;
        let minDist = Infinity;

        for (const nodeId of pq) {
            if (distances[nodeId] < minDist) {
                minDist = distances[nodeId];
                minNode = nodeId;
            }
        }

        // Si no encontramos, o la distancia es infinita (inconexos), terminamos
        if (minNode === null || minDist === Infinity) break;
        if (minNode === endNodeId) break; // Llegamos

        pq.delete(minNode);

        // Relajar vecinos
        const neighbors = graph[minNode].neighbors;
        for (const edge of neighbors) {
            const alt = distances[minNode] + edge.dist;
            if (alt < distances[edge.id]) {
                distances[edge.id] = alt;
                previous[edge.id] = minNode;
            }
        }
    }

    // Reconstruir camino
    const path = [];
    let u = endNodeId;
    if (previous[u] !== undefined || u === startNodeId) {
        while (u !== undefined) {
            path.unshift(u);
            u = previous[u];
        }
    } else {
        return null; // No hay ruta
    }

    return path; // Array de IDs ["x,z", "x,z", ...]
};

/**
 * Función auxiliar para encontrar el Nodo del Grafo más cercano a una posición arbitraria (x, z).
 * Útil para enganchar al auto (que puede estar en mitad de calle) al grafo.
 */
export const findNearestGraphNode = (graph, x, z) => {
    let closestNode = null;
    let minDist = Infinity;

    Object.values(graph).forEach(node => {
        const d = Math.hypot(node.x - x, node.z - z);
        if (d < minDist) {
            minDist = d;
            closestNode = node;
        }
    });

    return closestNode;
};
