import { Physics, usePlane } from "@react-three/cannon";
import React from "react";
import { Canvas } from "@react-three/fiber";
import { CameraController } from "./CameraController";
import { TurretCamera } from "./TurretCamera";
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
    material: { friction: PHYSICS_CONSTANTS.GROUND_FRICTION, restitution: PHYSICS_CONSTANTS.GROUND_RESTITUTION },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#567d46" roughness={1} />
    </mesh>
  );
}

export function Scene({ children, operatorMode = "vehicle" }) {
  const selectedTool = useStore((state) => state.selectedTool);

  return (
    <Canvas
      shadows
      camera={{ position: [20, 20, 20], fov: operatorMode === "turret" ? 60 : 45 }}
      style={{ height: "100vh", background: "#050505" }}
    >
      <Environment />

      <Grid />
      <MapEditor />
      <MapVisualizer />
      <PathVisualizer />

      <Physics gravity={[0, -9.81, 0]} iterations={20}>
        <Ground />
        {children}
      </Physics>

      {/* Cámara según modo de operador */}
      {operatorMode === "turret" ? (
        <TurretCamera />
      ) : (
        <CameraController isEditing={selectedTool !== "none"} />
      )}
    </Canvas>
  );
}
