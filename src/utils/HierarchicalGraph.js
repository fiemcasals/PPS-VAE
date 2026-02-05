
// HierarchicalGraph.js
// Implementación de Grafo Jerárquico para navegación urbana optimizada.
// Transforma una grilla de celdas en un grafo de intersecciones.

export class HierarchicalGraph {
    constructor() {
        this.nodes = new Map(); // "x,z" -> { x, z, type, isCore }
        this.edges = new Map(); // "x,z" -> [ { targetId, cost, geometry: [{x,z}], direction } ]
        this.isBuilt = false;
    }

    // --- FASE 1: CONSTRUCCIÓN DEL GRAFO ---

    // Convierte la GridData (Celdas) en Nodos (Intersecciones) y Aristas (Calles)
    buildGraphFromGrid(gridData, gridSize) {
        console.log(`🏗️ [Graph] Iniciando construcción del Grafo Urbano... GridSize: ${gridSize} (${typeof gridSize})`);
        this.nodes.clear();
        this.edges.clear();

        const roadCells = [];

        // 1. Identificar todas las celdas de "calle" (road/intersection/destination)
        Object.entries(gridData).forEach(([key, val]) => {
            if (val.type === 'road' || val.type === 'intersection' || val.type === 'destination') {
                const [x, z] = key.split(',').map(Number);
                roadCells.push({ x, z, key, type: val.type });
            }
        });

        // 2. Identificar NODOS (Intersecciones y finales de camino)
        // Una celda es nodo si:
        // - Es 'intersection' o 'destination' explícito.
        // - O tiene > 2 vecinos tipo 'road' (es una T o cruz no marcada).
        // - O tiene exactamente 1 vecino (cul-de-sac).

        roadCells.forEach(cell => {
            if (this.isNode(cell, gridData, gridSize)) {
                this.addNode(cell.x, cell.z, cell.type);
            }
        });

        console.log(`📍 [Graph] Nodos identificados: ${this.nodes.size}`);

        // 3. Generar ARISTAS (Conectar nodos recorriendo el asfalto)
        this.nodes.forEach((node) => {
            this.findEdgesForNode(node, gridData, gridSize);
        });

        this.isBuilt = true;
        console.log(`🔗 [Graph] Aristas generadas. Grafo listo.`);
        return { nodes: this.nodes.size, edges: this.getTotalEdges() };
    }

    isNode(cell, gridData, gridSize) {
        // Si el usuario ya lo marcó como intersección o destino, es nodo fijo.
        if (cell.type === 'intersection' || cell.type === 'destination') return true;

        // Analizar vecinos topológicos
        const neighbors = this.getNeighbors(cell.x, cell.z, gridData, gridSize);
        // Road normal tiene 2 vecinos (camino continuo).
        // Si tiene 1, es final de calle. Si tiene 3 o 4, es intersección implícita.
        // Si tiene 2 pero no están opuestos (es una curva de 90 grados), también podría ser nodo auxiliar para suavizado,
        // pero para grafo topológico estricto, una curva NO es intersección.
        // Aunque para pathfinding preciso, quizás convenga marcar curvas como nodos para aplicar costo de giro.
        // Por simplicidad inicial: Nodos = Intersecciones (>2) o Finales (1) o Esquinas (2 no opuestos).

        if (neighbors.length !== 2) return true; // 1 (fin), 3(T), 4(Cruz)

        // Chequear si es una esquina (2 vecinos pero no alineados)
        const n1 = neighbors[0];
        const n2 = neighbors[1];
        const dx = Math.abs(n1.x - n2.x);
        const dz = Math.abs(n1.z - n2.z);

        // Si están alineados, dx será 2*gridSize (Horizontal) o 0 (Vertical).
        // Si es esquina, dx y dz serán gridSize.
        if (dx > 0 && dz > 0) return true; // Es una esquina (L-shape)

        return false; // Es un tramo recto continuo -> No es nodo
    }

    addNode(x, z, type) {
        const id = `${x},${z}`;
        if (!this.nodes.has(id)) {
            this.nodes.set(id, { id, x, z, type });
            this.edges.set(id, []);
        }
    }

    findEdgesForNode(node, gridData, gridSize) {
        // Desde este nodo, lanzamos exploradores en las 4 direcciones
        // Si encontramos camino, avanzamos hasta topar con OTRO nodo.
        const directions = [
            { dx: 0, dz: -gridSize }, // Norte
            { dx: 0, dz: gridSize },  // Sur
            { dx: -gridSize, dz: 0 }, // Oeste
            { dx: gridSize, dz: 0 }   // Este
        ];

        directions.forEach(dir => {
            const startX = node.x + dir.dx;
            const startZ = node.z + dir.dz;
            const startKey = `${startX},${startZ}`;

            // Si el vecino inmediato es camino, empezamos a trazar la arista
            if (this.isValidRoad(gridData[startKey])) {
                this.traceEdge(node, startX, startZ, dir, gridData, gridSize);
            }
        });
    }

    traceEdge(originNode, startX, startZ, initialDir, gridData, gridSize) {
        let currentX = startX;
        let currentZ = startZ;
        let path = [{ x: currentX, z: currentZ }];
        let totalDist = gridSize; // Ya dimos un paso
        let lastDir = initialDir;

        // Limitador por si acaso (loop infinito)
        for (let i = 0; i < 1000; i++) {
            const currentKey = `${currentX},${currentZ}`;

            // 1. ¿Es este punto un nodo? (Distinto al origen)
            // Si llegamos a otro nodo, cerramos la arista.
            if (this.nodes.has(currentKey)) {
                const targetNode = this.nodes.get(currentKey);

                // Agregar arista Origen -> Destino
                this.edges.get(originNode.id).push({
                    targetId: targetNode.id,
                    cost: totalDist, // Costo base = Distancia
                    geometry: path,  // Puntos intermedios para dibujar/seguir
                    direction: 1     // Doble mano por defecto por ahora
                });
                return;
            }

            // 2. Si no es nodo, debe ser tramo de calle. Buscamos siguiente paso.
            // Debe haber solo 1 vecino válido hacia adelante (porque si hubiera más, sería nodo).
            // Evitamos volver atrás.
            const nextStep = this.getNextStep(currentX, currentZ, lastDir, gridData, gridSize);

            if (!nextStep) {
                // Camino muerto que no es nodo? Raro, debería haber sido detectado como nodo final.
                // Puede pasar si el mapa está incompleto o borradores.
                return;
            }

            currentX = nextStep.x;
            currentZ = nextStep.z;
            path.push({ x: currentX, z: currentZ });
            totalDist += gridSize;

            // Chequear costo de giro implícito si cambió dirección (en esquinas L marcadas como nodos ya cortamos, 
            // pero si el usuario dibuja curvas suaves pixel a pixel...)
            lastDir = nextStep.dir;
        }
    }

    isValidRoad(cell) {
        return cell && (cell.type === 'road' || cell.type === 'intersection' || cell.type === 'destination' || cell.type === 'parking');
    }

    getNextStep(cx, cz, lastDir, gridData, gridSize) {
        // Buscamos vecinos, excluyendo el de donde venimos (lastDir invertido)
        const candidates = [
            { dx: 0, dz: -gridSize },
            { dx: 0, dz: gridSize },
            { dx: -gridSize, dz: 0 },
            { dx: gridSize, dz: 0 }
        ];

        for (let d of candidates) {
            // No volver atrás
            if (d.dx === -lastDir.dx && d.dz === -lastDir.dz) continue;

            const nx = cx + d.dx;
            const nz = cz + d.dz;
            const key = `${nx},${nz}`;

            if (this.isValidRoad(gridData[key])) {
                return { x: nx, z: nz, dir: d };
            }
        }
        return null;
    }

    getNeighbors(cx, cz, gridData, gridSize) {
        const candidates = [
            { dx: 0, dz: -gridSize },
            { dx: 0, dz: gridSize },
            { dx: -gridSize, dz: 0 },
            { dx: gridSize, dz: 0 }
        ];
        let valid = [];
        candidates.forEach(d => {
            const nx = cx + d.dx;
            const nz = cz + d.dz;
            const key = `${nx},${nz}`;

            if (this.isValidRoad(gridData[key])) {
                valid.push({ x: nx, z: nz });
            }
        });
        return valid;
    }


    // --- FASE 2: PATHFINDING JERÁRQUICO ---

    // A* Nivel Alto (Nodos)
    findHighLevelPath(startNodeId, endNodeId) {
        if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) return null;

        const openSet = new Set([startNodeId]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        gScore.set(startNodeId, 0);
        fScore.set(startNodeId, this.heuristic(startNodeId, endNodeId));

        console.log(`🔎 [A*] Start: ${startNodeId} G: ${gScore.get(startNodeId)}`);

        while (openSet.size > 0) {
            // 1. Obtener nodo con menor F
            let current = null;
            let minF = Infinity;
            for (let id of openSet) {
                let f = fScore.get(id) || Infinity;
                if (f < minF) {
                    minF = f;
                    current = id;
                }
            }

            if (current === endNodeId) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.delete(current);

            // 2. Explorar vecinos (Aristas)
            const neighbors = this.edges.get(current) || [];
            for (let edge of neighbors) {
                const neighbor = edge.targetId;

                // CRITICAL FIX: Never loop back to Start Node
                if (neighbor === startNodeId) continue;

                // Costo acumulado: G actual + Costo Arista + Penalización Giro
                if (edge.cost <= 0.1) console.warn(`⚠️ Low cost edge: ${current} -> ${neighbor} Cost=${edge.cost}`);
                const score = gScore.get(current) + edge.cost;

                if (score < (gScore.get(neighbor) || Infinity)) {
                    cameFrom.set(neighbor, { prev: current, edge: edge });
                    gScore.set(neighbor, score);
                    fScore.set(neighbor, score + this.heuristic(neighbor, endNodeId));
                    if (!openSet.has(neighbor)) openSet.add(neighbor);
                }
            }
        }
        return null; // No path
    }

    // Heurística Manhattan para grilla, o Euclidiana
    heuristic(nodeAId, nodeBId) {
        const a = this.nodes.get(nodeAId);
        const b = this.nodes.get(nodeBId);
        return Math.hypot(b.x - a.x, b.z - a.z);
    }

    reconstructPath(cameFrom, current) {
        const totalPath = [];
        let currId = current;

        // Reconstruimos de atrás para adelante las ARISTAS completas
        // Ojo: cameFrom guarda { prev: id, edge: objetoEdge }

        // Primero apilamos los segmentos
        const segments = [];
        let safeguard = 0;
        const LIMIT = 10000;

        while (cameFrom.has(currId)) {
            const data = cameFrom.get(currId);
            segments.push(data.edge);
            currId = data.prev;

            safeguard++;
            if (safeguard > LIMIT) {
                console.error("❌ [Graph] Infinite loop detected in reconstructPath!");
                console.error(`Current: ${currId} Prev: ${data ? data.prev : 'null'}`);
                // Debug cycle
                let trace = currId;
                let steps = 0;
                while (steps < 10 && cameFrom.has(trace)) {
                    const prev = cameFrom.get(trace).prev;
                    console.error(` <- ${prev}`);
                    trace = prev;
                    steps++;
                }
                break;
            }
        }

        // Invertimos para tener orden Inicio -> Fin
        segments.reverse();

        // Aplanamos la geometría
        segments.forEach(edge => {
            // La geometría de la arista incluye el nodo destino? Sí, en traceEdge path incluye steps.
            // Pero path[0] es el primer paso desde Start.
            // Hay que concatenar con cuidado.
            // MAURI FIX: Evitar spread operator en arrays gigantes (RangeError)
            for (let i = 0; i < edge.geometry.length; i++) {
                totalPath.push(edge.geometry[i]);
            }
        });

        return totalPath;
    }

    // Busca el nodo más cercano a una coordenada (x,z)
    findNearestNode(x, z) {
        let nearest = null;
        let minDst = Infinity;
        this.nodes.forEach(node => {
            const d = Math.hypot(node.x - x, node.z - z);
            if (d < minDst) {
                minDst = d;
                nearest = node;
            }
        });
        return nearest;
    }

    // --- FASE 3: RUTEO HÍBRIDO (Local -> Global -> Local) ---

    async findHybridPath(startPos, endPos, gridData, gridSize, localFindPathFn) {
        if (!this.isBuilt) return null;

        console.log("🚀 [Graph] Iniciando Ruteo Híbrido...");

        // 1. Encontrar nodos de entrada/salida más cercanos
        const startNode = this.findNearestNode(startPos.x, startPos.z);
        const endNode = this.findNearestNode(endPos.x, endPos.z);

        if (!startNode || !endNode) {
            console.warn("⚠️ [Graph] No se encontraron nodos cercanos.");
            return null;
        }

        console.log(`📍 [Graph] De (${startPos.x},${startPos.z}) -> Nodo ${startNode.id}`);
        console.log(`📍 [Graph] A (${endPos.x},${endPos.z}) -> Nodo ${endNode.id}`);

        // 2. Calcular Ruta Troncal (Highway)
        const highwayPath = this.findHighLevelPath(startNode.id, endNode.id);

        if (!highwayPath) {
            console.warn("⚠️ [Graph] No hay ruta conectada entre los nodos seleccionados. Intentando fallback local...");
            return await localFindPathFn(startPos, endPos, gridData, gridSize);
        }

        // 3. Calcular Accesos Locales (Last Mile)
        // Access: Start -> StartNode
        // Egress: EndNode -> End

        console.log(`🔎 [Hybrid] Local 1: (${startPos.x},${startPos.z}) -> (${startNode.x},${startNode.z})`);

        // Optimization: Si startPos está MUY cerca de startNode, quizás el path local es trivial.
        const startLocal = await localFindPathFn(
            startPos,
            { x: startNode.x, z: startNode.z },
            gridData,
            gridSize
        );

        console.log(`🔎 [Hybrid] Local 2: (${endNode.x},${endNode.z}) -> (${endPos.x},${endPos.z})`);

        const endLocal = await localFindPathFn(
            { x: endNode.x, z: endNode.z, heading: 0 }, // Heading desconocido al llegar, 0 genérico
            endPos,
            gridData,
            gridSize
        );

        // 4. Ensamblar
        if (startLocal.path && endLocal.path) {
            // Combinar: StartLocal + Highway + EndLocal
            // MAURI FIX: Usar concat para evitar StackOverflow con spread operator
            const fullPath = startLocal.path.concat(highwayPath).concat(endLocal.path);

            console.log(`✅ [Graph] Ruta Híbrida generada: ${fullPath.length} puntos.`);
            return { path: fullPath, explored: [] }; // Explored vacío para no ensuciar mapa
        } else {
            console.error("❌ [Graph] Falló la conexión local. Usando fallback global A*.");
            // Si fallan los tramos locales, intentamos A* puro todo el camino
            return await localFindPathFn(startPos, endPos, gridData, gridSize);
        }
    }

    getTotalEdges() {

        let count = 0;
        this.edges.forEach(list => count += list.length);
        return count;
    }
}

export const hierarchicalGraph = new HierarchicalGraph();
