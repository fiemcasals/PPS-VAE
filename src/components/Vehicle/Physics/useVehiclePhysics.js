import { useRef } from "react";
import { VEHICLE_CONFIG } from "./vehicleConfig";

export function useVehiclePhysics() {
    // Estado interno de la física (para no saturar el store en cada frame si no es necesario)
    // Aunque para suavidad visual, actualizaremos el store en cada frame.
    const physicsState = useRef({
        x: 0,
        y: 0,
        z: 0,
        heading: 0,
        speed: 0,
        steeringAngle: 0,
    });

    const updatePhysics = (controls, delta) => {
        const { throttle, steering, direction } = controls;
        const state = physicsState.current;

        // 1. Aceleración / Frenado
        let targetSpeed = 0;
        if (throttle > 0) {
            targetSpeed =
                direction === 1
                    ? VEHICLE_CONFIG.MAX_SPEED
                    : -VEHICLE_CONFIG.MAX_REVERSE_SPEED;
        }

        // Interpolación lineal simple para la velocidad (Aceleración)
        if (state.speed < targetSpeed) {
            state.speed += VEHICLE_CONFIG.ACCELERATION * delta * throttle;
            if (state.speed > targetSpeed) state.speed = targetSpeed;
        } else if (state.speed > targetSpeed) {
            state.speed -= VEHICLE_CONFIG.BRAKING * delta; // Frenado o desaceleración
            if (state.speed < targetSpeed) state.speed = targetSpeed;
        }

        // Fricción natural (si no hay input)
        if (throttle === 0) {
            if (state.speed > 0) {
                state.speed -= VEHICLE_CONFIG.FRICTION * delta;
                if (state.speed < 0) state.speed = 0;
            } else if (state.speed < 0) {
                state.speed += VEHICLE_CONFIG.FRICTION * delta;
                if (state.speed > 0) state.speed = 0;
            }
        }

        // 2. Dirección (Steering)
        // El input 'steering' viene de -1 a 1 desde el Joystick
        // Multiplicamos por el ángulo máximo configurado (45 grados)
        const targetSteer = steering * VEHICLE_CONFIG.MAX_STEER_ANGLE;

        // Suavizado del giro de las ruedas
        const steerDiff = targetSteer - state.steeringAngle;
        state.steeringAngle +=
            Math.sign(steerDiff) *
            Math.min(Math.abs(steerDiff), VEHICLE_CONFIG.TURN_SPEED * delta);

        // 3. Cinemática (Modelo de Bicicleta)
        // x' = v * cos(heading)
        // z' = v * sin(heading)
        // heading' = (v / L) * tan(steering)

        // Solo giramos si nos movemos (o muy poco) para realismo
        if (Math.abs(state.speed) > 0.1) {
            const angularVelocity = (state.speed / VEHICLE_CONFIG.WHEELBASE) * Math.tan(state.steeringAngle);
            state.heading -= angularVelocity * delta; // Three.js usa Y+ arriba, rotación antihoraria es positiva usualmente, pero depende del sistema. Ajustar signo si es necesario.
        }

        state.x += state.speed * Math.sin(state.heading) * delta;
        state.z += state.speed * Math.cos(state.heading) * delta;

        return { ...state };
    };

    return { updatePhysics };
}
