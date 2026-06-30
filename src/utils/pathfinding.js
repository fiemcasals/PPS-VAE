import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";

const ANGLE_RES = Math.PI / 16; //la franja de angulos que va a tomar como uno solo -> de  10grados a 20 grados lo toma como lo mismo.
// Modificado: Permitimos giros de hasta 1.0 (máximo de dirección de 0.8 rad) para maniobrar en calles angostas (4m)
// y reducimos el tamaño del paso para mejorar la precisión de giro en las esquinas.
const STEER_STEPS = [-1.0, -0.6, -0.3, 0, 0.3, 0.6, 1.0];
const STEP_SIZE = 1.5;

// MAURI: Factor de peso BASE para la Heurística (h).
// Aumentaremos este valor dinámicamente si la búsqueda tarda mucho.
const BASE_HEURISTIC_WEIGHT = 4.0;

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
  const hw = (VEHICLE_CONFIG.WIDTH / 2) * marginFactor;
  const hl = (VEHICLE_CONFIG.LENGTH / 2) * 0.9;
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
    const cx = Math.round(p.x / cellSize) * cellSize;
    const cz = Math.round(p.z / cellSize) * cellSize;
    const cell = gridData[`${cx},${cz}`];

    // Si no existe celda o no es camino/destino, hay colisión
    if (!cell || (cell.type !== "road" && cell.type !== "destination"))
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

const heuristic = (pos, goal) => Math.hypot(pos.x - goal.x, pos.z - goal.z);

// MAURI: Función Principal del Buscador de Caminos (A*)
// Convertido a ASYNC para permitir que la interfaz gráfica (React) se actualice mientras calculamos.
// Si fuera síncrono, el navegador se congelaría totalmente durante cálculos largos.
export async function findPathAsync(
  start,
  goal,
  gridData,
  cellSize,
  onProgress,
) {
  // MAURI: Límite alto, pero con yield no congela la UI
  const DEBUG_ITER_LIMIT = 50000;

  const openSet = [
    new Node(start.x, start.z, start.heading, 0, heuristic(start, goal)),
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

    if (iter === 0) {
      console.log(`[Buscador] Iniciando A* desde (${curr.x.toFixed(2)}, ${curr.z.toFixed(2)}) con rumbo ${curr.theta.toFixed(4)}. Destino: (${goal.x.toFixed(2)}, ${goal.z.toFixed(2)})`);
    }

    let normalizedTheta = curr.theta;
    while (normalizedTheta > Math.PI) normalizedTheta -= 2 * Math.PI;
    while (normalizedTheta <= -Math.PI) normalizedTheta += 2 * Math.PI;
    const angleKey = Math.round(normalizedTheta / ANGLE_RES);
    const stateKey = `${Math.round(curr.x)},${Math.round(curr.z)},${angleKey}`;
    if (closedSet.has(stateKey) && closedSet.get(stateKey) <= curr.g) continue;
    closedSet.set(stateKey, curr.g);

    explored.push({ x: curr.x, z: curr.z });

    // Distancia en línea recta a la meta
    const distToGoal = Math.hypot(curr.x - goal.x, curr.z - goal.z);

    // CONDICIÓN DE ÉXITO:
    // Reducimos a 0.8 metros para asegurar que el auto llegue bien adentro de la celda objetivo
    // y se registre correctamente en la celda destino al redondear coordenadas.
    if (distToGoal < 0.8) {
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
    // --- OPCIONES PARA IR HACIA ADELANTE (d: 1) ---
    // --- OPCIONES PARA IR HACIA ADELANTE (d: 1) ---
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

      if (iter === 0) {
        const collision = isCollision(nextX, nextZ, nextTheta, gridData, cellSize, 0.85);
        console.log(`  Candidato: d=${d}, s=${s} -> pos=(${nextX.toFixed(2)}, ${nextZ.toFixed(2)}), colision=${collision}`);
        if (collision) {
          const hw = VEHICLE_CONFIG.WIDTH * 0.85;
          const hl = VEHICLE_CONFIG.LENGTH * 0.6;
          const s_val = Math.sin(nextTheta), c_val = Math.cos(nextTheta);
          const corners = [
            { x: nextX + (hl * c_val - hw * s_val), z: nextZ + (hl * s_val + hw * c_val) },
            { x: nextX + (hl * c_val + hw * s_val), z: nextZ + (hl * s_val - hw * c_val) },
            { x: nextX - (hl * c_val + hw * s_val), z: nextZ - (hl * s_val - hw * c_val) },
            { x: nextX - (hl * c_val - hw * s_val), z: nextZ - (hl * s_val + hw * c_val) },
          ];
          for (let idx = 0; idx < corners.length; idx++) {
            const p = corners[idx];
            const cx = Math.round(p.x / cellSize) * cellSize;
            const cz = Math.round(p.z / cellSize) * cellSize;
            const cell = gridData[`${cx},${cz}`];
            console.log(`    Esquina ${idx}: pos=(${p.x.toFixed(2)}, ${p.z.toFixed(2)}) -> celda=(${cx}, ${cz}), tipo=${cell ? cell.type : 'undefined'}`);
          }
        }
      }

      if (isCollision(nextX, nextZ, nextTheta, gridData, cellSize, 0.85))
        continue;

      // MAURI: "Tunnel Vision Config"
      // Steering Cost: Subimos penalización (20) para que PREFIERA curvas suaves (0.4),
      // pero USE curvas cerradas (0.8) antes que ponerse a hacer maniobras locas.
      // Modificado: Penalizamos fuertemente la marcha atrás (factor 300.0) para que solo haga pocos metros.
      const moveCost =
        (d === 1 ? STEP_SIZE : STEP_SIZE * 300.0) + Math.abs(s) * 20;
      const nextG = curr.g + moveCost;

      // Switch Cost: Penalización por cambio de marcha (Drive <-> Reverse).
      // Subimos a 150 para que le duela un poco más hacer cambios innecesarios.
      const dirChangeCost = curr.direction !== d ? 150.0 : 0;

      // MAURI: PESO DINÁMICO PROGRESIVO
      // Cuantos más nodos exploramos, más "desesperado" (Greedy) se vuelve el algoritmo.
      // iter > 1000: Empieza a subir.
      // slope: (iter - 1000) / 5000: Cada 5000 iters extra, suma 1.0 al peso.
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
          heuristic({ x: nextX, z: nextZ }, goal),
          curr,
          s,
          d,
          dynamicWeight // <--- Pasamos el peso dinámico
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

      // MAURI: PROTECCIÓN DE MANIOBRAS (Cusps) y ESQUINAS
      // Si hay un cambio de dirección en este segmento (Reverse <-> Forward) o es una esquina física, NO suavizar.
      // Esto preserva el pico "V" y mantiene los nodos exactamente en las esquinas.
      const directionChanged =
        prev.direction !== curr.direction || curr.direction !== next.direction;

      const dx1 = curr.x - prev.x;
      const dz1 = curr.z - prev.z;
      const dx2 = next.x - curr.x;
      const dz2 = next.z - curr.z;
      const len1 = Math.hypot(dx1, dz1);
      const len2 = Math.hypot(dx2, dz2);
      let isCorner = false;
      if (len1 > 0.01 && len2 > 0.01) {
        const dot = (dx1 * dx2 + dz1 * dz2) / (len1 * len2);
        if (dot < 0.9) {
          isCorner = true;
        }
      }

      if (directionChanged || isCorner) {
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
