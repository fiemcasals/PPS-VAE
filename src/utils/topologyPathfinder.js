/**
 * topologyPathfinder.js
 * 
 * Calcula CAMPOS DE GRADIENTE (Dijkstra) sobre el grafo topológico.
 */

// Helper: Run Dijkstra from a source node
export const runDijkstra = (graph, startNodeId) => {
    const costs = {};
    const predecessors = {};
    const pq = new Set();
    const visited = [];

    Object.keys(graph).forEach(id => {
        costs[id] = Infinity;
        pq.add(id);
    });

    if (graph[startNodeId]) costs[startNodeId] = 0;

    while (pq.size > 0) {
        let minNode = null;
        let minDist = Infinity;
        for (const id of pq) {
            if (costs[id] < minDist) {
                minDist = costs[id];
                minNode = id;
            }
        }

        if (!minNode || minDist === Infinity) break;
        pq.delete(minNode);
        visited.push(minNode);

        graph[minNode].neighbors.forEach(edge => {
            const alt = costs[minNode] + edge.dist;
            if (alt < costs[edge.id]) {
                costs[edge.id] = alt;
                predecessors[edge.id] = minNode;
            }
        });
    }
    return { costs, sortedNodes: visited, predecessors };
};

const reconstructPath = (predecessors, startId, endId) => {
    const path = [];
    let current = endId;
    while (current !== undefined) {
        path.unshift(current);
        if (current === startId) break;
        current = predecessors[current];
    }
    return path[0] === startId ? path : [];
};

/**
 * Calculates two gradient fields and the shortest macro path.
 */
export const computeDualGradient = (graph, startNodeId, endNodeId) => {
    // 1. Cost from Start (pq uses startNodeId as root)
    const resStart = runDijkstra(graph, startNodeId);

    // 2. Cost to End (pq uses endNodeId as root)
    const resEnd = runDijkstra(graph, endNodeId);

    // Reconstruct the SHORTEST PATH between start and end.
    // Since resStart ran from Start, its predecessors point away from Start.
    // So resStart.predecessors[endNodeId] -> ... -> startNodeId.
    const macroPath = reconstructPath(resStart.predecessors, startNodeId, endNodeId);

    return {
        startMap: resStart.costs,
        endMap: resEnd.costs,
        sortedNodes: resEnd.sortedNodes,
        macroPath: macroPath // This is the actual shortest path sequence
    };
};

// Legacy alias to avoid breaking imports immediately, though we should update calls
export const computeDijkstraGradient = (graph, endNodeId) => runDijkstra(graph, endNodeId);

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
