import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";

const ANGLE_RES = Math.PI / 16; //la franja de angulos que va a tomar como uno solo -> de  10grados a 20 grados lo toma como lo mismo.
// MAURI: "Conservative Planning": Limitamos el "cerebro" al 40% del volante (0.32 rad).
// El auto FÍSICAMENTE puede girar 0.8, pero el PLAN nunca pedirá más de 0.32.
// Esto fuerza curvas mucho más amplias (radios grandes) que el límite físico.
// MAURI: "Conservative Planning": Limitamos el "cerebro" al 35% del volante (0.35 rad).
// Reducimos de 0.4 a 0.35 para forzar curvas más abiertas y evitar que el auto se pase.
const STEER_STEPS = [-0.3, 0, 0.3];
const STEP_SIZE = 2; // MAURI: Pasos más cortos para mayor precisión en curvas

// MAURI: Factor de peso BASE para la Heurística (h).
// Aumentaremos este valor dinámicamente si la búsqueda tarda mucho.
const BASE_HEURISTIC_WEIGHT = 6.0; // MAURI: Reduced from 20.0 to 2.0 to allow exploration.

class Node {
  constructor(x, z, theta, g, h, parent = null, steer = 0, dir = 1, weight = BASE_HEURISTIC_WEIGHT) {
    this.x = x; // Posición X en el mundo
    this.z = z; // Posición Z en el mundo
    this.theta = theta; // Orientación del vehículo (radianes)
    this.g = g; // Costo Real, calculado mediante la suma de distancias entre nodos
    this.h = h; // Heurística, calculada mediante la distancia euclidiana entre el nodo y el objetivo
    // F = G + H * Weight (Dinámico)
    this.f = g + h * weight;
    this.parent = parent; //Nodo padre, es decir, el nodo anterior en el camino
    this.steer = steer;  //Angulo de giro
    this.direction = dir; //Direccion (1 o -1)
  }
}

// -------------------------------------------------------------------
// 2. Colisiones (con Margen Variable)
// -------------------------------------------------------------------

// marginFactor:
// - 0.9: PATHFINDING (Muy seguro, lejos de paredes)
// - 0.6: SMOOTHING (Permite cortar un poco la "zona de seguridad" para hacer curvas)
const isCollision = (x, z, theta, gridData, cellSize, marginFactor = 0.99, smoothing = 0.6) => {
  const hw = VEHICLE_CONFIG.WIDTH * marginFactor;
  const hl = VEHICLE_CONFIG.LENGTH * smoothing;
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
    const cx = Math.floor(p.x / cellSize) * cellSize + cellSize / 2;//cx representa la coordenada x de la celda
    const cz = Math.floor(p.z / cellSize) * cellSize + cellSize / 2;//cz representa la coordenada z de la celda
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
const distanceToSegment = (p, v, w) => { //p es el punto, v el nodo verde grande y w el destino
  const l2 = (v.x - w.x) ** 2 + (v.z - w.z) ** 2; //l2 es la longitud al cuadrado del segmento, es decir la distancia desde un punto de la macro ruta, hasta el destino
  if (l2 === 0) return Math.hypot(p.x - v.x, p.z - v.z); //el condicional sirve para cuando el segmento es un punto, en el caso de ser un punto la distancia es la distancia euclidiana, desde donde esta el auto, hasta ese punto, que basicamente es la meta
  let t = ((p.x - v.x) * (w.x - v.x) + (p.z - v.z) * (w.z - v.z)) / l2;//el producto vectorial entre el vector que va desde v a p y el vector que va desde v a w dividido por la magnito maxima entre v y w, no da un valor entre 0 y 1, que representa cuando recorrido del segmento
  t = Math.max(0, Math.min(1, t));
  return Math.hypot( //la hipotenuza toma dos valores, x y z, y se le pasa la distancia entre el punto del auto y el destino, para eso tengo que tener en cuenta donde esta el auto, y restarle la suma de la posicion del nodo anterior mas la distancia recorrida del segmento, desde el nodo anterior al siguiente o destino 
    p.x - (v.x + t * (w.x - v.x)),
    p.z - (v.z + t * (w.z - v.z))
  );
};

// MAURI: Gradient Heuristic
// Usa el mapa de costos pre-calculado (Dijkstra) sobre los nodos rojos.
// h(pos) = min ( dist(pos, RedNode) + CostToGoal(RedNode) )
// Esto crea un campo de potencial suave que atrae al auto hacia la meta a través de la red vial.
const heuristic = (pos, goal, macroContext) => {
  const h_euclidean = Math.hypot(pos.x - goal.x, pos.z - goal.z);

  if (!macroContext || !macroContext.gradientMap) return h_euclidean;

  const { graph, gradientMap } = macroContext;
  let minCost = Infinity;

  // Optimización: Buscar solo nodos rojos cercanos.
  // Como no tenemos índice espacial eficiente aquí, iteramos todos (N ~ 200-500 es aceptable en JS moderno).
  // Si fuera muy lento, usaríamos un Grid Spatial Hash.

  // Radius check optimization: Only consider nodes within 50m to avoid evaluating far-off paths?
  // Actually, we want the ABSOLUTE best gradient. Use all.

  const nodes = Object.values(graph);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    // MAURI: Ahora 'gCost' es el COSTO TOTAL (Start + End) del nodo.
    // Los nodos en el camino directo tendrán un valor MINIMO (aprox constante).
    // Los nodos que se desvían tendrán un valor MAYOR.
    const combinedCost = gradientMap[node.id];

    // Si el nodo es inalcanzable (infinito) o su costo total es muy alto comparado con el mejor encontrado
    if (combinedCost === Infinity || combinedCost > minCost) continue;

    // Distancia física al nodo rojo
    const d = Math.hypot(pos.x - node.x, pos.z - node.z);

    // Heurística: Costo de pasar por este nodo rojo.
    // Factor de atracción 0.0: Libertad total para alejarse del centro y usar el ancho de la calle.
    const attractionFactor = 0.0; // MAURI: Disabled (0.0) to allow U-turns using full road width.
    const totalH = combinedCost + (d * attractionFactor);

    if (totalH < minCost) {
      minCost = totalH;
    }
  }

  // Fallback
  return (minCost === Infinity) ? h_euclidean : minCost;
};

// MAURI: Función Principal del Buscador de Caminos (A*)
export async function findPathAsync(
  start,
  goal,
  gridData,
  cellSize,
  config = {},
  onProgress,
  macroContext = null // { graph, gradientMap }
) {
  const DEBUG_ITER_LIMIT = 50000;
  // ... rest of config ...
  const BACKWARD_WEIGHT = config.backward_weight || 30.0;
  const STEERING_COST = config.steering_cost || 20.0;
  const GEAR_SWITCH_COST = config.gear_switch_cost || 150.0;

  // Initialize
  const openSet = [
    new Node(start.x, start.z, start.heading, 0, heuristic(start, goal, macroContext)),
  ];
  // ... rest of init ...
  const closedSet = new Map();
  const explored = [];

  for (let iter = 0; iter < DEBUG_ITER_LIMIT; iter++) {
    // ... yield logic ...
    if (iter % 500 === 0) {
      if (onProgress) onProgress([...explored]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (openSet.length === 0) {
      console.warn("A*: OpenSet vacío. No hay ruta posible.");
      break;
    }

    // Simple sort for Priority Queue (JS array is fast enough for small sets, otherwise MinHeap)
    openSet.sort((a, b) => a.f - b.f);
    const curr = openSet.shift();

    // ... standard A* logic follows ...

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
    // 1. Lógica de Avance (d: 1)
    if (curr.direction === -1) {
      // CAMBIO DE MARCHA: Si venía de atrás, para ir adelante...
      nextMoves.push({ d: 1, s: 0 }); // Opción 1: Salir recto
      // MAURI FIX: Desactivado para evitar ángulos bruscos. Forzamos salida recta.
      // if (curr.steer !== 0) nextMoves.push({ d: 1, s: curr.steer });
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
      // MAURI FIX: Desactivado para evitar ángulos bruscos.
      // if (curr.steer !== 0) nextMoves.push({ d: -1, s: curr.steer });
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

      if (isCollision(nextX, nextZ, nextTheta, gridData, cellSize, 0.95))
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
          heuristic({ x: nextX, z: nextZ }, goal, macroContext), // <--- Updated to use macroContext
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

      // --- COLISIÓN SUAVIZADO (0.9) ---
      // Permitimos cortar margen para hacer curva pero NO tanto (antes 0.6 -> muy arriesgado)
      if (!isCollision(newX, newZ, curr.theta || 0, gridData, cellSize, 0.9)) {
        smoothed[i].x = newX;
        smoothed[i].z = newZ;
      }
    }
  }
  return smoothed;
}
