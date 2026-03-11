import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

/**
 * Hook de sincronización multi-operador.
 * 
 * - PUSH (ambos modos):
 *   → Envía vehicleState + controls + turretYaw/Pitch al servidor cada 100ms
 * 
 * - PULL (condicional — solo lo que controla el OTRO operador):
 *   → Modo "vehicle": recibe turretYaw/turretPitch del artillero
 *   → Modo "turret": recibe vehicleState del conductor
 * 
 * - Escenario activo: se sincroniza UNA VEZ para que ambos carguen el mismo mapa
 */
export function useSync(operatorMode) {
    const intervalRef = useRef(null);
    const lastSyncScenarioRef = useRef(null);

    useEffect(() => {
        if (!operatorMode || operatorMode === "hub") return;

        const syncLoop = async () => {
            const store = useStore.getState();

            try {
                // --- PUSH: enviar estado COMPLETO desde ambos modos ---
                const pushData = {
                    vehicle: {
                        x: store.vehicleState.x,
                        y: store.vehicleState.y,
                        z: store.vehicleState.z,
                        heading: store.vehicleState.heading,
                        speed: store.vehicleState.speed,
                    },
                    controls: {
                        steering: store.controls.steering,
                        throttle: store.controls.throttle,
                        direction: store.controls.direction,
                    },
                    turret: {
                        yaw: store.turretYaw,
                        pitch: store.turretPitch,
                    },
                };

                // Push sin esperar respuesta (fire and forget para velocidad)
                fetch("/api/sync/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify(pushData),
                }).catch(() => { });

                // --- PULL: leer estado del OTRO operador ---
                const response = await fetch("/api/sync/", { credentials: "same-origin" });
                if (!response.ok) return;
                const shared = await response.json();

                if (operatorMode === "vehicle") {
                    // El conductor recibe los ángulos de torreta del artillero
                    if (shared.turret) {
                        store.setTurretYaw(shared.turret.yaw);
                        store.setTurretPitch(shared.turret.pitch);
                    }
                } else if (operatorMode === "turret") {
                    // El artillero recibe la posición del vehículo del conductor
                    if (shared.vehicle) {
                        store.setVehicleState({
                            x: shared.vehicle.x,
                            y: shared.vehicle.y,
                            z: shared.vehicle.z,
                            heading: shared.vehicle.heading,
                            speed: shared.vehicle.speed,
                        });
                    }
                }

                // Escenario activo: cargar UNA SOLA VEZ si cambió
                if (shared.active_scenario && shared.active_scenario !== lastSyncScenarioRef.current) {
                    lastSyncScenarioRef.current = shared.active_scenario;
                    try {
                        const scenResp = await fetch("/api/scenarios/", { credentials: "same-origin" });
                        if (scenResp.ok) {
                            const scenarios = await scenResp.json();
                            const scenarioData = scenarios[shared.active_scenario];
                            if (scenarioData) {
                                if (scenarioData.gridData) {
                                    store.loadGridData(scenarioData.gridData);
                                    if (scenarioData.buildings) {
                                        store.loadBuildings(scenarioData.buildings);
                                    }
                                } else {
                                    store.loadGridData(scenarioData);
                                }
                                // console.log("[Sync] Escenario cargado:", shared.active_scenario);
                            }
                        }
                    } catch (e) {
                        console.warn("[Sync] Error cargando escenario:", e);
                    }
                }
            } catch (err) {
                // Silencioso — si el backend no responde, seguimos con estado local
            }
        };

        // Ejecutar inmediatamente y luego cada 100ms
        syncLoop();
        intervalRef.current = setInterval(syncLoop, 100);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [operatorMode]);
}
