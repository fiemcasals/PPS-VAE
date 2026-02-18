import { create } from "zustand";

const ANCHO_MAPA = 1000;
const CANTIDAD_CELDAS = 500;
const GRID_SIZE = ANCHO_MAPA / CANTIDAD_CELDAS;

export const useStore = create((set) => ({
  // --- CONFIGURACIÓN GLOBAL ---
  ancho_mapa: ANCHO_MAPA,
  cantidad_celdas: CANTIDAD_CELDAS,
  GRID_SIZE: GRID_SIZE,


  // --- ESTADO DEL VEHÍCULO ---
  controls: { steering: 0, throttle: 0, direction: 1 },
  vehicleState: { x: 0, y: 0, z: 0, heading: Math.PI, speed: 0 },
  cameraMode: "FOLLOW",
  telemetry: { speed: 0, position: [0, 0, 0], acceleration: 0 },
  detectionThresholds: { frontal: 0.15, bifocal: 0.5 },
  isDetectionEnabled: false, // MAURI: Global toggle for object detection
  nearestHumanDistance: Infinity, // MAURI: SAFETY SYSTEM - Nearest person distance
  safetyWarningAck: false, // MAURI: SAFETY SYSTEM - User acknowledged warning

  setDetectionEnabled: (value) => set({ isDetectionEnabled: value }),
  setDetectionThreshold: (camera, value) =>
    set((state) => ({
      detectionThresholds: { ...state.detectionThresholds, [camera]: value },
    })),
  setNearestHumanDistance: (dist) => set({ nearestHumanDistance: dist }),
  setSafetyWarningAck: (ack) => set({ safetyWarningAck: ack }),

  // --- ESTADO DE NAVEGACIÓN ---
  currentPath: null,
  isAutonomous: false,
  vehicleState: { x: 0, y: 0, z: 0, heading: Math.PI, speed: 0 },
  targetDestination: null,
  explored: [], // Nodos explorados por A*
  navGraph: null, // Grafo Topológico
  activeMacroPath: null, // Ruta macro actual para visualización (Legacy)
  activeGradient: {}, // MAURI: Mapa de calor (Dijkstra Costs) para visualización
  setNavGraph: (graph) => set({ navGraph: graph }),
  setActiveMacroPath: (path) => set({ activeMacroPath: path }),
  setActiveGradient: (gradient) => set({ activeGradient: gradient }),

  // --- CONFIGURACIÓN DE NAVEGACIÓN (Backend Persistence) ---
  config: {
    arrival_threshold: 3.0,
    maneuver_threshold: 1,
    curve_threshold: 1.5,
    lookahead_distance: 2.0,
    backward_weight: 200.0, // Moved from root
    steering_cost: 20.0, // Moved from root
    gear_switch_cost: 50.0, // Moved from root
    steering_kp: 5.0,
    base_speed: 0.4,
    gradient_weight: 5.0, // Moved from root
    base_heuristic_weight: 10.0, // Moved from root
    debug_iter_limit: 50000, // Moved from root
  }, // Valores por defecto

  fetchConfig: async () => {
    try {
      const response = await fetch("http://localhost:8000/api/config/");
      if (response.ok) {
        const data = await response.json();
        set({ config: data });
        console.log("Config loaded from Backend:", data);
      }
    } catch (e) {
      console.warn("Backend not available, using defaults.", e);
    }
  },

  saveConfig: async (newConfig) => {
    // Actualización optimista
    set((state) => ({ config: { ...state.config, ...newConfig } }));
    try {
      await fetch("http://localhost:8000/api/config/update/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      console.log("Config saved to Backend.");
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  },

  // --- SISTEMA DE MAPA Y EDICIÓN ---
  selectedTool: "none",
  gridData: {},
  buildings: [], // Lista de edificios { id, x, z, width, depth, type }

  // --- CONDUCCIÓN AUTÓNOMA ---
  isAutonomous: false,
  currentPath: [],
  exploredNodes: [], // Nuevo: para ver la nube de puntos de búsqueda
  targetDestination: null,
  testConfig: { active: false, remaining: 0 }, // Modo Test Aleatorio

  // --- GRABACIÓN DE RUTAS (Teach & Repeat) ---
  isRecording: false,
  recordedPath: [], // Buffer temporal
  savedPaths: {}, // Persistencia en memoria (nombre -> path[])

  // --- ACCIONES DE EDICIÓN ---
  // --- ACCIONES DE EDICIÓN ---
  setTool: (tool) => set({ selectedTool: tool }),
  setGridObject: (x, z, type, metadata = {}) =>
    set((state) => {
      const key = `${x},${z}`;
      const newGridData = { ...state.gridData };
      if (type === "none") {
        delete newGridData[key];
      } else {
        newGridData[key] = { type, ...metadata };
      }
      return { gridData: newGridData, navGraph: null }; // MAURI: Clear graph to force rebuild
    }),
  addBuilding: (building) =>
    set((state) => ({ buildings: [...state.buildings, building] })),

  removeBuilding: (id) =>
    set((state) => ({ buildings: state.buildings.filter((b) => b.id !== id) })),

  clearMap: () =>
    set({
      gridData: {},
      buildings: [],
      currentPath: [],
      exploredNodes: [],
      navGraph: null,
    }),
  loadGridData: (data) => set({ gridData: data, navGraph: null }),
  loadBuildings: (data) => set({ buildings: data }),

  // --- ACCIONES DE VEHÍCULO ---
  setSteering: (val) =>
    set((state) => ({ controls: { ...state.controls, steering: val } })),
  setThrottle: (val) =>
    set((state) => ({ controls: { ...state.controls, throttle: val } })),
  setDirection: (val) =>
    set((state) => ({ controls: { ...state.controls, direction: val } })),
  setVehicleState: (newState) =>
    set((state) => ({ vehicleState: { ...state.vehicleState, ...newState } })),
  setTelemetry: (data) =>
    set((state) => ({ telemetry: { ...state.telemetry, ...data } })),
  setCameraMode: (mode) => set({ cameraMode: mode }),

  // --- ACCIONES DE NAVEGACIÓN ---
  setAutonomous: (isActive) => set({ isAutonomous: isActive }),
  setPath: (path) => set({ currentPath: path }),
  setExplored: (nodes) => set({ exploredNodes: nodes }),
  setExplored: (nodes) => set({ exploredNodes: nodes }),
  setTargetDestination: (dest) => set({ targetDestination: dest }),
  setTestConfig: (config) =>
    set((state) => ({ testConfig: { ...state.testConfig, ...config } })),

  // --- ACCIONES DE GRABACIÓN ---
  setRecording: (active) =>
    set({ isRecording: active, recordedPath: active ? [] : [] }),
  addRecordedPoint: (pt) =>
    set((state) => ({ recordedPath: [...state.recordedPath, pt] })),

  saveRecordedPath: (name) =>
    set((state) => ({
      savedPaths: { ...state.savedPaths, [name]: state.recordedPath },
      isRecording: false,
      currentPath: state.recordedPath, // Opcional: mostrar lo que acabamos de grabar
    })),

  saveCurrentPath: (name) =>
    set((state) => {
      if (!state.currentPath || state.currentPath.length === 0) return {};
      // Guardamos una copia profunda para evitar referencias
      const pathCopy = JSON.parse(JSON.stringify(state.currentPath));
      return {
        savedPaths: { ...state.savedPaths, [name]: pathCopy },
      };
    }),

  loadRecordedPath: (name) =>
    set((state) => {
      const originalPath = state.savedPaths[name];
      if (!originalPath || originalPath.length === 0) return {};

      // 1. Obtener estado actual del vehículo
      const { x: curX, z: curZ, heading: curHeading } = state.vehicleState;

      // 2. Obtener estado inicial de la grabación (Primer punto y orientación estimada)
      const p0 = originalPath[0];
      // Estimamos la orientación inicial mirando al segundo punto (o siguiente distinto)
      let recHeading = 0;
      if (originalPath.length > 1) {
        // Buscamos un punto un poco más adelante para tener mejor vector
        const pNext =
          originalPath.find((p) => Math.hypot(p.x - p0.x, p.z - p0.z) > 0.1) ||
          originalPath[1];
        recHeading = Math.atan2(pNext.x - p0.x, pNext.z - p0.z);
      }

      // 3. Calcular la diferencia de rotación (Delta Theta)
      // Queremos rotar la ruta para que coincida con el heading actual
      // Delta = Actual - Original
      const deltaTheta = curHeading - recHeading;
      const cosT = Math.cos(deltaTheta);
      const sinT = Math.sin(deltaTheta);

      // 4. Transformar todos los puntos
      const transformedPath = originalPath.map((p) => {
        // Trasladar al origen (relativo a p0)
        const relX = p.x - p0.x;
        const relZ = p.z - p0.z;

        // Rotar
        // Formula rotación 2D: x' = x*cos - z*sin, z' = x*sin + z*cos
        // Nota: Verificar ejes. En este sistema (X, Z), puede variar.
        // Si fallara la orientación, probar signos opuestos en senos.
        const rotX = relX * cosT - relZ * sinT;
        const rotZ = relX * sinT + relZ * cosT;

        // Trasladar a posición actual del auto
        return {
          ...p,
          x: rotX + curX,
          z: rotZ + curZ,
        };
      });

      return {
        currentPath: transformedPath,
        isAutonomous: true, // Arrancar automático inmediatamente
        targetDestination: { name: `Grabación: ${name} (Relativa)` },
      };
    }),

  deleteRecordedPath: (name) =>
    set((state) => {
      const newSaved = { ...state.savedPaths };
      delete newSaved[name];
      return { savedPaths: newSaved };
    }),

  setTargetPoint: (pt) => set({ targetPoint: pt }),
  targetPoint: null, // Punto objetivo actual del controlador
}));
