import React, { useMemo } from "react";
import { useStore } from "../../store/useStore";
import { Line, Sphere } from "@react-three/drei";

export function PathVisualizer() {
    const currentPath = useStore((state) => state.currentPath) || [];
    const exploredNodes = useStore((state) => state.exploredNodes) || [];

    // Formatear puntos para la línea de Three.js
    const linePoints = useMemo(() => {
        if (!Array.isArray(currentPath) || currentPath.length === 0) return null;
        return currentPath.map(p => [p.x, 0.2, p.z]);
    }, [currentPath]);

    return (
        <group>
            {/* Nube de exploración Dijkstra (Puntos rojos pequeños) */}
            {Array.isArray(exploredNodes) && exploredNodes.map((n, i) => (
                // Dibujamos solo 1 de cada 10 para no colapsar el rendimiento
                i % 10 === 0 && (
                    <mesh key={`exp-${i}`} position={[n.x, 0.05, n.z]}>
                        <boxGeometry args={[0.2, 0.01, 0.2]} />
                        <meshBasicMaterial color="red" opacity={0.2} transparent />
                    </mesh>
                )
            ))}

            {/* Camino final encontrado (Línea verde) */}
            {linePoints && (
                <Line
                    points={linePoints}
                    color="#00ff00"
                    lineWidth={4}
                    transparent
                    opacity={0.8}
                />
            )}
        </group>
    );
}