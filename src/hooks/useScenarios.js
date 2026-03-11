import { useState, useEffect } from "react";

export function useScenarios() {
    const [scenarios, setScenarios] = useState({});

    // Cargar escenarios desde el backend al montar
    useEffect(() => {
        async function fetchScenarios() {
            try {
                const response = await fetch("/api/scenarios/", { credentials: "same-origin" });
                if (response.ok) {
                    const data = await response.json();
                    setScenarios(data);
                    // console.log("Escenarios cargados desde el backend:", Object.keys(data));
                }
            } catch (e) {
                console.warn("No se pudieron cargar los escenarios:", e);
            }
        }
        fetchScenarios();
    }, []);

    const saveScenario = async (name, gridData) => {
        if (!name.trim()) return;
        // Actualizar estado local de inmediato (optimista)
        const newScenarios = { ...scenarios, [name]: gridData };
        setScenarios(newScenarios);
        // Persistir en el backend
        try {
            await fetch("/api/scenarios/save/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name, grid_data: gridData }),
            });
            console.log("Escenario guardado en backend:", name);
        } catch (e) {
            console.error("Error guardando escenario:", e);
        }
    };

    const loadScenario = (name) => {
        return scenarios[name] || {};
    };

    const deleteScenario = async (name) => {
        const newScenarios = { ...scenarios };
        delete newScenarios[name];
        setScenarios(newScenarios);
        // Eliminar del backend
        try {
            await fetch("/api/scenarios/delete/", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name }),
            });
            console.log("Escenario eliminado del backend:", name);
        } catch (e) {
            console.error("Error eliminando escenario:", e);
        }
    };

    return {
        scenariosList: Object.keys(scenarios),
        saveScenario,
        loadScenario,
        deleteScenario,
    };
}
