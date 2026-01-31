import React, { useMemo } from "react";
import { useStore } from "../../store/useStore";
import { Line } from "@react-three/drei";

export function PathVisualizer() {
  const currentPath = useStore((state) => state.currentPath) || [];
  const exploredNodes = useStore((state) => state.exploredNodes) || [];

  // Dividir el path en segmentos por dirección para colorearlos distinto
  const segments = useMemo(() => {
    if (currentPath.length < 2) return [];

    const segs = [];
    let currentSeg = [currentPath[0]];
    let currentDir = currentPath[0].direction;

    for (let i = 1; i < currentPath.length; i++) {
      const prev = currentPath[i - 1];
      const curr = currentPath[i];

      // Si cambia de dirección, cerramos el segmento anterior e iniciamos uno nuevo
      if (curr.direction && curr.direction !== currentDir) {
        segs.push({ points: currentSeg, direction: currentDir });
        // Iniciamos nuevo segmento con overlap (punto anterior) para continuidad visual
        currentSeg = [prev, curr];
        currentDir = curr.direction;
      } else {
        currentSeg.push(curr);
      }
    }
    // Agregar el último segmento
    segs.push({ points: currentSeg, direction: currentDir });

    return segs;
  }, [currentPath]);

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

      {/* Segmentos del camino coloreados */}
      {segments.map((seg, i) => (
        <Line
          key={i}
          points={seg.points.map((p) => [p.x, 0.6, p.z])}
          // Verde (#00ff00) para adelante (1)
          // Naranja rojizo (#ff4500) para reversa (-1)
          color={seg.direction === 1 ? "#00ff00" : "#ff4500"}
          lineWidth={5}
        />
      ))}

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
