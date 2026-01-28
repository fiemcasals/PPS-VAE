import React from "react";

export function Chassis() {
  return (
    <mesh castShadow position={[0, 0.1, 0]}>
      <boxGeometry args={[1.5, 0.7, 3]} />
      <meshStandardMaterial
        color="darkolivegreen"
        roughness={0.3}
        transparent={true}
        opacity={0.8}
      />
    </mesh>
  );
}
