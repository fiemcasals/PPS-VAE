import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../store/useStore";

export function AutonomousController() {
    const {
        isAutonomous, currentPath, vehicleState,
        setSteering, setThrottle, setDirection, setAutonomous
    } = useStore();

    const currentIndex = useRef(0);

    useEffect(() => {
        if (!isAutonomous) currentIndex.current = 0;
    }, [isAutonomous]);

    useFrame(() => {
        if (!isAutonomous || !currentPath || currentPath.length === 0) return;

        // --- ACTUALIZACIÓN DE ÍNDICE (Smart Path Tracking) ---
        // En lugar de chequear solo el siguiente, buscamos el nodo más cercano hacia adelante
        // Esto permite "saltar" nodos si cortamos camino o nos desviamos.

        let bestIndex = currentIndex.current;
        let minDesc = Infinity;

        // Mirar hasta 5 nodos adelante (o fin de ruta)
        const searchLimit = Math.min(currentIndex.current + 10, currentPath.length - 1);

        for (let i = currentIndex.current; i <= searchLimit; i++) {
            const node = currentPath[i];
            const d = Math.hypot(node.x - vehicleState.x, node.z - vehicleState.z);
            if (d < minDesc) {
                minDesc = d;
                bestIndex = i;
            }
        }

        // Si el más cercano es uno más adelante, avanzamos. 
        // Si estamos muy lejos (> 0.5m) del actual target, y hay uno mejor adelante, switch.
        // Pero cuidado con saltar demasiado rápido.
        // Simplemente: Si estamos cerca de "bestIndex", usamos ese como base.
        // Ojo: Si el auto se alejó, minDesc será grande.

        // Lógica híbrida: Avanzar si estamos cerca del target actual OR si hemos avanzado más cerca del siguiente.
        if (bestIndex > currentIndex.current) {
            currentIndex.current = bestIndex;
        } else {
            // Si seguimos en el mismo, verificar si ya llegamos (dist < 1.5)
            if (minDesc < 1.5 && currentIndex.current < currentPath.length - 1) {
                currentIndex.current++;
            }
        }

        // Si llegamos al final final
        if (currentIndex.current >= currentPath.length - 1 && minDesc < 1.5) {
            setThrottle(0);
            setSteering(0);
            setAutonomous(false);
            return;
        }

        // --- ADAPTIVE LOOKAHEAD ---
        // Buscar un punto objetivo a X metros de distancia (Lookahead Distance)
        // Esto suaviza la dirección y evita oscilaciones por puntos muy cercanos.
        const LOOKAHEAD_DIST = 4.5; // Metros (Aumentado para curvas más suaves y anticipadas)
        let lookaheadIndex = currentIndex.current;

        for (let i = currentIndex.current; i < currentPath.length; i++) {
            const p = currentPath[i];
            const d = Math.hypot(p.x - vehicleState.x, p.z - vehicleState.z);
            if (d >= LOOKAHEAD_DIST) {
                lookaheadIndex = i;
                break;
            }
            // Si llegamos al final y no alcanzamos la distancia, usamos el último
            lookaheadIndex = i;
        }

        // Actualizar target con el nuevo índice de lookahead
        const target = currentPath[lookaheadIndex];

        // VISUAL DEBUG: Marcar el punto objetivo (Blue Dot)
        useStore.getState().setTargetPoint(target);

        // Distancia RELATIVA al objetivo (vector)
        const dx = target.x - vehicleState.x;
        const dz = target.z - vehicleState.z;
        const dist = Math.hypot(dx, dz); // Distancia real al target (aprox 4m o menos si es el final)

        // --- CONTROL DE MARCHAS Y DIRECCIÓN ---
        const desiredDir = target.direction || 1;

        // Forzar cambio de marcha si la velocidad es muy baja
        if (Math.abs(vehicleState.speed) < 1.0) {
            setDirection(desiredDir);
        }

        // Si vamos rápido en dirección contraria -> FRENAR
        // Aumentamos umbral de 0.5 a 1.5 para evitar "falsos positivos" y jitter
        const isWrongWay = (vehicleState.speed > 1.5 && desiredDir === -1) ||
            (vehicleState.speed < -1.5 && desiredDir === 1);

        if (isWrongWay) {
            setThrottle(0);
            setDirection(desiredDir);
        }

        // Solo acelerar si estamos (más o menos) en la dirección correcta o parados
        const canAccelerate = !isWrongWay;

        // --- PURE PURSUIT CONTROL ---

        // 1. Calcular ángulo hacia el objetivo
        let targetAngle = Math.atan2(dx, dz);

        // Normalizar ángulo del vehículo (heading)
        let currentHeading = vehicleState.heading;

        // Lógica de Reversa
        let virtualHeading = currentHeading;
        if (desiredDir === -1) {
            virtualHeading += Math.PI;
        }

        // Recalcular error de rumbo
        let angleError = targetAngle - virtualHeading;
        while (angleError > Math.PI) angleError -= 2 * Math.PI;
        while (angleError < -Math.PI) angleError += 2 * Math.PI;

        // DEBUG LOG (limitado para no saturar)
        if (Math.random() < 0.05) {
            console.log(`AutoCtrl: Heading=${currentHeading.toFixed(2)} TargetAng=${targetAngle.toFixed(2)} Err=${angleError.toFixed(2)}`);
        }

        // Aplicar ganancia proporcional (P-Controller)
        const Kp = 4.0; // Ganancia alta para respuesta rápida
        const maxSteer = 0.8; // Ahora 45 grados (coincide con config)
        let newSteer = angleError * Kp;

        // Clamp
        if (newSteer > maxSteer) newSteer = maxSteer;
        if (newSteer < -maxSteer) newSteer = -maxSteer;

        // Guardar cambios
        setSteering(newSteer);

        // Throttle Proporcional (Anti-Oscilación)
        // En lugar de cortar a 0, reducimos velocidad suavemente en curvas
        const maxTurnError = 0.8; // ~45 grados
        // Factor de reducción: 1.0 (recto) a 0.0 (curva cerrada)
        let throttleFactor = 1.0 - Math.min(Math.abs(angleError) / maxTurnError, 1.0);

        const baseThrottle = 0.4;
        const minThrottle = 0.2; // Mínimo para vencer fricción

        let newThrottle = minThrottle + (baseThrottle - minThrottle) * throttleFactor;

        // Si el error es EXTREMO (> 45 grados), necesitamos pivotar (si es posible) o ir muy lento
        if (Math.abs(angleError) > maxTurnError) {
            // Si estamos casi parados, aplicar un poco de fuerza para que las ruedas giren y el auto rote
            if (Math.abs(vehicleState.speed) < 0.2) {
                newThrottle = 0.25;
            } else {
                newThrottle = 0.1; // Frenar pero no a cero absoluto para mantener inercia de giro
            }
        }

        if (!canAccelerate) {
            setThrottle(0);
        } else {
            setThrottle(newThrottle);
        }
    });

    return null;
}