import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";

const ANGLE_RES = Math.PI / 24; 
const STEER_STEPS = [-1, -0.5, 0, 0.5, 1];
const STEP_SIZE = 1.0; 

class Node {
    constructor(x, z, theta, g, parent = null, steer = 0, dir = 1) {
        this.x = x; this.z = z; this.theta = theta;
        this.g = g; this.f = g; 
        this.parent = parent; this.steer = steer; this.direction = dir;
    }
}

const getOBB = (x, z, theta) => {
    const hw = VEHICLE_CONFIG.WIDTH * 0.42; 
    const hl = VEHICLE_CONFIG.LENGTH * 0.42;
    const s = Math.sin(theta), c = Math.cos(theta);
    return [
        { x: x + (hl * s + hw * c), z: z + (hl * c - hw * s) },
        { x: x + (hl * s - hw * c), z: z + (hl * c + hw * s) },
        { x: x + (-hl * s + hw * c), z: z + (-hl * c - hw * s) },
        { x: x + (-hl * s - hw * c), z: z + (-hl * c + hw * s) }
    ];
};

const isCollision = (x, z, theta, gridData, cellSize) => {
    const corners = getOBB(x, z, theta);
    for (const p of corners) {
        const cx = Math.floor(p.x / cellSize) * cellSize + cellSize / 2;
        const cz = Math.floor(p.z / cellSize) * cellSize + cellSize / 2;
        const cell = gridData[`${cx},${cz}`];
        if (!cell || (cell.type !== "road" && cell.type !== "destination")) return true;
    }
    return false;
};

export function findPath(start, goal, gridData, cellSize) {
    let openSet = [new Node(start.x, start.z, start.heading, 0)];
    const closedSet = new Set();
    const explored = [];

    for (let iter = 0; iter < 20000; iter++) {
        if (openSet.length === 0) break;
        openSet.sort((a, b) => a.f - b.f);
        const curr = openSet.shift();

        const key = `${Math.round(curr.x / (cellSize/2))},${Math.round(curr.z / (cellSize/2))},${Math.round(curr.theta/ANGLE_RES)}`;
        if (closedSet.has(key)) continue;
        closedSet.add(key);
        explored.push({ x: curr.x, z: curr.z });

        if (Math.hypot(curr.x - goal.x, curr.z - goal.z) < cellSize) {
            const path = []; let t = curr;
            while (t) { path.push(t); t = t.parent; }
            return { path: path.reverse(), explored };
        }

        for (const d of [1, -1]) {
            for (const s of STEER_STEPS) {
                const steerA = s * VEHICLE_CONFIG.MAX_STEER_ANGLE;
                const beta = (STEP_SIZE / VEHICLE_CONFIG.WHEELBASE) * Math.tan(steerA);
                const nextTheta = curr.theta + (beta * d);
                const nextX = curr.x + STEP_SIZE * d * Math.sin(curr.theta);
                const nextZ = curr.z + STEP_SIZE * d * Math.cos(curr.theta);

                if (isCollision(nextX, nextZ, nextTheta, gridData, cellSize)) continue;

                let cost = STEP_SIZE;
                if (d === -1) cost += 60; 
                if (curr.direction !== d) cost += 120;
                cost += Math.abs(s) * 10;

                openSet.push(new Node(nextX, nextZ, nextTheta, curr.g + cost, curr, s, d));
            }
        }
    }
    return { path: null, explored };
}