/**
 * topologyPathfinder.js
 * 
 * Calcula CAMPOS DE GRADIENTE (Dijkstra) sobre el grafo topológico.
 */

// Helper: Run Dijkstra from a source node
const runDijkstra = (graph, startNodeId) => {
    const costs = {};
    const pq = new Set();

    Object.keys(graph).forEach(id => {
        costs[id] = Infinity;
        pq.add(id);
    });

    if (graph[startNodeId]) costs[startNodeId] = 0;

    // console.time("DijkstraRun");
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

        graph[minNode].neighbors.forEach(edge => {
            const alt = costs[minNode] + edge.dist;
            if (alt < costs[edge.id]) {
                costs[edge.id] = alt;
            }
        });
    }
    // console.timeEnd("DijkstraRun");
    return costs;
};

/**
 * Calculates two gradient fields:
 * 1. From Start (Distance traveled from origin) -> For Visualization
 * 2. To End (Distance remaining to goal) -> For Navigation Heuristic
 */
export const computeDualGradient = (graph, startNodeId, endNodeId) => {
    // console.time("DualGradient");

    // 1. Cost from Start (For Visualization: 0 -> High)
    const startMap = runDijkstra(graph, startNodeId);

    // 2. Cost to End (For Navigation Heuristic: High -> 0)
    // Runs Dijkstra backwards from Goal (assuming undirected graph for now, or reversed edges)
    // Since edges are bidirectional or simple neighbors, this works.
    const endMap = runDijkstra(graph, endNodeId);

    // console.timeEnd("DualGradient");
    return { startMap, endMap };
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
