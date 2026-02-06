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

        // 1. Aceleración / Frenado CORRECTO (Simétrico)
        let targetSpeed = 0;
        if (throttle > 0) {
            targetSpeed =
                direction === 1
                    ? VEHICLE_CONFIG.MAX_SPEED * throttle
                    : -VEHICLE_CONFIG.MAX_REVERSE_SPEED * throttle;
        }

        // Detectar si estamos Acelerando (alejándonos de 0) o Frenando (acercándonos a 0)
        // Nota: Si targetSpeed y speed tienen signos opuestos, es Frenado primero.

        const isAccelerating = Math.abs(targetSpeed) > Math.abs(state.speed) && Math.sign(targetSpeed) === Math.sign(state.speed);

        // Aplicar cambio
        if (state.speed < targetSpeed) {
            // Queremos aumentar el valor (ej -5 -> 0, o 0 -> 5)
            // Si speed es negativo (-5 -> 0), es FRENADO DE REVERSA.
            // Si speed es positivo (0 -> 5), es ACELERACION NORMAL.

            // Logica anterior: state.speed += ACCEL * throttle.
            // Bug anterior: En reverse stop (-5 -> 0), usaba ACCEL (lento). Queremos BRAKING (rápido).

            let rate = VEHICLE_CONFIG.ACCELERATION * throttle; // Default Accel
            if (state.speed < 0 && targetSpeed >= state.speed) {
                // Estamos subiendo desde negativo (Frenando reversa o acelerando hacia adelante desde reversa)
                // Si target es 0 (frenar), usar BRAKING.
                // Si target es > 0, usar BRAKING hasta 0 luego ACCEL.
                // Simplificación: Si vamos en contra del movimiento, es BRAKE.
                rate = VEHICLE_CONFIG.BRAKING; // Frenado fuerte
            }

            state.speed += rate * delta;
            if (state.speed > targetSpeed) state.speed = targetSpeed;

        } else if (state.speed > targetSpeed) {
            // Queremos bajar el valor (ej 5 -> 0, o 0 -> -5)
            // Si speed es positivo (5 -> 0), es FRENADO NORMAL.
            // Si speed es negativo (0 -> -5), es ACELERACION REVERSA.

            // Logica anterior: state.speed -= BRAKING.
            // Bug anterior: En reverse accel (0 -> -5), usaba BRAKING (muy rápido/brusco). Queremos ACCEL.

            let rate = VEHICLE_CONFIG.BRAKING; // Default Brake (para 5 -> 0)
            if (state.speed <= 0 && targetSpeed < state.speed) {
                // Estamos bajando en negativo (Acelerando marcha atrás)
                rate = VEHICLE_CONFIG.ACCELERATION * throttle;
            }

            state.speed -= rate * delta;
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
            state.heading -= angularVelocity * delta; // MAURI: Invertido a -= por reporte de "dirección invertida"
        }

        // Actualizamos posiciones finales
        state.x += state.speed * Math.sin(state.heading) * delta;
        state.z += state.speed * Math.cos(state.heading) * delta;

        // Devolvemos una copia del estado para que React detecte cambios si fuera necesario
        return { ...state };
    };

    return { updatePhysics };
}
