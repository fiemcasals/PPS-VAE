import { VEHICLE_CONFIG } from "../components/Vehicle/Physics/vehicleConfig.js";
import { useStore } from "../store/useStore.js";

const ANGLE_RES = Math.PI / 16; //la franja de angulos que va a
const STEER_STEPS = [-0.4, 0, 0.4]; // son el angulo maximo de giro, por los tres numeros, los resultados son las direcciones de exploracion de cada nodo, en este caso, tres hacia adelante y tres hacia atras
const STEP_SIZE = 2; //es el largo del paso

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

const heuristic = (pos, goal, macroContext) => {
  const h_euclidean = Math.hypot(pos.x - goal.x, pos.z - goal.z); //costo por la distancia euclidiana al objetivo

  if (!macroContext || !macroContext.gradientMap) return h_euclidean; //validacion para ver si existe el mapa de gradiente.

  const { graph, gradientMap } = macroContext;
  let minCost = Infinity; //se va a buscar el min costo, de los nodos cercanos, por eso se declara la variable en infinito

  // Optimización: Buscar solo nodos rojos cercanos.
  // Como no tenemos índice espacial eficiente aquí, iteramos todos (N ~ 200-500 es aceptable en JS moderno).

  // Radius check optimization: Only consider nodes within 50m to avoid evaluating far-off paths

  const nodes = Object.values(graph); //usamos el metodo que nos permite levantas todos los valores de los objetos(nodos rojos), del graph.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const combinedCost = gradientMap[node.id];

    // Si el nodo es inalcanzable (infinito) o su costo total es muy alto comparado con el mejor encontrado, continua
    if (combinedCost === Infinity || combinedCost > minCost) continue;

    // Distancia física al nodo rojo
    const d = Math.hypot(pos.x - node.x, pos.z - node.z);
    if (d > 50) continue; // Si el nodo está a más de 50m, ignoralo y pasá al siguiente.

    const { config } = useStore.getState();
    const GRADIENT_WEIGHT = config.gradient_weight || 5.0;
    const BASE_HEURISTIC_WEIGHT_DYN = config.base_heuristic_weight || 10.0;

    const totalH = combinedCost * GRADIENT_WEIGHT + d * BASE_HEURISTIC_WEIGHT_DYN; // Costo total: combinación del costo del gradiente y la distancia física al nodo rojo

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
) {
  const { config } = useStore.getState();
  const DEBUG_ITER_LIMIT = config.debug_iter_limit || 50000;
  const BACKWARD_WEIGHT = config.backward_weight || 200.0;
  const STEERING_COST = config.steering_cost || 20.0;
  const GEAR_SWITCH_COST = config.gear_switch_cost || 50.0;

  // Initialize
  const openSet = [
    //openSet es la lista de nodos que estan por explorar, se inicializa con el nodo de inicio.
    new Node( //genero un nuevo nodo y le paso las coordenadas del nodo inicial, el costo g es 0 porque es el nodo de partida, y el costo h se calcula con la función heurística.
      start.x, //ubicacion fisica del nodo en x
      start.z, //ubicacion fisica del nodo en z
      start.heading, //orientacion del nodo
      0, //costo real (g) inicia en 0 porque es el nodo inicial
      heuristic(start, goal, macroContext), //costo heurístico (h) se calcula con la función heurística, que combina la distancia al objetivo y el costo del gradiente
    ),
  ];
  // ... rest of init ...
  const closedSet = new Map(); //closedSet es un mapa que se usa para llevar un registro de los nodos ya explorados, con su costo g más bajo encontrado hasta ahora. La clave es una cadena que representa el estado (x, z, theta) y el valor es el costo g asociado a ese estado.
  const explored = []; //explored es una lista de nodos que han sido explorados, se usa para visualización y depuración. Se llena con las coordenadas de cada nodo que se saca del openSet para ser evaluado.

  for (let iter = 0; iter < DEBUG_ITER_LIMIT; iter++) {
    // ... yield logic ...
    if (iter % 200 === 0) {
      //cada 200 iteraciones ejecuta el siguiente codigo...
      if (onProgress) onProgress([...explored]); //evalua si onProgress existe, y si es asi, llama a la función onProgress pasando una copia de la lista explored. Esto permite actualizar la visualización del proceso de búsqueda en tiempo real.
      // onProgress es una variable que define
      // los tres puntos previos de explored, asegura que se envia una copia, no el vector original, para evitar problemas de referencia y mutación externa.
      await new Promise((resolve) => setTimeout(resolve, 0));
      // await hace que el algoritmo se detenga exactamente en esa línea y no pase a la siguiente hasta que la Promesa se resuelva. Resolverse seria esperar un cierto tiempo. Resolve es simplemente una funcion que lo unico que hace es decir "ya esperamos el tiempo" es como un boton que se aprieta desp de que pase el tiempo, y permite salir del wait.
      //esto permite hacer otras cosas como mover la pantalla, ya que mientras explora los nodos, esta todo tildado.
    }

    if (openSet.length === 0) {
      //evalua si openSet (nodos explorados) es igual a 0.
      console.warn("A*: OpenSet vacío. No hay ruta posible.");
      break;
    }

    // Simple sort for Priority Queue (JS array is fast enough for small sets, otherwise MinHeap)
    openSet.sort((a, b) => a.f - b.f);
    const curr = openSet.shift(); //shift() elimina el primer elemento del array (el nodo con menor f) y lo devuelve para ser evaluado como el nodo actual (curr).

    // ... standard A* logic follows ...

    const stateKey = `${Math.round(curr.x)},${Math.round(curr.z)},${Math.round(curr.theta / ANGLE_RES)}`; //stateKey es una cadena que representa el estado actual del nodo, redondeando las coordenadas x, z y la orientación theta a un múltiplo de ANGLE_RES para reducir la cantidad de estados únicos y mejorar la eficiencia. Esto ayuda a agrupar estados similares y evitar explorar infinitos estados debido a pequeñas variaciones en la posición o ángulo.

    if (closedSet.has(stateKey) && closedSet.get(stateKey) <= curr.g) continue; //evalua si el nodo definido por stateKey ya fue explorado con un costo g menor o igual al costo g del nodo actual (curr). Si es así, significa que ya se encontró una ruta más eficiente a ese estado, por lo que se omite la evaluación de este nodo actual y se continúa con el siguiente nodo en el openSet.

    closedSet.set(stateKey, curr.g); //si el nodo actual no fue explorado antes o se encontró una ruta más eficiente, se actualiza el closedSet con el costo g del nodo actual para ese estado. Esto asegura que si se vuelve a encontrar este estado con un costo g mayor, se pueda omitir en futuras evaluaciones.

    explored.push({ x: curr.x, z: curr.z }); //agrega las coordenadas del nodo actual a la lista explored, que se usa para visualización y depuración del proceso de búsqueda. Esto permite ver qué nodos han sido evaluados durante la ejecución del algoritmo.

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

    // --- EXPANSIÓN DE VECINOS ---
    const nextMoves = [];

    // 1. Lógica de Avance (d: 1)
    if (curr.direction === -1) {
      // CAMBIO DE MARCHA: Si venía de atrás, para ir adelante...
      // MAURI FIX: Mantener el mismo ángulo de giro para continuidad
      nextMoves.push({ d: 1, s: curr.steer });
    } else {
      // CONTINUIDAD: Si ya venía de adelante, usa TODOS los pasos definidos
      for (const s of STEER_STEPS) {
        nextMoves.push({ d: 1, s });
      }
    }

    // --- OPCIONES PARA IR HACIA ATRÁS (d: -1) ---
    if (curr.direction === 1) {
      // CAMBIO DE MARCHA: Si venía de adelante, para ir atrás...
      // MAURI FIX: Mantener el mismo ángulo de giro para continuidad
      nextMoves.push({ d: -1, s: curr.steer });
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
        (d === 1 ? STEP_SIZE : STEP_SIZE * BACKWARD_WEIGHT) +
        Math.abs(s) * STEERING_COST;

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
          dynamicWeight,
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
