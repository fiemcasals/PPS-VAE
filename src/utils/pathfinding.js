import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";
import { useStore } from "../store/useStore.js";

const ANGLE_RES = Math.PI / 16;
//const STEER_STEPS = [-0.6, -0.3, 0, 0.3, 0.6];
const STEER_STEPS = [-0.4, 0, 0.4];

const { config } = useStore.getState();
//le asigna el peso de distancia
const BASE_HEURISTIC_WEIGHT = config.base_heuristic_weight;

class Node {
  constructor(
    x, //posicion del nodo en x
    z, //posicion del nodo en z
    theta, //orientacion del nodo
    g, //costo real
    h, //heuristica
    parent = null, //padre del nodo
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
  theta, //orientacion del auto
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



const heuristic = (pos, goal, weightOverrides = {}) => {
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

  //VAMOS A SACAR MOMENTANEAMENTE LO DE ALINEACION
  //return (h_euclidean * BASE_HEURISTIC_WEIGHT_DYN) + alignment_penalty;
  return h_euclidean * BASE_HEURISTIC_WEIGHT_DYN;
};

// MAURI: Función Principal del Buscador de Caminos (A*)
export async function findPathAsync(
  start, //posicion inicial
  goal, //posicion final
  gridData, //datos de la grilla
  cellSize, //tamaño de la celda
  onProgress, //es una funcion que se le pasa(en js se puede hacer), que se llama cada cierto numero de iteraciones para actualizar la visualizacion del proceso de busqueda, pasando una copia de la lista de nodos explorados hasta el momento.
  weightOverrides = {}  // MAURI: Allow overriding weights locally
) {
  const { config } = useStore.getState();
  // Resetear flag de cancelación al iniciar nueva búsqueda
  useStore.setState({ pathfindingCancelled: false });
  const DEBUG_ITER_LIMIT = config.debug_iter_limit || 50000;
  const BACKWARD_WEIGHT = weightOverrides.backward_weight ?? config.backward_weight ?? 50.0;
  const BACKWARD_FREE_DIST = weightOverrides.backward_free_distance ?? config.backward_free_distance ?? 10.0;
  const STEERING_COST = weightOverrides.steering_cost ?? config.steering_cost ?? 0.5;
  const STEER_CHANGE_COST = weightOverrides.steering_change_cost ?? config.steering_change_cost ?? 1.0;
  const GEAR_SWITCH_COST = weightOverrides.gear_switch_cost ?? config.gear_switch_cost ?? 50.0;
  const STEP_SIZE = config.step_size || 1.5; // MAURI: Dynamic Step Size
  const COLLISION_MARGIN = config.collision_margin !== undefined ? config.collision_margin : 0.7;

  console.log(`[A*] STARTING SEARCH. Weights -> Heuristic: ${weightOverrides.base_heuristic_weight ?? config.base_heuristic_weight}, Steer: ${STEERING_COST}, Smooth: ${STEER_CHANGE_COST}, Gear: ${GEAR_SWITCH_COST}, Back: ${BACKWARD_WEIGHT}`);

  const MIN_MANEUVER_LENGTH = VEHICLE_CONFIG.LENGTH; // Mínimo 1 largo de auto antes de cambiar marcha

  // Initialize
  const openSet = [
    //openSet es la lista de nodos que estan por explorar, se inicializa con el nodo de inicio.
    new Node( //genero un nuevo nodo y le paso las coordenadas del nodo inicial, el costo g es 0 porque es el nodo de partida, y el costo h se calcula con la función heurística.
      start.x, //ubicacion fisica del nodo en x
      start.z, //ubicacion fisica del nodo en z
      start.heading, //orientacion del nodo
      0, //costo real (g) inicia en 0 porque es el nodo inicial
      heuristic(start, goal, weightOverrides), //costo heurístico (h) se calcula con la función heurística
      null, 0, 1, 1.0, 0 // MAURI: Weight = 1.0 because heuristic() already contains weights!
    ),
  ];
  // ... rest of init ...
  const closedSet = new Map(); //closedSet es un mapa que se usa para llevar un registro de los nodos ya explorados, con su costo g más bajo encontrado hasta ahora. La clave es una cadena que representa el estado (x, z, theta) y el valor es el costo g asociado a ese estado.
  const explored = []; //explored es una lista de nodos que han sido explorados, se usa para visualización y depuración. Se llena con las coordenadas de cada nodo que se saca del openSet para ser evaluado.

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

    // MAURI DEBUG VERBOSE - Comentado a pedido del usuario
    /*
    if (iter % 50 === 0 && config.show_path_debug) {
      console.log(`[A* Iter ${iter}] Pos: (${curr.x.toFixed(1)}, ${curr.z.toFixed(1)}) G: ${curr.g.toFixed(1)} H: ${curr.h.toFixed(1)} F: ${curr.f.toFixed(1)}`);
    }
    */

    // ... standard A* logic follows ...

    const stateKey = `${Math.round(curr.x)},${Math.round(curr.z)},${Math.round(curr.theta / ANGLE_RES)}`; //stateKey es una cadena que representa el estado actual del nodo, redondeando las coordenadas x, z y la orientación theta a un múltiplo de ANGLE_RES para reducir la cantidad de estados únicos y mejorar la eficiencia. Esto ayuda a agrupar estados similares y evitar explorar infinitos estados debido a pequeñas variaciones en la posición o ángulo.

    if (closedSet.has(stateKey) && closedSet.get(stateKey) <= curr.g) continue; //evalua si el nodo definido por stateKey ya fue explorado con un costo g menor o igual al costo g del nodo actual (curr). Si es así, significa que ya se encontró una ruta más eficiente a ese estado, por lo que se omite la evaluación de este nodo actual y se continúa con el siguiente nodo en el openSet.

    closedSet.set(stateKey, curr.g); //si el nodo actual no fue explorado antes o se encontró una ruta más eficiente, se actualiza el closedSet con el costo g del nodo actual para ese estado. Esto asegura que si se vuelve a encontrar este estado con un costo g mayor, se pueda omitir en futuras evaluaciones.

    explored.push({ x: curr.x, z: curr.z }); //agrega las coordenadas del nodo actual a la lista explored, que se usa para visualización y depuración del proceso de búsqueda. Esto permite ver qué nodos han sido evaluados durante la ejecución del algoritmo.

    // Distancia en línea recta a la meta
    const distToGoal = Math.hypot(curr.x - goal.x, curr.z - goal.z);

    // CONDICIÓN DE ÉXITO — configurable desde la UI
    const ARRIVAL_TOLERANCE = config.goal_tolerance;

    // MAURI: "Analytic Shot" (Tiro Directo)
    // Si estamos cerca (< 6m) y hay línea de visión directa, conectamos y terminamos.
    if (distToGoal < 6.0) {
      // Chequear colisión en el punto medio y en el destino final
      const midX = (curr.x + goal.x) / 2;
      const midZ = (curr.z + goal.z) / 2;
      // Asumimos que si el inicio y el fin están libres, y el medio también, es viable
      if (!isCollision(goal.x, goal.z, curr.theta, gridData, cellSize, 0.7) &&
        !isCollision(midX, midZ, curr.theta, gridData, cellSize, 0.7)) {

        // Construir camino
        const path = [];
        let t = curr;
        while (t) {
          path.push({ x: t.x, z: t.z, theta: t.theta, steer: t.steer, direction: t.direction });
          t = t.parent;
        }
        // Agregamos el goal final
        path.reverse();
        path.push({ x: goal.x, z: goal.z, theta: curr.theta, steer: 0, direction: curr.direction });

        return { path: smoothPath(path, gridData, cellSize), explored };
      }
    }

    if (distToGoal < ARRIVAL_TOLERANCE) {
      // Reconstruimos el camino yendo hacia atrás desde el nodo final hasta el inicio
      const path = [];
      let t = curr;
      while (t) {
        path.push({ x: t.x, z: t.z, theta: t.theta, steer: t.steer, direction: t.direction });
        t = t.parent;
      }
      const rawPath = path.reverse();
      // Aplicamos un suavizado final para quitar el "tembleque" del camino
      return { path: smoothPath(rawPath, gridData, cellSize), explored };
    }

    // --- EXPANSIÓN DE VECINOS ---
    const nextMoves = [];

    // --- EXPANSIÓN DE VECINOS ---
    const directions = [1, -1];

    for (const d of directions) {
      for (const s of STEER_STEPS) {
        nextMoves.push({ d, s });
      }
    }

    for (const move of nextMoves) {
      const d = move.d; //dirección
      const s = move.s; //pasos de dirección
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
        // El costo base se mantiene bajo para permitir la 'distancia libre' (mínimo 1.5)
        backwardMultiplier = 1 + (BACKWARD_WEIGHT - 1) * rampFactor;
      }

      // Switch Cost: Penalización por cambio de marcha (Drive <-> Reverse).
      const dirChangeCost = curr.direction !== d ? GEAR_SWITCH_COST : 0;

      let moveCost =
        STEP_SIZE * backwardMultiplier + //penalizacion por marcha atras
        Math.abs(s) * STEERING_COST + // Penalizar ángulo
        Math.abs(curr.steer - s) * STEER_CHANGE_COST + dirChangeCost; // Penalizar brusquedad

      const nextG = curr.g + moveCost;


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
          nextG,
          heuristic({ x: nextX, z: nextZ, theta: nextTheta }, goal, weightOverrides), // <--- Updated to use Theta
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
