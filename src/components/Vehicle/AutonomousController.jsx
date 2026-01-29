import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../store/useStore";

export function AutonomousController() {
    const { isAutonomous, currentPath, vehicleState, setSteering, setThrottle, setDirection, setAutonomous } = useStore();
    const currentIndex = useRef(0);

    useEffect(() => { if (!isAutonomous) currentIndex.current = 0; }, [isAutonomous]);

    useFrame(() => {
        if (!isAutonomous || !currentPath.length) return;

        const target = currentPath[currentIndex.current];
        const dist = Math.hypot(target.x - vehicleState.x, target.z - vehicleState.z);

        // Avanzar al siguiente nodo si estamos cerca
        if (dist < 1.2) {
            if (currentIndex.current < currentPath.length - 1) {
                currentIndex.current++;
            } else {
                setThrottle(0); setSteering(0); setAutonomous(false);
                return;
            }
        }

        // Lógica de Marcha: Solo cambiar si la velocidad es baja
        if (Math.abs(vehicleState.speed) < 0.5) {
            setDirection(target.direction);
        }

        // Si la dirección del auto no coincide con la del nodo, frenar para cambiar
        const currentDir = vehicleState.speed >= -0.1 ? 1 : -1;
        if (target.direction !== currentDir && Math.abs(vehicleState.speed) > 0.5) {
            setThrottle(0);
        } else {
            setSteering(target.steer);
            setThrottle(0.3); // Velocidad de maniobra constante
        }
    });

    return null;
}