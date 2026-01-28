import { Physics, usePlane } from "@react-three/cannon";
import React from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, ContactShadows } from "@react-three/drei";
import { CameraController } from "./CameraController";
import { MapVisualizer } from "./MapVisualizer";
import { MapEditor } from "./MapEditor";
import { useStore } from "../../store/useStore";

function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: "Static",
    // Friction 0 es ideal para que el auto no se "trabe" con el suelo
    material: { friction: 0.1, restitution: 0 },
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
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* CAPA DE EDICIÓN Y GRILLA 
        La grilla visual ahora coincide exactamente con tu lógica de celdas.
      */}
      <gridHelper args={[ancho_mapa, cantidad_celdas, 0x444444, 0x222222]} />
      <MapEditor />
      <MapVisualizer />

      <Physics gravity={[0, -9.81, 0]} iterations={20}>
        <Ground />
        {children}
      </Physics>

      <ContactShadows opacity={0.5} scale={20} blur={2} far={4.5} />

      {/* CONTROLADOR DE CÁMARA
        Le pasamos el modo actual para que sepa si debe dejar de rotar 
        cuando estamos en modo pintura.
      */}
      <CameraController isEditing={selectedTool !== "none"} />
    </Canvas>
  );
}
