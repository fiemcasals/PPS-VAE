import { Physics, usePlane } from "@react-three/cannon";
import React from "react";
import { Canvas } from "@react-three/fiber";
import { CameraController } from "./CameraController";
import { MapVisualizer } from "./MapVisualizer";
import { MapEditor } from "./MapEditor";
import { Environment } from "./Environment";
import { Grid } from "./Grid";
import { PathVisualizer } from "./PathVisualizer";
import { useStore } from "../../store/useStore";

import { PHYSICS_CONSTANTS } from "../../constants/physics";

function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: "Static",
    // Friction 0 es ideal para que el auto no se "trabe" con el suelo
    material: { friction: PHYSICS_CONSTANTS.GROUND_FRICTION, restitution: PHYSICS_CONSTANTS.GROUND_RESTITUTION },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

export function Scene({ children }) {
  // Traemos los valores del store para sincronizar la grilla visual
  const ancho_mapa = useStore((state) => state.ancho_mapa);
  const cantidad_celdas = useStore((state) => state.cantidad_celdas);
  const selectedTool = useStore((state) => state.selectedTool);

  return (
    <Canvas
      shadows
      camera={{ position: [20, 20, 20], fov: 45 }}
      style={{ height: "100vh", background: "#050505" }}
    >
      <Environment />

      {/* CAPA DE EDICIÓN Y GRILLA 
        La grilla visual ahora coincide exactamente con tu lógica de celdas.
      */}
      <Grid />
      <MapEditor />
      <MapVisualizer />
      <PathVisualizer />

      <Physics gravity={[0, -9.81, 0]} iterations={20}>
        <Ground />
        {children}
      </Physics>

      {/* CONTROLADOR DE CÁMARA
        Le pasamos el modo actual para que sepa si debe dejar de rotar 
        cuando estamos en modo pintura.
      */}
      <CameraController isEditing={selectedTool !== "none"} />
    </Canvas>
  );
}
