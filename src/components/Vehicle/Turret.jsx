import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../store/useStore";

/**
 * Torreta 3D montada sobre el vehículo.
 * - Base cilíndrica que rota en yaw (horizontal)
 * - Cañón que rota en pitch (elevación)
 */
export function Turret() {
    const yawGroupRef = useRef();
    const pitchGroupRef = useRef();

    useFrame(() => {
        const { turretYaw, turretPitch } = useStore.getState();
        if (yawGroupRef.current) {
            yawGroupRef.current.rotation.y = turretYaw;
        }
        if (pitchGroupRef.current) {
            pitchGroupRef.current.rotation.x = turretPitch;
        }
    });

    return (
        // Posición: justo encima del techo del chasis (chasis es y=0.1, alto 0.7 → tope en y=0.45)
        <group position={[0, 0.55, -0.2]}>
            {/* Base de la torreta — rota en yaw */}
            <group ref={yawGroupRef}>
                {/* Plataforma cilíndrica */}
                <mesh castShadow>
                    <cylinderGeometry args={[0.28, 0.32, 0.15, 16]} />
                    <meshStandardMaterial color="#3a3a2a" roughness={0.4} metalness={0.6} />
                </mesh>

                {/* Grupo de elevación (pitch) — sale directamente de la base */}
                <group ref={pitchGroupRef} position={[0, 0.1, 0]}>
                    {/* Cuerpo del mecanismo / receptor */}
                    <mesh castShadow position={[0, 0.03, 0.18]}>
                        <boxGeometry args={[0.14, 0.1, 0.3]} />
                        <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.8} />
                    </mesh>

                    {/* Cañón — rotado 90° en X para apuntar hacia adelante */}
                    <mesh castShadow position={[0, 0.03, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.025, 0.02, 0.5, 8]} />
                        <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.9} />
                    </mesh>

                    {/* Empuñadura posterior */}
                    <mesh castShadow position={[0, -0.02, -0.02]}>
                        <boxGeometry args={[0.06, 0.1, 0.06]} />
                        <meshStandardMaterial color="#333322" roughness={0.5} metalness={0.5} />
                    </mesh>

                    {/* Mira */}
                    <mesh castShadow position={[0, 0.1, 0.12]}>
                        <boxGeometry args={[0.04, 0.04, 0.08]} />
                        <meshStandardMaterial color="#222211" roughness={0.4} metalness={0.7} />
                    </mesh>
                </group>
            </group>
        </group>
    );
}
