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

  // --- SISTEMA DE MAPA Y EDICIÓN ---
  selectedTool: "none",
  gridData: {},

  // --- CONDUCCIÓN AUTÓNOMA ---
  isAutonomous: false,
  currentPath: [],
  exploredNodes: [], // Nuevo: para ver la nube de puntos de búsqueda
  targetDestination: null,
  testConfig: { active: false, remaining: 0 }, // Modo Test Aleatorio

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
      return { gridData: newGridData };
    }),
  clearMap: () => set({ gridData: {}, currentPath: [], exploredNodes: [] }),
  loadGridData: (data) => set({ gridData: data }),

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
  setTargetPoint: (pt) => set({ targetPoint: pt }),
  targetPoint: null, // Punto objetivo actual del controlador
}));