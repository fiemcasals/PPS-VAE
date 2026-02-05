
export class RouteNetwork {
    constructor() {
        this.routes = new Map(); // startId -> Map(endId -> Path[])
        this.waypoints = []; // Flat list of accessible points: { x, z, heading, targetId, path, indexInPath }
        this.isBuilt = false;
    }

    // --- CONSTRUCCIÓN ---

    // Generar red completa conectando todos con todos (Brute Force optimizado)
    // findPathFn: function(start, end) => Promise<{path: [], cost: number}>
    async buildGlobalNetwork(gridData, gridSize, findPathFn, onProgress) {
        console.log("🌐 [RouteNetwork] Iniciando exploración global de rutas...");

        this.routes.clear();
        this.waypoints = [];

        // 1. Identificar destinos
        const destinations = [];
        Object.entries(gridData).forEach(([key, val]) => {
            if (val.type === 'destination') {
                const [x, z] = key.split(',').map(Number);
                destinations.push({ id: key, x, z, data: val });
            }
        });

        const totalPairs = destinations.length * (destinations.length - 1);
        let processed = 0;
        let successCount = 0;

        // 2. Iterar pares Start -> End
        for (const startNode of destinations) {
            this.routes.set(startNode.id, new Map());

            for (const endNode of destinations) {
                if (startNode.id === endNode.id) continue;

                // Actualizar progreso
                processed++;
                if (onProgress) onProgress((processed / totalPairs) * 100);

                // Calcular ruta (usando la lógica de pathfinding existente)
                // Usamos heading 0 por defecto para la búsqueda general, luego refinamos
                try {
                    const result = await findPathFn(
                        { x: startNode.x, z: startNode.z, heading: 0 },
                        { x: endNode.x, z: endNode.z }
                    );

                    if (result.path && result.path.length > 0) {
                        // Guardar ruta
                        this.routes.get(startNode.id).set(endNode.id, result.path);

                        // Generar Waypoints (Puntos de Enganche)
                        this.sampleWaypoints(result.path, endNode.id);
                        successCount++;
                    }
                } catch (e) {
                    console.warn(`❌ [RouteNetwork] Error routing ${startNode.id} -> ${endNode.id}`, e);
                }
            }
            // Pequeño delay para no bloquear UI
            await new Promise(r => setTimeout(r, 0));
        }

        this.isBuilt = true;
        console.log(`✅ [RouteNetwork] Construcción finalizada. Rutas: ${successCount}, Waypoints: ${this.waypoints.length}`);
    }

    // Muestrear puntos cada X metros para crear "Entradas al Metro"
    sampleWaypoints(path, targetId) {
        const SAMPLE_DIST = 10; // metros
        let distAccum = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const segDist = Math.hypot(p2.x - p1.x, p2.z - p1.z);

            // Calculamos heading del segmento
            // atan2(x, z) para este sistema de coordenadas
            const heading = Math.atan2(p2.x - p1.x, p2.z - p1.z); // dx, dz vs sin/cos logic check

            if (distAccum >= SAMPLE_DIST) {
                this.waypoints.push({
                    x: p1.x,
                    z: p1.z,
                    heading: heading,
                    targetId: targetId,
                    remainingPath: path.slice(i), // Guardamos referencia al resto del camino desde aquí
                    totalDistance: 0 // TODO: Calcular distancia real a meta si se necesita prioridad
                });
                distAccum = 0;
            }
            distAccum += segDist;
        }
    }

    // --- CONSUMO ---

    // Encontrar el mejor punto de enganche hacia un destino
    findBestJoinPoint(vehiclePose, targetId) {
        // vehiclePose: { x, z, heading }
        if (!this.isBuilt) return null;

        // Filtrar waypoints que lleven al target
        const candidates = this.waypoints.filter(wp => wp.targetId === targetId);

        let bestWp = null;
        let minScore = Infinity; // Score = Distancia + Penalización por ángulo

        candidates.forEach(wp => {
            const dist = Math.hypot(wp.x - vehiclePose.x, wp.z - vehiclePose.z);
            if (dist > 100) return; // Optimización: Ignorar muy lejanos

            // Diferencia angular
            let angleDiff = Math.abs(wp.heading - vehiclePose.heading);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

            // REGLA CLAVE: El auto debe estar alineado con el camino (+/- 90 grados)
            // Si el camino va al Norte y el auto mira al Sur, NO sirve (evitar U-turn)
            if (angleDiff > Math.PI / 2) return; // 90 grados tolerancia

            // Score: Preferir cercanía y buena alineación
            // Peso angular alto: 1 grado ~ 1 metro de costo?
            const score = dist + (angleDiff * 10.0);

            if (score < minScore) {
                minScore = score;
                bestWp = wp;
            }
        });

        return bestWp;
    }

    // Obtener ruta guardada completa de A a B (si existe)
    getRoute(startId, endId) {
        if (this.routes.has(startId)) {
            return this.routes.get(startId).get(endId);
        }
        return null;
    }
}

export const routeNetwork = new RouteNetwork();
