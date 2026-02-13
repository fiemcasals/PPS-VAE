import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../store/useStore";
import { findPathAsync } from "../../utils/pathfinding"; // Importar pathfinding

import { startNextTestLeg } from "../../utils/testRunner"; // Importar lógica de test

export function AutonomousController() {
  // Extraemos el estado y las funciones del store global (Zustand)
  const {
    isAutonomous,
    currentPath,
    vehicleState,
    setSteering,
    setThrottle,
    setDirection,
    setAutonomous,
    testConfig,
    setTestConfig,
    setPath,
    setExplored,
    setTargetDestination,
    gridData,
    GRID_SIZE,
  } = useStore();

  // Referencia para saber en qué punto de la ruta (índice) estamos actualmente
  const currentIndex = useRef(0);

  useEffect(() => {
    if (!isAutonomous || currentPath) {
      currentIndex.current = 0;
    }
  }, [isAutonomous, currentPath]);

  // useFrame corre en cada frame de la simulación (aprox 60fps)
  useFrame(() => {
    // con la afirmacion de abajo le decis de todos los valores que trae getState, dame solo los detallados entre llaves
    const { isAutonomous, currentPath, vehicleState } = useStore.getState();

    // Si no está en modo autónomo o no hay ruta, no hacemos nada
    if (!isAutonomous || !currentPath || currentPath.length === 0) return;

    // --- ACTUALIZACIÓN DE ÍNDICE (Seguimiento Robusto) ---
    // MAURI: Scan Forward logic para evitar quedarse pegado en puntos viejos si cortamos camino
    let bestIndex = currentIndex.current;

    // Ventana de escaneo: Miramos 50 puntos hacia adelante (aprox 25-50 metros)
    //defino cuantas posiciones voy a scanear. -> desde donde estoy + 50
    const SCAN_WINDOW = 50;
    //defino la distancia minima para considerar un punto como el mejor, inicializado en infinito para que cualquier sea mejor
    let closestDist = Infinity;
    //defino el nuevo mejor indice, inicializado en el mejor indice actual
    let newBestIndex = bestIndex;

    //defino el maximo de scan, que es el minimo entre la longitud de la ruta y el mejor indice actual + la ventana de escaneo
    const maxScan = Math.min(currentPath.length, bestIndex + SCAN_WINDOW);

    //asigno a p, el valor del indice, desde donde estoy al maximo escaniable
    for (let i = bestIndex; i < maxScan; i++) {
      const p = currentPath[i];

      // Si el punto futuro 'i' tiene una dirección distinta al punto actual 'bestIndex', abortamos seguir buscando indices mas alla...
      // Esto es para evitar que el auto intente ir a un punto de reversa estando en drive, por ejemplo.
      if (p.direction !== currentPath[bestIndex].direction) {
        break;
      }

      //calculo la distancia entre el punto actual y el punto futuro
      const dist = Math.hypot(p.x - vehicleState.x, p.z - vehicleState.z);
      //si la distancia es menor a la distancia minima, se pisa...
      //el objetivo es que si por alguna razon algun punto de todos los que vos ves, esta mas cerca que la distancia que tenias, vayas por ese. 
      //evalua en cada frame todos los puntos, por eso puede ver cual es el mas cercano
      if (dist < closestDist) {
        closestDist = dist;
        newBestIndex = i;
      }
    }


    if (newBestIndex > bestIndex && closestDist < 15.0) {
      bestIndex = newBestIndex;
    }

    let node = currentPath[bestIndex];
    // Calculamos la distancia horizontal (hipotenusa) entre el auto y el nodo actual
    const d = Math.hypot(node.x - vehicleState.x, node.z - vehicleState.z);

    // CONDICIONAL DE AVANCE FINO:
    // Si ya estamos en el punto óptimo (closest point), chequeamos si estamos TAN cerca que conviene pasar al siguiente
    // para mantener fluidez.
    let nextNode = currentPath[bestIndex + 1];
    // MAURI: LEER CONFIGURACIÓN DEL STORE (BACKEND)
    const { config } = useStore.getState();
    let arrivalThreshold = config.arrival_threshold; // Default 3.0 or user value

    // Check for Curve (Si el próximo tramo o el actual tienen curva)
    // nextNode.steer indica la curvatura del tramo que EMPIEZA en 'node' y termina en 'nextNode' ??
    // No, nextNode.steer es el steer usado para llegar A nextNode desde node.
    // Si ese steer es alto, es que vamos a entrar/recorrer una curva. Necesitamos precisión en el punto de inicio (node).
    if (nextNode && Math.abs(nextNode.steer) > 0.05) {
      arrivalThreshold = config.curve_threshold;
    }

    // Si el siguiente nodo cambia de marcha (adelante/atrás), hay que ser muy precisos (Prioridad Máxima)
    if (nextNode && nextNode.direction !== node.direction) {
      arrivalThreshold = config.maneuver_threshold;
    }

    // Si estamos lo suficientemente cerca, pasamos al siguiente punto de la lista
    if (d < arrivalThreshold && bestIndex < currentPath.length - 1) {
      // 1. Miramos si el siguiente punto implica cambiar de marcha
      const willChangeDir = nextNode && nextNode.direction !== node.direction;
      if (willChangeDir) {
        // MAURI: FIX DE FRENADO ACTIVO
        // Si hay que cambiar de marcha, NO avanzamos hasta estar QUIETOS (o casi).
        // Usamos 0.0001 para "trickear" al motor de físicas y que aplique BRAKING en vez de FRICTION (coasting).
        if (Math.abs(vehicleState.speed) > 0.05) {
          setThrottle(0.0001); // FRENADO ACTIVO
          return; // Esperamos frenar dentro del radio de 0.5m
        }
      }

      bestIndex++;
    }

    currentIndex.current = bestIndex;

    // Si llegamos al final de la ruta y estamos cerca del último punto, frenamos
    if (currentIndex.current >= currentPath.length - 1 && d < 1.0) {
      setThrottle(0);
      setSteering(0);
      setAutonomous(false); // Apagar modo autónomo

      // --- LÓGICA DE TEST AUTOMÁTICO ---
      if (testConfig.active && testConfig.remaining > 0) {
        console.log(`[TEST] Destino alcanzado. Restantes: ${testConfig.remaining}`);

        // 1. Descontar contador
        const nextRemaining = testConfig.remaining - 1;
        setTestConfig({ remaining: nextRemaining });

        if (nextRemaining > 0) {
          // 2. Elegir siguiente destino al azar y reiniciar
          setTimeout(() => {
            startNextTestLeg();
          }, 1000); // Esperar 1seg antes de salir
        } else {
          setTestConfig({ active: false });
          console.log("[TEST] Prueba finalizada.");
        }
      }
      return;
    }



    // --- LÓGICA DE LOOKAHEAD (Mirar hacia adelante) ---
    // Buscamos un punto un poco más adelante para que el giro sea suave
    // Si el siguiente paso es un cambio de marcha, reducimos la mirada al mínimo
    const isManuever = nextNode && nextNode.direction !== node.direction;

    // MAURI: Dynamic Lookahead Configurable
    // Base toma del store (default 2.0). 
    // + 1.0m por cada m/s de velocidad. Max 12.0m.
    const userLookahead = config.lookahead_distance || 3.5;

    let dynamicLookahead = userLookahead + Math.abs(vehicleState.speed) * 1.0;
    if (dynamicLookahead > 12.0) dynamicLookahead = 12.0;

    let LOOKAHEAD_DIST = isManuever ? 0.2 : dynamicLookahead;

    // MAURI: ADAPTIVE LOOKAHEAD FOR CURVES
    // If we are turning (angleError is high), simple lookahead cuts the corner (off-roading).
    // We need to look closer to the vehicle to track the curve tightly.
    // However, we can't use 'angleError' yet because it depends on the target... strictly speaking.
    // But we can use the 'curveAhead' logic calculated later, or calculate a quick heading check here.

    // Quick check for local curvature:
    // Compare heading of current path segment vs segment 5m ahead.
    if (currentPath.length > currentIndex.current + 3) {
      const pCurrent = currentPath[currentIndex.current];
      const pAhead = currentPath[Math.min(currentIndex.current + 5, currentPath.length - 1)];
      // Vector del tramo actual
      // const dx1 = ... (We assume vehicle heading aligns with path roughly or use previous node)

      // Simple heuristic: If the vehicle is already turning (steering active is high) -> Reduce Lookahead
      // Or if the map tells us there is a high steer value.

      // Mejor aproximación: Si el 'steer' del punto actual o siguientes es alto.
      // O si el ángulo al punto 'lejos' (dynamicLookahead) es muy distinto al heading actual.
    }

    // Simplification: We will modulate LOOKAHEAD based on the angle calculated in the PREVIOUS frame 
    // or calculate a candidate angle now. To keep it simple/stateless in this hook:
    // We iterate. finding a point at dynamicLookahead, check angle. If angle > threshold, reduce lookahead.

    // 1. Inicializamos el índice de "búsqueda hacia adelante" en la posición actual del auto.
    let lookaheadIndex = currentIndex.current;

    // 2. Guardamos la dirección de marcha (1 o -1) del nodo donde estamos parados ahora mismo.
    const currentDir = currentPath[currentIndex.current].direction;

    // Recorremos la ruta hacia adelante para encontrar el punto que está a la distancia LOOKAHEAD
    // MAURI FIX: Si el tramo es corto (maniobra), nos limitamos a buscar HASTA el cambio de dirección.
    let foundLookahead = false;

    for (let i = currentIndex.current; i < currentPath.length; i++) {
      if (currentPath[i].direction !== currentDir) {
        lookaheadIndex = Math.max(currentIndex.current, i - 1);
        foundLookahead = true;
        break;
      }

      const p = currentPath[i];
      const d = Math.hypot(p.x - vehicleState.x, p.z - vehicleState.z);

      if (d >= LOOKAHEAD_DIST) {
        lookaheadIndex = i;
        foundLookahead = true;

        // --- CURVE CORRECTION ---
        // Check angle to this candidate target
        const dx = p.x - vehicleState.x;
        const dz = p.z - vehicleState.z;
        const angleToTarget = Math.atan2(dx, dz);
        let angleDiff = angleToTarget - vehicleState.heading;
        if (currentDir === -1) angleDiff -= Math.PI; // Adjust for reverse if needed (simplified)
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // MAURI: STRICTOR CURVE DETECTION
        // Bajamos el umbral a 0.15 rads (~8.5 grados). Cualquier desviación mínima se trata como curva.
        // Si detectamos curva, forzamos un Lookahead MUY CORTO (1.5m) para obligar al auto a pasar por los puntos.
        if (Math.abs(angleDiff) > 0.15) {
          // Si el lookahead actual es lejano, forzamos uno corto y reiniciamos búsqueda.
          if (LOOKAHEAD_DIST > 1.5) {
            LOOKAHEAD_DIST = 1.5; // Lookahead corto ("objetivo intermedio cercano")

            // Reset search from start with new distance
            i = currentIndex.current;
            continue;
          }
        }

        break;
      }

      lookaheadIndex = i;
    }

    // Este es nuestro "punto objetivo" real hacia el cual vamos a girar
    const target = currentPath[lookaheadIndex];

    // Debug visual: envía el punto al store para dibujar un punto azul en el mapa
    useStore.getState().setTargetPoint(target);

    // Vector de distancia al objetivo
    const dx = target.x - vehicleState.x;
    const dz = target.z - vehicleState.z;

    // --- CONTROL DE MARCHAS Y DIRECCIÓN ---
    const desiredDir = target.direction || 1; // 1 = Adelante, -1 = Reversa

    // Si el auto está casi parado, aplicamos el cambio de marcha
    if (Math.abs(vehicleState.speed) < 0.05) {
      setDirection(desiredDir);
    }

    // Si el auto se mueve rápido pero la marcha deseada es la opuesta, frenamos (isWrongWay)
    const isWrongWay =
      (vehicleState.speed > 1.5 && desiredDir === -1) ||
      (vehicleState.speed < -1.5 && desiredDir === 1);

    if (isWrongWay) {
      setThrottle(0);
      setDirection(desiredDir);
    }

    const canAccelerate = !isWrongWay;

    // Detectamos el movimiento real para el contravolante táctico
    let actualMotionDir = 0;
    if (vehicleState.speed > 0.2) actualMotionDir = 1;
    else if (vehicleState.speed < -0.2) actualMotionDir = -1;

    // Si se mueve, manda la inercia; si está quieto, manda la intención (desiredDir)
    const effectiveDir = actualMotionDir !== 0 ? actualMotionDir : desiredDir;

    // --- PURE PURSUIT (Cálculo del ángulo) ---

    // 1. Ángulo absoluto hacia el objetivo usando arcotangente -> en q angulo esta el objetivo
    let targetAngle = Math.atan2(dx, dz);

    // 2. Heading actual del vehículo -> hacia donde apunta actualmente el auto
    let currentHeading = vehicleState.heading;

    // 3. Ajuste de rumbo si vamos en reversa (el "frente" ahora es la parte trasera)
    let virtualHeading = currentHeading;
    if (effectiveDir === -1) {
      virtualHeading += Math.PI;
    }

    // 4. Calcular el error de ángulo (cuánto nos falta girar) y normalizar entre -PI y PI
    let angleError = targetAngle - virtualHeading;
    while (angleError > Math.PI) angleError -= 2 * Math.PI;
    while (angleError < -Math.PI) angleError += 2 * Math.PI;

    // --- CONTROL DEL VOLANTE (Steering) ---
    // MAURI: Dynamic Steering Gain (Kp)
    // Reduce sensitivity at higher speeds to prevent oscillation ("volantazos").

    // Configurable Kp (Sensitivity) - Default 2.5
    const userKp = config.steering_kp || 2.5;

    // Calculate Dynamic Gain based on speed
    // Speed 0-2 m/s: Full Gain (2.5)
    // Speed >5 m/s: Reduced Gain (1.0)
    let speedFactor = Math.max(0, (Math.abs(vehicleState.speed) - 2.0) / 3.0); // 0 at 2m/s, 1 at 5m/s
    speedFactor = Math.min(1.0, speedFactor); // Clamp at 1.0

    let dynamicKp = userKp * (1.0 - 0.6 * speedFactor); // Scales down to 40% of userKp at high speed

    // Usamos el Kp dinámico (negativo)
    // En reversa mantenemos alta ganancia xq es inestable por naturaleza y lenta
    const Kp = effectiveDir === -1 ? -(userKp * 1.2) : -dynamicKp;

    const maxSteer = 0.8; // Límite físico del volante
    let newSteer = angleError * Kp;

    // Si vamos en reversa, el volante debe girar al revés para corregir el rumbo
    if (effectiveDir === -1) {
      newSteer *= -1;
    }

    // Limitamos el giro del volante al máximo permitido (Clamp)
    if (newSteer > maxSteer) newSteer = maxSteer;
    if (newSteer < -maxSteer) newSteer = -maxSteer;

    setSteering(newSteer);

    // --- CONTROL DE ACELERACIÓN (Throttle) ---
    // Si el ángulo de error es grande (curva cerrada), bajamos la velocidad
    const maxTurnError = 0.8;
    let throttleFactor =
      1.0 - Math.min(Math.abs(angleError) / maxTurnError, 1.0);

    const baseThrottle = config.base_speed || 0.4; // Aceleración normal configurable
    const minThrottle = 0.2; // Aceleración mínima

    // Calculamos un acelerador proporcional
    let newThrottle =
      minThrottle + (baseThrottle - minThrottle) * throttleFactor;

    // Si el error es muy grande, entramos en modo "maniobra lenta"
    if (Math.abs(angleError) > maxTurnError) {
      if (Math.abs(vehicleState.speed) < 0.2) {
        newThrottle = 0.25; // Impulso para empezar a mover las ruedas
      } else {
        newThrottle = 0.1; // Casi frenado para girar sobre el eje
      }
    }

    // --- MAURI: DISTANCE-BASED APPROACH (Aproximación Suave) ---
    // Calculamos distacia exacta al próximo cambio de marcha para ir soltando el acelerador.
    let distToManeuver = 999;
    for (let i = currentIndex.current; i < Math.min(currentIndex.current + 20, currentPath.length); i++) {
      if (i > currentIndex.current && currentPath[i].direction !== currentPath[i - 1].direction) {
        // Distancia aproximada
        const p = currentPath[i];
        distToManeuver = Math.hypot(p.x - vehicleState.x, p.z - vehicleState.z);
        break;
      }
    }

    // --- MAURI: PREDICTIVE BRAKING (Detección de Curvas Futuras) ---
    // Miramos "n" nodos hacia adelante para ver si viene una curva fuerte.
    // Detección basada en cambio de heading real entre puntos futuros
    let curveAhead = false;
    const lookAheadCount = 15; // Increased lookahead count

    // Analizamos la geometría: Heading actual vs Heading futuro
    const pCurrent = currentPath[currentIndex.current];
    const pFutureIndex = Math.min(currentIndex.current + 5, currentPath.length - 1);
    const pFuture = currentPath[pFutureIndex];

    // Check local curvature (steer command derivative) or geometry
    // Checking change in direction between current motion vector and future path vector
    let futureHeading = 0;
    if (pFutureIndex > currentIndex.current) {
      futureHeading = Math.atan2(pFuture.x - pCurrent.x, pFuture.z - pCurrent.z);
    }

    // Simple heuristic: If angleError is already significant, OR if future points deviate
    if (Math.abs(angleError) > 0.3) {
      curveAhead = true;
    }

    if (curveAhead) {
      // MAURI: SMOOTH SPEED LIMITER
      // Curvas cerradas: Límite 1.5 m/s
      const targetSpeedLimit = 1.5;

      if (vehicleState.speed > targetSpeedLimit + 0.5) {
        // Si nos pasamos mucho (+0.5 m/s), FRENADO ACTIVO.
        newThrottle = 0.0001;
      } else if (vehicleState.speed > targetSpeedLimit) {
        // Si nos pasamos un poco, solo soltamos acelerador (Coast).
        newThrottle = 0;
      } else {
        // Si estamos abajo del límite, ya no forzamos 0.15 (muy lento).
        newThrottle = Math.min(newThrottle, 0.5); // Cap throttle to 50%
      }
    }

    // MAURI: MODULACIÓN POR DISTANCIA (Anti-Overshoot)
    if (distToManeuver < 8.0) {
      const approachFactor = Math.max(0.1, distToManeuver / 8.0); // De 1.0 bajando a 0.1
      newThrottle = newThrottle * approachFactor;

      // Asegurar un mínimo de tracción para no quedarnos cortos
      if (newThrottle < 0.08) newThrottle = 0.08;
    }

    // --- MAURI: SISTEMA DE SEGURIDAD (PERSONAS) ---
    // Leemos la distancia a la persona más cercana detectada por cámaras
    const { nearestHumanDistance } = useStore.getState();
    const SAFETY_STOP_DIST = 1.0;
    const SAFETY_SLOW_DIST = 5.0;

    let safetyOverride = false;

    // 1. PELIGRO INMINENTE (< 1m): Parada Total
    if (nearestHumanDistance < SAFETY_STOP_DIST) {
      newThrottle = 0;
      safetyOverride = true;
      // Force Brake (negative throttle/braking logic if supported, or just 0)
      // En este simulador simple, 0 es coasting/friccion. 
      // Podriamos setear un valor negativo si hubiese logica de marcha atras automática, pero mejor 0 seguro.
    }
    // 2. PRECAUCIÓN (< 5m): Paso de Hombre (max 1.5 m/s)
    else if (nearestHumanDistance < SAFETY_SLOW_DIST) {
      const PASO_HOMBRE_SPEED = 1.0; // m/s
      if (vehicleState.speed > PASO_HOMBRE_SPEED) {
        newThrottle = 0; // Dejar de acelerar para bajar velocidad
      } else {
        newThrottle = Math.min(newThrottle, 0.2); // Aceleración muy suave para mantener paso
      }
      safetyOverride = true;
    }

    // Aplicamos el acelerador final
    if (!canAccelerate) {
      //recuerdo que canAccelerate es true si no vas en direccion contraria a donde deberias ir. de ser asi el auto se frena, antes de darle la nueva velocidad en la direccion correcta
      setThrottle(0);
    } else {
      setThrottle(newThrottle);
    }
  });

  return null; // Este componente no renderiza nada visualmente, es pura lógica
}
