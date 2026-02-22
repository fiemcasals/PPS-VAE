import React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useStore } from "../../store/useStore";
import * as THREE from "three";

/**
 * Cámara en primera persona del artillero.
 * Posicionada DETRÁS de la ametralladora, mirando a lo largo del cañón.
 * - Sigue la posición del vehículo automáticamente
 * - La rotación es controlada por turretYaw y turretPitch
 * - Sin interpolación: la diana queda fija con el arma
 */
export function TurretCamera() {
    const { camera } = useThree();

    useFrame(() => {
        const { vehicleState, turretYaw, turretPitch } = useStore.getState();
        if (!vehicleState) return;

        const vehicleHeading = vehicleState.heading;
        // MAURI: SYNC FIX
        // El cañón en Turret.jsx rota -turretYaw. 
        // El auto rota +vehicleHeading.
        // El ángulo mundial REAL del cañón es: vehicleHeading - turretYaw
        const totalYaw = vehicleHeading - turretYaw;

        // Posición de la torreta en el mundo
        const turretWorldY = 0.6 + 0.55 + 0.1 + 0.15;
        const turretOffsetLocal = { x: 0, z: -0.2 };

        // Rotar offset por heading del vehículo
        const cosH = Math.cos(vehicleHeading);
        const sinH = Math.sin(vehicleHeading);
        const turretWorldX = vehicleState.x + turretOffsetLocal.x * cosH - turretOffsetLocal.z * sinH;
        const turretWorldZ = vehicleState.z + turretOffsetLocal.x * sinH + turretOffsetLocal.z * cosH;

        // Punto de mira
        const lookDistance = 50;
        const behindDistance = 0.6; // RE-ADDED: Missing constant
        const cosPitch = Math.cos(turretPitch);
        const sinPitch = Math.sin(turretPitch);

        const lookX = turretWorldX + Math.sin(totalYaw) * cosPitch * lookDistance;
        const lookY = turretWorldY + sinPitch * lookDistance;
        const lookZ = turretWorldZ + Math.cos(totalYaw) * cosPitch * lookDistance;

        const camX = turretWorldX - Math.sin(totalYaw) * behindDistance;
        const camZ = turretWorldZ - Math.cos(totalYaw) * behindDistance;
        const camY = turretWorldY + 0.1 - Math.sin(turretPitch) * behindDistance * 0.3;

        // Posición y lookAt INSTANTÁNEOS — la diana queda fija con el arma, sin arrastre
        camera.position.set(camX, camY, camZ);
        camera.lookAt(lookX, lookY, lookZ);
    });

    return null;
}
