import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../store/useStore";

export function PathRecorder() {
    const { isRecording, vehicleState, addRecordedPoint } = useStore();
    const lastPos = useRef({ x: 0, z: 0 });

    useFrame(() => {
        if (!isRecording) return;

        // Distancia desde el último punto grabado
        const dist = Math.hypot(
            vehicleState.x - lastPos.current.x,
            vehicleState.z - lastPos.current.z
        );

        // Grabamos cada 0.5 metros o si es el primer punto (siempre que no estemos en el origen exacto 0,0)
        const isAtOrigin = Math.abs(vehicleState.x) < 0.001 && Math.abs(vehicleState.z) < 0.001;

        if ((dist > 0.5 || (lastPos.current.x === 0 && lastPos.current.z === 0)) && !isAtOrigin) {
            const newPoint = {
                x: vehicleState.x,
                z: vehicleState.z,
                direction: vehicleState.speed >= -0.1 ? 1 : -1, // Detectar marcha (aprox)
                steer: 0 // No guardamos steer exacto, el pathfinder lo inferirá o lo ignorará
            };

            addRecordedPoint(newPoint);
            lastPos.current = { x: vehicleState.x, z: vehicleState.z };

            // Feedback visual opcional en consola
            // console.log("Recorded Point:", newPoint);
        }
    });

    return null;
}
