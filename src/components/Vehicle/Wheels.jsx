import React from "react";

const WheelModel = () => (
  <group rotation={[0, 0, Math.PI / 2]}>
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.35, 0.2, 24]} />
      <meshStandardMaterial color="#111" />
    </mesh>
  </group>
);

export const Wheels = ({ wheelRefs }) => {
  const positions = [
    [-0.8, -0.3, 1.2], // Delantera Izquierda
    [0.8, -0.3, 1.2], // Delantera Derecha
    [-0.8, -0.3, -1.2], // Trasera Izquierda
    [0.8, -0.3, -1.2], // Trasera Derecha
  ];

  // Si por alguna razón wheelRefs no está definido, retornamos null para evitar el crash
  if (!wheelRefs || wheelRefs.length < 4) return null;

  return (
    <group>
      {positions.map((pos, i) => (
        <group
          key={i}
          ref={wheelRefs[i]} // Aquí es donde daba el error si wheelRefs[i] era undefined
          position={pos}
        >
          <WheelModel />
        </group>
      ))}
    </group>
  );
};
