import React from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../../store/useStore";
import { useVehiclePhysics } from "./useVehiclePhysics";

export function PhysicsEngine() {
    const controls = useStore((state) => state.controls);
    const setVehicleState = useStore((state) => state.setVehicleState);
    const { updatePhysics } = useVehiclePhysics();

    useFrame((state, delta) => {
        // 1. Calcular nueva física
        const newState = updatePhysics(controls, delta);

        // 2. Actualizar el store (para que Car.jsx lo lea y renderice)
        setVehicleState(newState);
    });

    return null; // Este componente no renderiza nada visualmente
}
