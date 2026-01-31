import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../store/useStore";

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
  } = useStore();

  // Referencia para saber en qué punto de la ruta (índice) estamos actualmente
  const currentIndex = useRef(0);

  // Si desactivamos el modo autónomo, reseteamos el índice a 0 para la próxima vez
  useEffect(() => {
    if (!isAutonomous) currentIndex.current = 0;
  }, [isAutonomous]);

  // useFrame corre en cada frame de la simulación (aprox 60fps)
  useFrame(() => {
    // Si no está en modo autónomo o no hay ruta, no hacemos nada
    if (!isAutonomous || !currentPath || currentPath.length === 0) return;

    // --- ACTUALIZACIÓN DE ÍNDICE (Seguimiento Secuencial) ---
    let bestIndex = currentIndex.current;
    let node = currentPath[bestIndex];
    // Calculamos la distancia horizontal (hipotenusa) entre el auto y el nodo actual
    const d = Math.hypot(node.x - vehicleState.x, node.z - vehicleState.z);

    // CONDICIONAL DE AVANCE:
    let nextNode = currentPath[bestIndex + 1];
    let arrivalThreshold = 2.0; // Distancia por defecto para considerar "llegamos al nodo"

    // Si el siguiente nodo cambia de marcha (adelante/atrás), hay que ser muy precisos (0.5m)
    if (nextNode && nextNode.direction !== node.direction) {
      arrivalThreshold = 0.1; //puse 0.1 para no cambiar de marcha antes de tiempo
    }

    // Si estamos lo suficientemente cerca, pasamos al siguiente punto de la lista
    if (d < arrivalThreshold && bestIndex < currentPath.length - 1) {
      // 1. Miramos si el siguiente punto implica cambiar de marcha
      //   const willChangeDir = nextNode && nextNode.direction !== node.direction;
      //   if (willChangeDir) {
      //     // Aplicamos una velocidad igual a 0, para seguir solo con la inercia
      //     setThrottle(0);
      //   }

      bestIndex++;
    }

    currentIndex.current = bestIndex;

    // Si llegamos al final de la ruta y estamos cerca del último punto, frenamos
    if (currentIndex.current >= currentPath.length - 1 && d < 1.0) {
      setThrottle(0);
      setSteering(0);
      setAutonomous(false); // Apagar modo autónomo
      return;
    }

    // --- LÓGICA DE LOOKAHEAD (Mirar hacia adelante) ---
    // Buscamos un punto un poco más adelante para que el giro sea suave
    // Si el siguiente paso es un cambio de marcha, reducimos la mirada al mínimo
    const isManuever = nextNode && nextNode.direction !== node.direction;
    let LOOKAHEAD_DIST = isManuever ? 0.2 : 2.0;

    // Si estamos empezando, miramos más cerca para no saltarnos curvas cerradas iniciales
    if (currentIndex.current < 5) {
      LOOKAHEAD_DIST = 1.5;
    }

    // 1. Inicializamos el índice de "búsqueda hacia adelante" en la posición actual del auto.
    let lookaheadIndex = currentIndex.current;

    // 2. Guardamos la dirección de marcha (1 o -1) del nodo donde estamos parados ahora mismo.
    const currentDir = currentPath[currentIndex.current].direction;

    // Recorremos la ruta hacia adelante para encontrar el punto que está a la distancia LOOKAHEAD
    for (let i = currentIndex.current; i < currentPath.length; i++) {
      // No podemos mirar puntos que tengan una marcha distinta (ej. no mirar reversa si voy adelante)
      if (currentPath[i].direction !== currentDir) {
        break;
      }

      const p = currentPath[i];
      const d = Math.hypot(p.x - vehicleState.x, p.z - vehicleState.z);
      if (d >= LOOKAHEAD_DIST) {
        lookaheadIndex = i;
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

    // Log aleatorio para monitorear sin saturar la consola
    if (Math.random() < 0.05) {
      console.log(`AutoCtrl: Idx=${currentIndex.current} Dir=${desiredDir}...`);
    }

    // --- CONTROL DEL VOLANTE (Steering) ---
    const Kp = -3.5; // Ganancia proporcional (fuerza de giro)
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

    const baseThrottle = 0.4; // Aceleración normal
    const minThrottle = 0.2; // Aceleración mínima

    // Calculamos un acelerador proporcional
    let newThrottle =
      minThrottle + (baseThrottle - minThrottle) * throttleFactor;

    // Si el error es muy grande, entramos en modo "maniobra lenta"
    //math.abs convierte cualquier numero en positivo ej |-5| = 5
    if (Math.abs(angleError) > maxTurnError) {
      if (Math.abs(vehicleState.speed) < 0.2) {
        newThrottle = 0.25; // Impulso para empezar a mover las ruedas
      } else {
        newThrottle = 0.1; // Casi frenado para girar sobre el eje
      }
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
