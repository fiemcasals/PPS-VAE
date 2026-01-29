import { useState, useEffect } from "react";

const STORAGE_KEY = "pps_vae_scenarios";

export function useScenarios() {
    const [scenarios, setScenarios] = useState({});

    // Cargar escenarios al montar
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setScenarios(JSON.parse(saved));
            } catch (e) {
                console.error("Error parsing scenarios:", e);
            }
        }
    }, []);

    const saveScenario = (name, gridData) => {
        if (!name.trim()) return;
        const newScenarios = { ...scenarios, [name]: gridData };
        setScenarios(newScenarios);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newScenarios));
    };

    const loadScenario = (name) => {
        return scenarios[name] || {};
    };

    const deleteScenario = (name) => {
        const newScenarios = { ...scenarios };
        delete newScenarios[name];
        setScenarios(newScenarios);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newScenarios));
    };

    return {
        scenariosList: Object.keys(scenarios),
        saveScenario,
        loadScenario,
        deleteScenario,
    };
}
