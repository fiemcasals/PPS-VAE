import React from "react";
import { Sky, ContactShadows } from "@react-three/drei";

export function Environment() {
    return (
        <>
            <Sky sunPosition={[100, 20, 100]} />
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1.5}
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <ContactShadows opacity={0.5} scale={20} blur={2} far={4.5} />
        </>
    );
}
