# Project Context & Guidelines

## 1. Project Overview
**PPS-VAE** is an Autonomous Vehicle Simulator built with **React**, **Three.js** (via React Three Fiber), and **Cannon.js** (via React Three Cannon). It simulates vehicle physics, pathfinding, and autonomous navigation within a 3D environment.

## 2. Tech Stack
-   **Core**: React 19, Vite
-   **3D & Physics**: `@react-three/fiber`, `@react-three/drei`, `@react-three/cannon`, `three`
-   **State Management**: `zustand`
-   **Input**: `nipplejs` (Joystick)

## 3. Project Structure
-   `src/App.jsx`: Main entry point.
-   `src/store`: Global state management (Zustand).
-   `src/hooks`: Custom React hooks.
-   `src/components`:
    -   `World/`: Environment, Scene, Grid, CameraController, MapEditor.
    -   `Vehicle/`: Car physics, Chassis, Wheels, VehicleScene.
    -   `UI/`: HUD, Controls, Overlays.

## 4. CRITICAL DEVELOPMENT RULES
**These rules must be followed for EVERY change or new feature.**

### 🛑 Rule #1: Extreme Modularity
-   Every component must be small, focused, and do **one thing well**.
-   Avoid "God Components" that handle logic, UI, and state simultaneously.
-   Split logic into custom hooks (`src/hooks`) or utility functions.

### 🛑 Rule #2: 200-Line Limit
-   **NO FILE SHALL EXCEED 200 LINES.**
-   If a file approaches this limit, it **MUST** be refactored immediately.
-   Extract sub-components, move logic to hooks, or separate constants/configs.

### 🛑 Rule #3: Read Before Writing
-   Before resolving any prompt, **READ THIS DOCUMENT**.
-   Verify that your proposed solution adheres to the modularity and size limits.

### 🛑 Rule #4: Version Control Safety
-   **ALWAYS** create a git commit before starting a new task or refactor.
-   This ensures we can easily revert if something breaks.

## 5. Script Descriptions & Responsibilities

### Store
-   `src/store/useStore.js`: **Global State Manager**. Handles vehicle state (position, speed), user controls (steering, throttle), camera modes, and map editor data.

### World Components
-   `src/components/World/Scene.jsx`: **Main Entry Point for 3D**. Sets up the `Canvas`, lights, physics world (`<Physics>`), and renders the main actors (Car, Map, Camera).
-   `src/components/World/MapEditor.jsx`: **Map Editing Logic**. Handles user interaction (clicks/drags) to paint or erase objects on the grid. Calculates grid cell coordinates from pointer events.
-   `src/components/World/CameraController.jsx`: **Camera Logic**.
    -   `FOLLOW`: Smoothly tracks the vehicle using linear interpolation (Lerp).
    -   `FREE`: Uses `OrbitControls` for manual navigation. Handles keyboard event capturing.
-   `src/components/World/Environment.jsx`: *(Empty)* Intended to encapsulate Sky, Lights, and environmental effects.
-   `src/components/World/Grid.jsx`: *(Empty)* Intended to encapsulate the visual grid helper.

### Vehicle Components
-   `src/components/Vehicle/Car.jsx`: **Visual Car Orchestrator**. Subscribes to the store to update the car's 3D position and rotation. Animates wheels based on speed and steering.
-   `src/components/Vehicle/Physics/useVehiclePhysics.js`: **Physics Logic Core**. Implements the kinematic bicycle model. Calculates acceleration, braking, friction, and turning physics. Returns the `updatePhysics` function.

### UI Components
-   `src/components/UI/HUD.jsx`: **UI Layout**. Container for all Heads-Up Display elements (Telemetry, Joystick, Controls).

## 6. Modularization & Refactoring Plan
The following files are currently empty or underutilized and represent opportunities for better modularity:

-   **[TODO]** `src/components/World/Environment.jsx`: Move `Sky`, `ambientLight`, and `directionalLight` from `Scene.jsx` to here.
-   **[TODO]** `src/components/World/Grid.jsx`: Move `<gridHelper>` and related visual logic from `Scene.jsx` to here.
-   **[TODO]** `src/constants/physics.js`: Move physics constants (friction, max speed, etc.) from `vehicleConfig.js` or hardcoded values to here.
-   **[TODO]** `src/hooks/useInputs.js`: Centralize keyboard/joystick input logic here to decouple it from UI components.

## 7. Workflow
1.  **Analyze**: Understand the requirement.
2.  **Check Constraints**: Will this exceed 200 lines? If yes, plan the split *before* writing code.
3.  **Implement**: Write modular code.
4.  **Verify**: Ensure the project builds and the new feature works as expected.
