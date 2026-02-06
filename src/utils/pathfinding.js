import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";

const ANGLE_RES = Math.PI / 16; //la franja de angulos que va a tomar como uno solo -> de  10grados a 20 grados lo toma como lo mismo.
// MAURI: "Conservative Planning": Limitamos el "cerebro" al 40% del volante (0.32 rad).
// El auto FÍSICAMENTE puede girar 0.8, pero el PLAN nunca pedirá más de 0.32.
// Esto fuerza curvas mucho más amplias (radios grandes) que el límite físico.
const STEER_STEPS = [-0.4, -0.2, 0, 0.2, 0.4];
const STEP_SIZE = 2; // MAURI: Pasos más cortos para mayor precisión en curvas

// MAURI: Factor de peso BASE para la Heurística (h).
// Aumentaremos este valor dinámicamente si la búsqueda tarda mucho.
const BASE_HEURISTIC_WEIGHT = 2.0;

class Node {
  constructor(x, z, theta, g, h, parent = null, steer = 0, dir = 1, weight = BASE_HEURISTIC_WEIGHT) {
    this.x = x; // Posición X en el mundo
    this.z = z; // Posición Z en el mundo
    this.theta = theta; // Orientación del vehículo (radianes)
    this.g = g; // Costo Real
    this.h = h; // Heurística
    // F = G + H * Weight (Dinámico)
    this.f = g + h * weight;
    this.parent = parent;
    this.steer = steer;
    this.direction = dir;
  }
}

// -------------------------------------------------------------------
// 2. Colisiones (con Margen Variable)
// -------------------------------------------------------------------

// marginFactor:
// - 0.9: PATHFINDING (Muy seguro, lejos de paredes)
// - 0.6: SMOOTHING (Permite cortar un poco la "zona de seguridad" para hacer curvas)
const isCollision = (x, z, theta, gridData, cellSize, marginFactor = 0.99) => {
  const hw = VEHICLE_CONFIG.WIDTH * marginFactor;
  const hl = VEHICLE_CONFIG.LENGTH * 0.6;
  const s = Math.sin(theta),
    c = Math.cos(theta); //en base al angulo, calcula la magnitud en x y z de los puntos del rectangulo que forma el auto
  const corners = [
    //calcula las 4 esquinas sabiendo que puede estar rotado
    { x: x + (hl * c - hw * s), z: z + (hl * s + hw * c) },
    { x: x + (hl * c + hw * s), z: z + (hl * s - hw * c) },
    { x: x - (hl * c + hw * s), z: z - (hl * s - hw * c) },
    { x: x - (hl * c - hw * s), z: z - (hl * s + hw * c) },
  ];
  // Check points
  for (const p of corners) {
    const cx = Math.floor(p.x / cellSize) * cellSize + cellSize / 2;
    const cz = Math.floor(p.z / cellSize) * cellSize + cellSize / 2;
    const cell = gridData[`${cx},${cz}`];

    // Si no existe celda o no es camino/destino/estacionamiento, hay colisión
    if (!cell || (cell.type !== "road" && cell.type !== "destination" && cell.type !== "parking"))
      return true;
  }
  return false;
};

// Helper for A*
// Definimos la clase PriorityQueue (Cola de Prioridad)
class PriorityQueue {
  // El constructor se ejecuta al crear la cola (let q = new PriorityQueue())
  constructor() {
    // Creamos un array vacío donde se almacenarán los nodos
    this.elements = [];
  }

  // Método para agregar un nuevo nodo a la lista
  enqueue(element) {
    // 1. Agregamos el elemento al final del array
    this.elements.push(element);

    // 2. REORDENAMOS toda la lista.
    // La lógica (a, b) => a.f - b.f le dice a JavaScript:
    // "Compara el valor 'f' de dos nodos. Si la resta es negativa, 'a' va primero".
    // Esto deja siempre el valor 'f' más pequeño al principio de la lista.
    this.elements.sort((a, b) => a.f - b.f);
  }

  // Método para sacar el mejor nodo de la lista
  dequeue() {
    // .shift() elimina el primer elemento del array (el de menor 'f') y lo devuelve.
    // Es como atender al primero en la fila de un banco.
    return this.elements.shift();
  }

  // Método para saber si la lista está vacía
  isEmpty() {
    // Devuelve 'true' si el largo de la lista es 0, 'false' si todavía hay nodos.
    return this.elements.length === 0;
  }
}

// MAURI: Helper para distancia Punto-Segmento (Corredor Topológico)
const distanceToSegment = (p, v, w) => {
  const l2 = (v.x - w.x) ** 2 + (v.z - w.z) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.z - v.z);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.z - v.z) * (w.z - v.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.z - (v.z + t * (w.z - v.z))
  );
};

// Heurística Aumentada: Euclidean + Corredor Topológico
const heuristic = (pos, goal, macroPath) => {
  const h_euclidean = Math.hypot(pos.x - goal.x, pos.z - goal.z);

  if (!macroPath || macroPath.length < 2) return h_euclidean;

  // Calculamos distancia al "corredor" (la línea poliédrica de la macro-ruta)
  let minDistToCorridor = Infinity;
  for (let i = 0; i < macroPath.length - 1; i++) {
    const d = distanceToSegment(pos, macroPath[i], macroPath[i + 1]);
    if (d < minDistToCorridor) minDistToCorridor = d;
  }

  // Penalización: Si te alejas del corredor, aumenta el costo.
  // Factor 2.5: Fuerte atracción hacia la carretera principal.
  return h_euclidean + minDistToCorridor * 2.5;
};

// MAURI: Función Principal del Buscador de Caminos (A*)
export async function findPathAsync(
  start,
  goal,
  gridData,
  cellSize,
  config = {},
  onProgress,
  macroPath = null // MAURI: Nuevo argumento
) {
  // MAURI: Límite alto, pero con yield no congela la UI
  const DEBUG_ITER_LIMIT = 50000;

  // Extracción de pesos configurables con defaults
  const BACKWARD_WEIGHT = config.backward_weight || 30.0;
  const STEERING_COST = config.steering_cost || 20.0;
  const GEAR_SWITCH_COST = config.gear_switch_cost || 150.0;

  // H Inicial con MacroPath
  const openSet = [
    new Node(start.x, start.z, start.heading, 0, heuristic(start, goal, macroPath)),
  ];
  const closedSet = new Map();
  const explored = [];

  for (let iter = 0; iter < DEBUG_ITER_LIMIT; iter++) {
    // MAURI: YIELD cada 500 iteraciones para pintar puntos rojos
    if (iter % 500 === 0) {
      if (onProgress) onProgress([...explored]); // Copia para React
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (openSet.length === 0) {
      console.warn("A*: OpenSet vacío. No hay ruta posible.");
      break;
    }

    openSet.sort((a, b) => a.f - b.f);
    const curr = openSet.shift();

    const stateKey = `${Math.round(curr.x)},${Math.round(curr.z)},${Math.round(curr.theta / ANGLE_RES)}`;
    if (closedSet.has(stateKey) && closedSet.get(stateKey) <= curr.g) continue;
    closedSet.set(stateKey, curr.g);

    explored.push({ x: curr.x, z: curr.z });

    // Distancia en línea recta a la meta
    const distToGoal = Math.hypot(curr.x - goal.x, curr.z - goal.z);

    // CONDICIÓN DE ÉXITO:
    // Si estamos muy cerca del centro de la celda objetivo (0.5 del tamaño de celda).
    if (distToGoal < cellSize * 0.5) {
      // Reconstruimos el camino yendo hacia atrás desde el nodo final hasta el inicio
      const path = [];
      let t = curr;
      while (t) {
        path.push({ x: t.x, z: t.z, steer: t.steer, direction: t.direction });
        t = t.parent;
      }
      const rawPath = path.reverse();
      // Aplicamos un suavizado final para quitar el "tembleque" del camino
      return { path: smoothPath(rawPath, gridData, cellSize), explored };
    }

    // --- EXPANSIÓN DE VECINOS CON TRANSICIÓN RECTA ---
    const nextMoves = [];

    // 1. Lógica de Avance (d: 1)
    if (curr.direction === -1) {
      // CAMBIO DE MARCHA: Si venía de atrás, para ir adelante...
      nextMoves.push({ d: 1, s: 0 }); // Opción 1: Salir recto
      // MAURI FIX: Opción 2: Salir con la misma curva (Retracing) - Permite "V" suaves
      if (curr.steer !== 0) nextMoves.push({ d: 1, s: curr.steer });
    } else {
      // CONTINUIDAD: Si ya venía de adelante, usa TODOS los pasos definidos
      for (const s of STEER_STEPS) {
        nextMoves.push({ d: 1, s });
      }
    }

    // --- OPCIONES PARA IR HACIA ATRÁS (d: -1) ---
    if (curr.direction === 1) {
      // CAMBIO DE MARCHA: Si venía de adelante, para ir atrás...
      nextMoves.push({ d: -1, s: 0 }); // Opción 1: Salir recto
      // MAURI FIX: Opción 2: Salir con la misma curva (Retracing)
      if (curr.steer !== 0) nextMoves.push({ d: -1, s: curr.steer });
    } else {
      // CONTINUIDAD: Si ya venía de atrás, usa TODOS los pasos definidos
      for (const s of STEER_STEPS) {
        nextMoves.push({ d: -1, s });
      }
    }

    for (const move of nextMoves) {
      const d = move.d;
      const s = move.s;
      const steerA = s * VEHICLE_CONFIG.MAX_STEER_ANGLE;

      const beta = (STEP_SIZE / VEHICLE_CONFIG.WHEELBASE) * Math.tan(steerA);
      // MAURI: Invertimos rotación en A* para coincidir con Physics (Left=+Steer -> Right Turn on Map)
      const nextTheta = curr.theta - beta * d;
      const nextX = curr.x + STEP_SIZE * d * Math.sin(curr.theta);
      const nextZ = curr.z + STEP_SIZE * d * Math.cos(curr.theta);

      if (isCollision(nextX, nextZ, nextTheta, gridData, cellSize, 0.9))
        continue;

      // MAURI: "Tunnel Vision Config"
      let moveCost =
        (d === 1 ? STEP_SIZE : STEP_SIZE * BACKWARD_WEIGHT) + Math.abs(s) * STEERING_COST;

      // MAURI: Parking Penalty
      const cx = Math.floor(nextX / cellSize) * cellSize + cellSize / 2;
      const cz = Math.floor(nextZ / cellSize) * cellSize + cellSize / 2;
      const nextCell = gridData[`${cx},${cz}`];
      if (nextCell && nextCell.type === "parking") {
        moveCost *= 5.0;
      }

      const nextG = curr.g + moveCost;

      // Switch Cost: Penalización por cambio de marcha (Drive <-> Reverse).
      const dirChangeCost = curr.direction !== d ? GEAR_SWITCH_COST : 0;

      // MAURI: PESO DINÁMICO PROGRESIVO
      let dynamicWeight = BASE_HEURISTIC_WEIGHT;
      if (iter > 1000) {
        dynamicWeight += (iter - 1000) / 2000;
      }

      openSet.push(
        new Node(
          nextX,
          nextZ,
          nextTheta,
          nextG + dirChangeCost,
          heuristic({ x: nextX, z: nextZ }, goal, macroPath), // <--- Pasamos MacroPath
          curr,
          s,
          d,
          dynamicWeight
        ),
      );
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
  const iterations = 30; // MAURI: Aumentamos agresivamente el suavizado (30) para eliminar picos "V"
  const weightCurrent = 0.4;
  const weightNeighbors = 0.3; // Pesos más agresivos para los vecinos

  for (let iter = 0; iter < iterations; iter++) {
    // Importante: No mover el primero ni el último punto
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const curr = smoothed[i];
      const next = smoothed[i + 1];

      // MAURI: PROTECCIÓN DE MANIOBRAS (Cusps)
      // Si hay un cambio de dirección en este segmento (Reverse <-> Forward), NO suavizar.
      // Esto preserva el pico "V" necesario para la maniobra de 3 puntos.
      const directionChanged =
        prev.direction !== curr.direction || curr.direction !== next.direction;

      if (directionChanged) {
        continue; // Saltamos suavizado para mantener el vértice exacto
      }

      const newX =
        prev.x * weightNeighbors +
        curr.x * weightCurrent +
        next.x * weightNeighbors;
      const newZ =
        prev.z * weightNeighbors +
        curr.z * weightCurrent +
        next.z * weightNeighbors;

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
