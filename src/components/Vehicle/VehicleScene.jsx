import React from "react";
import { Car } from "./Car";

/**
 * Capa que prepara el entorno para el vehículo.
 */
export function VehicleScene() {
  return (
    <group>
      <Car />
      {/* Aquí podrías agregar luces que sigan al auto o cámaras */}
    </group>
  );
}
