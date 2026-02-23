import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";
import { useStore } from "../store/useStore.js";

const ANGLE_RES = Math.PI / 16; //la franja de angulos que va a
const STEER_STEPS = [-0.6, -0.3, 0, 0.3, 0.6]; // 7 pasos: giro suave (0.2), medio (0.4), cerrado (0.8)
// const STEP_SIZE = 2 (Removed, now dynamic)

//EXPORTO DE useStore para usarlo en el heurístico, para poder acceder al peso del gradiente dinámico.
const { config } = useStore.getState();
const BASE_HEURISTIC_WEIGHT = config.base_heuristic_weight || 10.0;

class Node {
  constructor(
    x,
    z,
    theta,
    g,
    h,
    parent = null,
    steer = 0,
    dir = 1,
    weight = BASE_HEURISTIC_WEIGHT,
    distanceSinceGearSwitch = 0, // MAURI: Track distance since last gear switch
  ) {
    this.x = x; // Posición X en el mundo
    this.z = z; // Posición Z en el mundo
    this.theta = theta; // Orientación del vehículo (radianes)
    this.g = g; // Costo Real, calculado mediante la suma de distancias entre nodos
    this.h = h; // Heurística, calculada mediante la distancia euclidiana entre el nodo y el objetivo
    // F = G + H * Weight (Dinámico)
    this.f = g + h * weight; //a la distancia euclidiana se la multiplica por BASE_HEURISTIC_WEIGHT
    this.parent = parent; //Nodo padre, es decir, el nodo anterior en el camino
    this.steer = steer; //Angulo de giro
    this.direction = dir; //Direccion (1 o -1)
    this.distanceSinceGearSwitch = distanceSinceGearSwitch;
  }
}

// -------------------------------------------------------------------
// 2. Colisiones (con Margen Variable)
// -------------------------------------------------------------------

// - 0.9: PATHFINDING (Muy seguro, lejos de paredes)
// - 0.6: SMOOTHING (Permite cortar un poco la "zona de seguridad" para hacer curvas)
const isCollision = (
  x,
  z,
  theta,
  gridData,
  cellSize,
  marginFactor = 0.99,
  smoothing = 0.6,
) => {
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
    const cx = Math.floor(p.x / cellSize) * cellSize + cellSize / 2; //cx representa la coordenada x de la celda
    const cz = Math.floor(p.z / cellSize) * cellSize + cellSize / 2; //cz representa la coordenada z de la celda
    const cell = gridData[`${cx},${cz}`];

    // Si no existe celda o no es camino/destino/estacionamiento, hay colisión
    if (
      !cell ||
      (cell.type !== "road" &&
        cell.type !== "destination" &&
        cell.type !== "parking")
    )
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

// ------------------------------------ Gradient Heuristic ---------------------------------
// Usa el mapa de costos pre-calculado (Dijkstra) sobre los nodos rojos.
// Y la distancia de la posicion evaluada al goal
// Devuelve un numero positivo, el valor del punto rojo mas la distancia al destino, multiplicado ambos por coficientes. Busca devolver el valor mas chicos de los nodos rojos y la distancia hasta el destino.

const heuristic = (pos, goal, macroContext, weightOverrides = {}) => {
  const h_euclidean = Math.hypot(pos.x - goal.x, pos.z - goal.z); //costo por la distancia euclidiana al objetivo

  const { config } = useStore.getState();
  const BASE_HEURISTIC_WEIGHT_DYN = weightOverrides.base_heuristic_weight ?? config.base_heuristic_weight ?? 15.0;
  const ALIGN_WEIGHT = 5.0; // Penalización por mala orientación

  // Calcular penalización por orientación (siempre se aplica)
  let alignment_penalty = 0;
  const currentHeading = (pos.theta !== undefined) ? pos.theta : pos.heading;
  if (currentHeading !== undefined && goal.theta !== undefined) {
    const angle_diff = Math.abs(currentHeading - goal.theta);
    const shortest_angle = Math.min(angle_diff, 2 * Math.PI - angle_diff);
    alignment_penalty = shortest_angle * ALIGN_WEIGHT;
  }

  // Si no hay mapa de gradiente, devolvemos euclidiana ponderada + alineacion
  if (!macroContext || !macroContext.gradientMap) {
    return (h_euclidean * BASE_HEURISTIC_WEIGHT_DYN) + alignment_penalty;
  }

  const { graph, gradientMap } = macroContext;

  // MAURI DEBUG: Check if gradient is working
  if (Math.random() < 0.0005) {
    const keys = Object.keys(gradientMap);
    console.log(`[A* Heuristic] MacroContext Active. GradientMap Size: ${keys.length}. Sample Cost: ${gradientMap[keys[0]]}`);
  }

  let minCost = Infinity; //se va a buscar el min costo, de los nodos cercanos, por eso se declara la variable en infinito

  // Optimización: Buscar solo nodos rojos cercanos.
  // Como no tenemos índice espacial eficiente aquí, iteramos todos (N ~ 200-500 es aceptable en JS moderno).

  // Radius check optimization: Only consider nodes within 50m to avoid evaluating far-off paths

  const nodes = Object.values(graph);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const combinedCost = gradientMap[node.id];

    if (combinedCost === undefined || combinedCost === Infinity) continue;

    // Distancia física al nodo rojo
    const d = Math.hypot(pos.x - node.x, pos.z - node.z);
    if (d > 50) continue; // Solo considerar nodos en un radio de 50m

    const GRADIENT_WEIGHT = weightOverrides.gradient_weight ?? config.gradient_weight ?? 5.0;
    const BASE_HEURISTIC_WEIGHT_DYN = weightOverrides.base_heuristic_weight ?? config.base_heuristic_weight ?? 15.0;
    const ALIGN_WEIGHT = 5.0; // Penalización por mala orientación

    // Calcular penalización por orientación
    let headingPenalty = 0;
    const currentHeading = (pos.theta !== undefined) ? pos.theta : pos.heading;

    if (currentHeading !== undefined) {
      const angleToNode = Math.atan2(node.x - pos.x, node.z - pos.z);
      let diff = Math.abs(currentHeading - angleToNode);
      while (diff > Math.PI) diff -= 2 * Math.PI;
      diff = Math.abs(diff);
      headingPenalty = diff * ALIGN_WEIGHT;
    }

    // Heurística combinada: Costo Dijkstra + Distancia al nodo + Orientación
    const totalH = (combinedCost * GRADIENT_WEIGHT) + (d * BASE_HEURISTIC_WEIGHT_DYN) + headingPenalty;

    if (totalH < minCost) {
      minCost = totalH;
    }
  }
  // Fallback
  return minCost === Infinity ? h_euclidean : minCost;
};

// MAURI: Función Principal del Buscador de Caminos (A*)
export async function findPathAsync(
  start,
  goal,
  gridData,
  cellSize,
  onProgress, //es una funcion que se le pasa(en js se puede hacer), que se llama cada cierto numero de iteraciones para actualizar la visualizacion del proceso de busqueda, pasando una copia de la lista de nodos explorados hasta el momento.
  macroContext = null, // { graph, gradientMap }
  weightOverrides = {}  // MAURI: Allow overriding weights locally
) {
  const { config } = useStore.getState();
  // Resetear flag de cancelación al iniciar nueva búsqueda
  useStore.setState({ pathfindingCancelled: false });
  const DEBUG_ITER_LIMIT = config.debug_iter_limit || 50000;
  const BACKWARD_WEIGHT = weightOverrides.backward_weight ?? config.backward_weight ?? 50.0;
  const BACKWARD_FREE_DIST = weightOverrides.backward_free_distance ?? config.backward_free_distance ?? 10.0;
  const STEERING_COST = weightOverrides.steering_cost ?? config.steering_cost ?? 0.5;
  const GEAR_SWITCH_COST = weightOverrides.gear_switch_cost ?? config.gear_switch_cost ?? 50.0;
  const STEERING_CHANGE_COST = weightOverrides.steering_change_cost ?? config.steering_change_cost ?? 0.1; // MAURI: Smoothness penalty
  const STEP_SIZE = config.step_size || 1.5; // MAURI: Dynamic Step Size
  // MAURI: Density Penalty Config
  const DENSITY_WEIGHT = weightOverrides.density_weight ?? config.density_weight ?? 0.0;
  const SECTOR_SIZE = 5.0; // 5 meters grid for density counting
  const COLLISION_MARGIN = config.collision_margin !== undefined ? config.collision_margin : 0.7;

  console.log(`[A*] Starting search with weights:`, {
    heuristic_weight: weightOverrides.base_heuristic_weight ?? config.base_heuristic_weight,
    backward_weight: BACKWARD_WEIGHT,
    backward_free_dist: BACKWARD_FREE_DIST,
    steering_cost: STEERING_COST,
    density_weight: DENSITY_WEIGHT
  });

  const MIN_MANEUVER_LENGTH = VEHICLE_CONFIG.LENGTH; // Mínimo 1 largo de auto antes de cambiar marcha

  // Initialize
  const openSet = [
    //openSet es la lista de nodos que estan por explorar, se inicializa con el nodo de inicio.
    new Node( //genero un nuevo nodo y le paso las coordenadas del nodo inicial, el costo g es 0 porque es el nodo de partida, y el costo h se calcula con la función heurística.
      start.x, //ubicacion fisica del nodo en x
      start.z, //ubicacion fisica del nodo en z
      start.heading, //orientacion del nodo
      0, //costo real (g) inicia en 0 porque es el nodo inicial
      heuristic(start, goal, macroContext, weightOverrides), //costo heurístico (h) se calcula con la función heurística, que combina la distancia al objetivo y el costo del gradiente
      null, 0, 1, 1.0, 0 // MAURI: Weight = 1.0 because heuristic() already contains weights!
    ),
  ];
  // ... rest of init ...
  const closedSet = new Map(); //closedSet es un mapa que se usa para llevar un registro de los nodos ya explorados, con su costo g más bajo encontrado hasta ahora. La clave es una cadena que representa el estado (x, z, theta) y el valor es el costo g asociado a ese estado.
  const explored = []; //explored es una lista de nodos que han sido explorados, se usa para visualización y depuración. Se llena con las coordenadas de cada nodo que se saca del openSet para ser evaluado.
  const densityMap = new Map(); // MAURI: Density Map

  for (let iter = 0; iter < DEBUG_ITER_LIMIT; iter++) {
    // ... yield logic ...
    if (iter % 200 === 0) {
      //cada 200 iteraciones ejecuta el siguiente codigo...
      if (onProgress) onProgress([...explored]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      // Comprobar si se canceló el pathfinding
      if (useStore.getState().pathfindingCancelled) {
        console.warn("A*: Búsqueda cancelada por el usuario.");
        return { path: null, explored };
      }
    }

    if (openSet.length === 0) {
      console.warn("A*: OpenSet vacío. No hay ruta posible.");
      break;
    }

    // Simple sort for Priority Queue
    openSet.sort((a, b) => a.f - b.f);
    const curr = openSet.shift();

    // MAURI DEBUG VERBOSE
    if (iter % 50 === 0 && config.show_path_debug) {
      console.log(`[A* Iter ${iter}] Pos: (${curr.x.toFixed(1)}, ${curr.z.toFixed(1)}) G: ${curr.g.toFixed(1)} H: ${curr.h.toFixed(1)} F: ${curr.f.toFixed(1)}`);
    }

    // ... standard A* logic follows ...

    const stateKey = `${Math.round(curr.x)},${Math.round(curr.z)},${Math.round(curr.theta / ANGLE_RES)}`; //stateKey es una cadena que representa el estado actual del nodo, redondeando las coordenadas x, z y la orientación theta a un múltiplo de ANGLE_RES para reducir la cantidad de estados únicos y mejorar la eficiencia. Esto ayuda a agrupar estados similares y evitar explorar infinitos estados debido a pequeñas variaciones en la posición o ángulo.

    if (closedSet.has(stateKey) && closedSet.get(stateKey) <= curr.g) continue; //evalua si el nodo definido por stateKey ya fue explorado con un costo g menor o igual al costo g del nodo actual (curr). Si es así, significa que ya se encontró una ruta más eficiente a ese estado, por lo que se omite la evaluación de este nodo actual y se continúa con el siguiente nodo en el openSet.

    closedSet.set(stateKey, curr.g); //si el nodo actual no fue explorado antes o se encontró una ruta más eficiente, se actualiza el closedSet con el costo g del nodo actual para ese estado. Esto asegura que si se vuelve a encontrar este estado con un costo g mayor, se pueda omitir en futuras evaluaciones.

    explored.push({ x: curr.x, z: curr.z }); //agrega las coordenadas del nodo actual a la lista explored, que se usa para visualización y depuración del proceso de búsqueda. Esto permite ver qué nodos han sido evaluados durante la ejecución del algoritmo.

    // Distancia en línea recta a la meta
    const distToGoal = Math.hypot(curr.x - goal.x, curr.z - goal.z);

    // CONDICIÓN DE ÉXITO — configurable desde la UI
    const ARRIVAL_TOLERANCE = config.goal_tolerance || 2.0;

    // MAURI: "Analytic Shot" (Tiro Directo)
    // Si estamos cerca (< 6m) y hay línea de visión directa, conectamos y terminamos.
    if (distToGoal < 6.0) {
      // Chequear colisión en el punto medio y en el destino final
      const midX = (curr.x + goal.x) / 2;
      const midZ = (curr.z + goal.z) / 2;
      // Asumimos que si el inicio y el fin estan libres, y el medio tambien, es viable (para distancias cortas)
      // Usamos un margen un poco mas fino (0.7) para permitir el "atraque"
      if (!isCollision(goal.x, goal.z, curr.theta, gridData, cellSize, 0.7) &&
        !isCollision(midX, midZ, curr.theta, gridData, cellSize, 0.7)) {

        // Construir camino
        const path = [];
        let t = curr;
        while (t) {
          path.push({ x: t.x, z: t.z, steer: t.steer, direction: t.direction });
          t = t.parent;
        }
        // Agregamos el goal final
        path.reverse();
        path.push({ x: goal.x, z: goal.z, steer: 0, direction: curr.direction });

        return { path: smoothPath(path, gridData, cellSize), explored };
      }
    }

    if (distToGoal < ARRIVAL_TOLERANCE) {
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

    // --- EXPANSIÓN DE VECINOS ---
    const nextMoves = [];

    // --- EXPANSIÓN DE VECINOS (OPTIMIZADA) ---
    const directions = [1, -1];

    for (const d of directions) {
      if (d !== curr.direction) {
        // --- GEAR SWITCH LOGIC (Liberated) ---
        // MAURI: Allow all steer steps when switching gears. 
        // This allows moving straight back/forward and taking any angle.
        for (const s of STEER_STEPS) {
          nextMoves.push({ d, s });
        }
      } else {
        // --- TRAFFIC CONTINUITY (Same Gear) ---
        // Allow all steps to maintain smooth path
        for (const s of STEER_STEPS) {
          nextMoves.push({ d, s });
        }
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

      if (isCollision(nextX, nextZ, nextTheta, gridData, cellSize, COLLISION_MARGIN))
        continue;

      // MAURI: COSTO PROGRESIVO PARA MARCHA ATRÁS
      let backwardMultiplier = 1.0;
      if (d === -1) {
        const reverseDist = (curr.direction === -1 ? curr.distanceSinceGearSwitch : 0) + STEP_SIZE;
        const rampFactor = Math.min(1.0, (reverseDist / BACKWARD_FREE_DIST) ** 2);

        // MAURI: Escalamiento dinámico. 
        // Solo aplicamos el greedyScale a la parte penalizada (BACKWARD_WEIGHT)
        // El costo base se mantiene bajo para permitir la 'distancia libre'
        const greedyScale = Math.max(1.0, (weightOverrides.base_heuristic_weight ?? config.base_heuristic_weight ?? 15.0) / 10.0);
        backwardMultiplier = 1.5 + (BACKWARD_WEIGHT * greedyScale - 1.5) * rampFactor;

        if (iter % 1000 === 0) {
          console.log(`[A* Reverse] Dist: ${reverseDist.toFixed(1)}m, Free: ${BACKWARD_FREE_DIST}m, Mult: ${backwardMultiplier.toFixed(1)}`);
        }
      }

      // MAURI: Density Penalty (Exploration Control)
      const sectorX = Math.floor(nextX / SECTOR_SIZE);
      const sectorZ = Math.floor(nextZ / SECTOR_SIZE);
      const sectorKey = `${sectorX},${sectorZ}`;
      const density = densityMap.get(sectorKey) || 0;

      let moveCost =
        STEP_SIZE * backwardMultiplier +
        Math.abs(s) * STEERING_COST +
        density * DENSITY_WEIGHT; // <--- MAURI: Penalize explored areas

      // MAURI: Smoothness Penalty (Steering Change)
      // Penalize difference between current steer and next steer 's'
      moveCost += Math.abs(curr.steer - s) * STEERING_CHANGE_COST;

      // MAURI: Parking Penalty
      const cx = Math.floor(nextX / cellSize) * cellSize + cellSize / 2;
      const cz = Math.floor(nextZ / cellSize) * cellSize + cellSize / 2;
      const nextCell = gridData[`${cx},${cz}`];
      if (nextCell && nextCell.type === "parking") {
        moveCost *= 5.0;
      }

      const nextG = curr.g + moveCost;

      // Update density for this sector
      densityMap.set(sectorKey, density + 1);

      // Switch Cost: Penalización por cambio de marcha (Drive <-> Reverse).
      const dirChangeCost = curr.direction !== d ? GEAR_SWITCH_COST : 0;

      // MAURI: PESO DINÁMICO PROGRESIVO
      let dynamicWeight = weightOverrides.base_heuristic_weight ?? config.base_heuristic_weight ?? 50.0;
      if (iter > 1000) {
        dynamicWeight += (iter - 1000) / 2000;
      }

      // MAURI: Y-Turn Logic (Minimum Maneuver Length)
      let nextDistanceSinceSwitch = 0;
      if (curr.direction !== d) {
        // Gear Switch!
        // Check if previous segment was long enough
        if (curr.distanceSinceGearSwitch < MIN_MANEUVER_LENGTH && curr.parent !== null) {
          // Penalize short zig-zags heavily (or forbid them)
          // Forbidding is safer to enforce Y-turn shape.
          continue;
        }
        nextDistanceSinceSwitch = 0; // Reset counter
      } else {
        nextDistanceSinceSwitch = curr.distanceSinceGearSwitch + STEP_SIZE;
      }

      openSet.push(
        new Node(
          nextX,
          nextZ,
          nextTheta,
          nextG + dirChangeCost,
          heuristic({ x: nextX, z: nextZ, theta: nextTheta }, goal, macroContext, weightOverrides), // <--- Updated to use macroContext AND Theta
          curr,
          s,
          d,
          1.0, // MAURI: Use 1.0, heuristic already weighted
          nextDistanceSinceSwitch // Pass new distance
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
  const iterations = 60; // Más iteraciones = esquinas más redondeadas
  const weightCurrent = 0.3;  // Punto actual tiene menos influencia
  const weightNeighbors = 0.35; // Vecinos tiran más → redondea las puntas

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
