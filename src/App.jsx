import React from "react";
// Importamos los dos grandes bloques de nuestra app
import { Scene } from "./components/World/Scene";
import HUD from "./components/UI/HUD";
import { Car } from "./components/Vehicle/Car.jsx";
import { PhysicsEngine } from "./components/Vehicle/Physics/PhysicsEngine";

// --- NUEVOS IMPORTS PARA EL EDITOR ---
import { EditorToolbar } from "./components/UI/EditorToolbar";
import { WebcamFeed } from "./components/UI/WebcamFeed"; // Importar Webcam
import { DetectionsHUD } from "./components/UI/DetectionsHUD"; // Importar HUD Detecciones
import { SafetyAlert } from "./components/UI/SafetyAlert"; // MAURI: Safety Modal
import { MapVisualizer } from "./components/World/MapVisualizer";
import { MapEditor } from "./components/World/MapEditor";
import { AutonomousController } from "./components/Vehicle/AutonomousController";
import { PathRecorder } from "./components/Vehicle/PathRecorder";

import { useEffect, useState } from "react";
import { useStore } from "./store/useStore";

function App() {
  const fetchConfig = useStore((state) => state.fetchConfig);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticación al montar
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/check/", { credentials: "same-origin" });
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // No autenticado — redirigir al login
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

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* CAPA 1: EL HUD Y EL EDITOR (Capa 2D HTML) */}
      <WebcamFeed /> {/* Overlay de Cámara Física (BIFOCO) */}
      <DetectionsHUD /> {/* Overlay de Cámara Virtual (FRONTAL) */}
      <SafetyAlert /> {/* Modal de Seguridad */}
      <HUD />
      <EditorToolbar />

      {/* CAPA 2: LA ESCENA 3D (Three.js) */}
      <Scene>
        {/* Lógica de Físicas del Vehículo */}
        <PhysicsEngine />
        <AutonomousController />
        <PathRecorder />

        {/* Entidad del Vehículo */}
        <Car />

        {/* LÓGICA DE MAPEO POR REJILLA 
            Ponemos el Visualizer para ver lo que pintamos
            y el Editor para capturar los eventos de arrastre.
        */}
      </Scene>
    </div>
  );
}

export default App;
