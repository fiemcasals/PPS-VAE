import React from "react";
import { useStore } from "../../store/useStore";
import { Line } from "@react-three/drei";

export function PathVisualizer() {
  const currentPath = useStore((state) => state.currentPath) || [];
  const exploredNodes = useStore((state) => state.exploredNodes) || [];

  return (
    <group>
      {/* Nodos explorados: Puntos rojos flotando un poco */}
      {exploredNodes.length > 0 &&
        exploredNodes.map(
          (n, i) =>
            i % 5 === 0 && ( // Dibujar 1 de cada 5 para no saturar
              <mesh key={i} position={[n.x, 1, n.z]}>
                <sphereGeometry args={[0.1, 4, 4]} />
                <meshBasicMaterial color="red" />
              </mesh>
            ),
        )}

      {/* Línea del camino: Verde neón */}
      {currentPath.length > 0 && (
        <Line
          points={currentPath.map((p) => [p.x, 0.6, p.z])}
          color="#00ff00"
          lineWidth={5}
        />
      )}

      {/* Blue Dot: Target Point actual del controlador */}
      {useStore((state) => state.targetPoint) && (
        <mesh position={[useStore.getState().targetPoint.x, 1.0, useStore.getState().targetPoint.z]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color="#0000ff" />
        </mesh>
      )}
    </group>
  );
}
