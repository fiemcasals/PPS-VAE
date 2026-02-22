import React from "react";
// Importamos los dos grandes bloques de nuestra app
import { Scene } from "./components/World/Scene";
import HUD from "./components/UI/HUD";
import { Car } from "./components/Vehicle/Car.jsx";
import { PhysicsEngine } from "./components/Vehicle/Physics/PhysicsEngine";

// --- NUEVOS IMPORTS PARA EL EDITOR ---
import { EditorToolbar } from "./components/UI/EditorToolbar";
import { WebcamFeed } from "./components/UI/WebcamFeed";
import { DetectionsHUD } from "./components/UI/DetectionsHUD";
import { SafetyAlert } from "./components/UI/SafetyAlert";
import { MapVisualizer } from "./components/World/MapVisualizer";
import { MapEditor } from "./components/World/MapEditor";
import { AutonomousController } from "./components/Vehicle/AutonomousController";
import { PathRecorder } from "./components/Vehicle/PathRecorder";

// --- HUB Y TORRETA ---
import { SelectionHub } from "./components/UI/SelectionHub";
import { TurretHUD } from "./components/UI/TurretHUD";
import { ScenarioManager } from "./components/UI/ScenarioManager";
import { useSync } from "./hooks/useSync";

import { useEffect, useState } from "react";
import { useStore } from "./store/useStore";

function App() {
  const fetchConfig = useStore((state) => state.fetchConfig);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState("hub"); // "hub" | "vehicle" | "turret"

  // Verificar autenticación al montar
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/check/", { credentials: "same-origin" });
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          window.location.href = "/";
          return;
        }
      } catch (err) {
        console.warn("No se pudo verificar autenticación:", err);
        window.location.href = "/";
        return;
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfig();
    }
  }, [isAuthenticated, fetchConfig]);

  // Sincronización multi-operador
  useSync(currentView);

  // Mientras se verifica, mostrar pantalla de carga
  if (!authChecked) {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#1a1a2e", color: "#fff", fontSize: "1.2rem"
      }}>
        Verificando autenticación...
      </div>
    );
  }

  // Hub de selección (sin escena 3D)
  if (currentView === "hub") {
    return (
      <SelectionHub
        onSelect={(mode) => {
          useStore.getState().setOperatorMode(mode);
          setCurrentView(mode);
        }}
      />
    );
  }

  // Modos vehículo y torreta comparten la MISMA escena 3D
  const isVehicleMode = currentView === "vehicle";
  const isTurretMode = currentView === "turret";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* CAPA 1: HUD según modo */}
      {isVehicleMode && (
        <>
          <WebcamFeed />
          <DetectionsHUD />
          <SafetyAlert />
          <HUD />
          <EditorToolbar onBackToHub={() => setCurrentView("hub")} />
        </>
      )}
      {isTurretMode && (
        <>
          <TurretHUD />
          {/* ScenarioManager oculto para auto-cargar el escenario sincronizado */}
          <ScenarioManager isOpen={false} onClose={() => { }} />
        </>
      )}

      {/* CAPA 2: LA ESCENA 3D (siempre la misma instancia) */}
      <Scene operatorMode={currentView}>
        {/* Motor de física y controlador autónomo solo en modo vehículo */}
        {isVehicleMode && (
          <>
            <PhysicsEngine />
            <AutonomousController />
            <PathRecorder />
          </>
        )}
        <Car />
      </Scene>
    </div>
  );
}

export default App;
