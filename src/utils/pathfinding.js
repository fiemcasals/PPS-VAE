import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";

const ANGLE_RES = Math.PI / 16;
const STEER_STEPS = [-1, -0.5, 0, 0.5, 1];
const STEP_SIZE = 1.2;

// MAURI: Factor de peso para hacer A* más "codicioso" (Greedy). 
// > 1.0 prioriza llegar rápido al destino sobre encontrar el camino absolutamente más corto.
const HEURISTIC_WEIGHT = 2.0;

class Node {
    constructor(x, z, theta, g, h, parent = null, steer = 0, dir = 1) {
        this.x = x; this.z = z; this.theta = theta;
        this.g = g; // Costo real
        this.h = h; // Heurística (distancia al final)
        this.f = g + h * HEURISTIC_WEIGHT;
        this.parent = parent; this.steer = steer; this.direction = dir;
    }
}

// -------------------------------------------------------------------
// 2. Colisiones (con Margen Variable)
// -------------------------------------------------------------------

// marginFactor:
// - 0.9: PATHFINDING (Muy seguro, lejos de paredes)
// - 0.6: SMOOTHING (Permite cortar un poco la "zona de seguridad" para hacer curvas)
// marginFactor:
// - 0.9: PATHFINDING (Muy seguro, lejos de paredes)
// - 0.6: SMOOTHING (Permite cortar un poco la "zona de seguridad" para hacer curvas)
const isCollision = (x, z, theta, gridData, cellSize, marginFactor = 0.9) => {
    const hw = VEHICLE_CONFIG.WIDTH * marginFactor;
    const hl = VEHICLE_CONFIG.LENGTH * 0.55;
    const s = Math.sin(theta), c = Math.cos(theta);
    const corners = [
        { x: x + (hl * c - hw * s), z: z + (hl * s + hw * c) },
        { x: x + (hl * c + hw * s), z: z + (hl * s - hw * c) },
        { x: x - (hl * c + hw * s), z: z - (hl * s - hw * c) },
        { x: x - (hl * c - hw * s), z: z - (hl * s + hw * c) },
    ];
    // Check points
    for (const p of corners) {
        // MAURI: Revertido a la lógica de Mapa (gridData[key]) porque gridData no es un array 2D
        const cx = Math.floor(p.x / cellSize) * cellSize + cellSize / 2;
        const cz = Math.floor(p.z / cellSize) * cellSize + cellSize / 2;
        const cell = gridData[`${cx},${cz}`];

        // Si no existe celda o no es camino/destino, hay colisión
        if (!cell || (cell.type !== "road" && cell.type !== "destination")) return true;
    }
    return false;
};

// -------------------------------------------------------------------
// 3. A* (Weighted)
// -------------------------------------------------------------------

// Helper for A*
class PriorityQueue {
    constructor() { this.elements = []; }
    enqueue(element) { this.elements.push(element); this.elements.sort((a, b) => a.f - b.f); }
    dequeue() { return this.elements.shift(); }
    isEmpty() { return this.elements.length === 0; }
}

const heuristic = (pos, goal) => Math.hypot(pos.x - goal.x, pos.z - goal.z);

export function findPath(start, goal, gridData, cellSize) {

    // MAURI: Aumentamos iteraciones para mapas complejos o maniobras difíciles
    // MAURI: Aumentamos iteraciones para mapas complejos o maniobras difíciles
    const DEBUG_ITER_LIMIT = 50000;

    // Inicialización explícita de estructuras de datos
    // Usamos array simple con sort por ahora para consistencia con el código existente
    const openSet = [new Node(start.x, start.z, start.heading, 0, heuristic(start, goal))];
    const closedSet = new Map();
    const explored = [];

    for (let iter = 0; iter < DEBUG_ITER_LIMIT; iter++) {
        if (openSet.length === 0) {
            console.warn("A*: OpenSet vacío. No hay ruta posible.");
            break;
        }

        // Ordenar por costo F (menor primero)
        openSet.sort((a, b) => a.f - b.f);
        const curr = openSet.shift();

        // Redondear para "binning" del estado visitado
        const stateKey = `${Math.round(curr.x)},${Math.round(curr.z)},${Math.round(curr.theta / ANGLE_RES)}`;
        // Si ya llegamos a este estado con menos costo, skip
        if (closedSet.has(stateKey) && closedSet.get(stateKey) <= curr.g) continue;
        closedSet.set(stateKey, curr.g);

        explored.push({ x: curr.x, z: curr.z });

        // Distancia euclidiana al destino
        const distToGoal = Math.hypot(curr.x - goal.x, curr.z - goal.z);

        // Umbral de llegada (ajustar si es necesario)
        if (distToGoal < cellSize * 1.5) {
            // Reconstruir camino
            const path = []; let t = curr;
            while (t) { path.push({ x: t.x, z: t.z, steer: t.steer, direction: t.direction }); t = t.parent; }
            const rawPath = path.reverse();
            // Suavizar antes de devolver
            return { path: smoothPath(rawPath, gridData, cellSize), explored };
        }

        // Expandir vecinos
        for (const d of [1, -1]) { // 1: Avanzar, -1: Retroceder
            for (const s of STEER_STEPS) {
                const steerA = s * VEHICLE_CONFIG.MAX_STEER_ANGLE;

                // Modelo cinemático simple
                const beta = (STEP_SIZE / VEHICLE_CONFIG.WHEELBASE) * Math.tan(steerA);
                const nextTheta = curr.theta + (beta * d);
                const nextX = curr.x + STEP_SIZE * d * Math.sin(curr.theta);
                const nextZ = curr.z + STEP_SIZE * d * Math.cos(curr.theta);

                // --- COLISIÓN GENERACIÓN (0.9) ---
                // Margen estricto durante la búsqueda inicial
                if (isCollision(nextX, nextZ, nextTheta, gridData, cellSize, 0.9)) continue;

                // Costo de movimiento
                const moveCost = (d === 1 ? STEP_SIZE : STEP_SIZE * 1.5) + (Math.abs(s) * 0.1);
                const nextG = curr.g + moveCost;

                // Añadir penalización por cambio de dirección
                const dirChangeCost = (curr.direction !== d) ? 1.0 : 0;

                openSet.push(new Node(nextX, nextZ, nextTheta, nextG + dirChangeCost, heuristic({ x: nextX, z: nextZ }, goal), curr, s, d));
            }
        }
    }

    console.warn("A*: Límite de iteraciones alcanzado sin encontrar ruta.");
    return { path: null, explored };
}

// Algoritmo de suavizado simple (Moving Average)
// Itera sobre el camino y ajusta los puntos intermedios
function smoothPath(path, gridData, cellSize) {
    if (path.length < 3) return path;

    // Hacemos una copia para no mutar mientras leemos
    let smoothed = [...path];
    const iterations = 6; // MAURI: Aumentamos a 6 pasadas para "lijar" bien esos picos
    const weightCurrent = 0.4;
    const weightNeighbors = 0.3; // Pesos más agresivos para los vecinos

    for (let iter = 0; iter < iterations; iter++) {
        // Importante: No mover el primero ni el último punto
        for (let i = 1; i < smoothed.length - 1; i++) {
            const prev = smoothed[i - 1];
            const curr = smoothed[i];
            const next = smoothed[i + 1];

            const newX = prev.x * weightNeighbors + curr.x * weightCurrent + next.x * weightNeighbors;
            const newZ = prev.z * weightNeighbors + curr.z * weightCurrent + next.z * weightNeighbors;

            // --- COLISIÓN SUAVIZADO (0.6) ---
            // Permitimos cortar margen para hacer curva
            if (!isCollision(newX, newZ, curr.theta || 0, gridData, cellSize, 0.6)) {
                smoothed[i].x = newX;
                smoothed[i].z = newZ;
            }
        }
    }
    return smoothed;
}