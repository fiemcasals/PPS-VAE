import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../store/useStore";
import { Chassis } from "./Chassis";
import { Wheels } from "./Wheels";

export function Car() {
  const setTelemetry = useStore((state) => state.setTelemetry);
  const groupRef = useRef();
  const wheelRefs = [useRef(), useRef(), useRef(), useRef()];

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // 1. OBTENER DATOS DEL STORE
    const controls = useStore.getState().controls;
    const vehicleState = useStore.getState().vehicleState;

    if (!vehicleState) return;

    // 2. APLICAR POSICIÓN Y ROTACIÓN
    groupRef.current.position.set(
      vehicleState.x,
      0.6, // Altura fija al suelo
      vehicleState.z,
    );
    groupRef.current.rotation.y = vehicleState.heading;

    // 3. ANIMACIÓN DE RUEDAS
    const degToRad = (deg) => (deg * Math.PI) / 180;

    wheelRefs.forEach((ref, i) => {
      if (ref.current) {
        // Girar ruedas delanteras (índices 0 y 1)
        if (i < 2) {
          ref.current.rotation.y = degToRad(controls.steering);
        }

        // Efecto de rodamiento
        const wheelMesh = ref.current.children[0];
        if (wheelMesh) {
          wheelMesh.rotation.x += vehicleState.speed * 0.1;
        }
      }
    });

    // 4. TELEMETRÍA
    setTelemetry({
      speed: Math.round(vehicleState.speed * 3.6),
    });
  });

  return (
    <group ref={groupRef}>
      <Chassis />
      <Wheels wheelRefs={wheelRefs} />
    </group>
  );
}
