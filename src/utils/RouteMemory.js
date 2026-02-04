/**
 * RouteMemory.js
 * Sistema de "Memoria de Rutas" para optimizar el pathfinding.
 * Almacena rutas exitosas y permite encontrar "atajos" si pasamos por un nodo conocido.
 */

class RouteMemory {
    constructor() {
        this.routes = []; // Almacena arrays de rutas completas
        this.nodeIndex = new Map(); // Mapa de búsueda rápida: "x,z" -> [{ routeId, index }, ...]
        this.maxRoutes = 50; // Límite para no saturar memoria
    }

    /**
     * Aprende una nueva ruta exitosa.
     * @param {Array} path - Array de nodos {x, z, ...}
     */
    learn(path) {
        if (!path || path.length < 10) return; // Ignorar rutas muy cortas

        // Limpieza si llenamos la memoria
        if (this.routes.length >= this.maxRoutes) {
            this.routes.shift(); // Borra la más vieja (FIFO simple)
            this.rebuildIndex();
        }

        const routeId = this.routes.length;
        this.routes.push(path);

        // Indexamos cada nodo de la ruta
        path.forEach((node, index) => {
            // Redondeamos para tolerar pequeñas desviaciones (grid snapping)
            const key = `${Math.round(node.x)},${Math.round(node.z)}`;

            if (!this.nodeIndex.has(key)) {
                this.nodeIndex.set(key, []);
            }
            this.nodeIndex.get(key).push({ routeId, index });
        });

        console.log(`[RouteMemory] Ruta aprendida #${routeId} (${path.length} nodos)`);
    }

    /**
     * Busca si desde la posición actual (x, z) existe un camino conocido
     * que termine cerca del objetivo (goalX, goalZ).
     * 
     * @returns {Array|null} Tramo de ruta (shortcut) o null si no existe.
     */
    findShortcut(x, z, goalX, goalZ) {
        const key = `${Math.round(x)},${Math.round(z)}`;
        const matches = this.nodeIndex.get(key);

        if (!matches) return null;

        // Buscamos si alguna de las rutas que pasan por aquí termina en el Goal
        for (const match of matches) {
            const route = this.routes[match.routeId];
            if (!route) continue;

            const lastNode = route[route.length - 1];
            const distToGoal = Math.hypot(lastNode.x - goalX, lastNode.z - goalZ);

            // Si el final de esta ruta conocida coincide con nuestro destino actual (< 3m)
            if (distToGoal < 3.0) {
                // Encontramos un atajo! Devolvemos el resto de la ruta desde este punto
                // Copiamos para no mutar la memoria original
                console.log(`[RouteMemory] Atajo encontrado en ruta #${match.routeId}!`);
                return route.slice(match.index);
            }
        }

        return null;
    }

    rebuildIndex() {
        this.nodeIndex.clear();
        this.routes.forEach((route, routeId) => {
            route.forEach((node, index) => {
                const key = `${Math.round(node.x)},${Math.round(node.z)}`;
                if (!this.nodeIndex.has(key)) {
                    this.nodeIndex.set(key, []);
                }
                this.nodeIndex.get(key).push({ routeId, index });
            });
        });
    }
}

// Exportamos una instancia única (Singleton)
export const routeMemory = new RouteMemory();
