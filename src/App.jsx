import React from "react";
// Importamos los dos grandes bloques de nuestra app
import { Scene } from "./components/World/Scene";
import HUD from "./components/UI/HUD";
import { Car } from "./components/Vehicle/Car.jsx";
import { PhysicsEngine } from "./components/Vehicle/Physics/PhysicsEngine";

// --- NUEVOS IMPORTS PARA EL EDITOR ---
import { EditorToolbar } from "./components/UI/EditorToolbar";
import { MapVisualizer } from "./components/World/MapVisualizer";
import { MapEditor } from "./components/World/MapEditor";
import { AutonomousController } from "./components/Vehicle/AutonomousController";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* CAPA 1: EL HUD Y EL EDITOR (Capa 2D HTML) */}
      <HUD />
      <EditorToolbar />

      {/* CAPA 2: LA ESCENA 3D (Three.js) */}
      <Scene>
        {/* Lógica de Físicas del Vehículo */}
        <PhysicsEngine />
        <AutonomousController />

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
