import { create } from "zustand";

// Definimos las constantes fuera para poder usarlas en el cálculo de GRID_SIZE
const ANCHO_MAPA = 1000;
const CANTIDAD_CELDAS = 500;
const GRID_SIZE = ANCHO_MAPA / CANTIDAD_CELDAS; // Resultado: 2

export const useStore = create((set) => ({
  // --- CONFIGURACIÓN GLOBAL (Leídas por los componentes) ---
  ancho_mapa: ANCHO_MAPA,
  cantidad_celdas: CANTIDAD_CELDAS,
  GRID_SIZE: GRID_SIZE,

  // --- ESTADO DEL VEHÍCULO ---
  controls: { steering: 0, throttle: 0, direction: 1 },
  vehicleState: { x: 0, y: 0, z: 0, heading: 0, speed: 0 },
  cameraMode: "FOLLOW",
  telemetry: { speed: 0, position: [0, 0, 0], acceleration: 0 },

  // --- SISTEMA DE MAPA Y EDICIÓN ---
  selectedTool: "none",
  gridData: {},

  // --- ACCIONES ---
  setTool: (tool) => set({ selectedTool: tool }),

  setGridObject: (x, z, type) =>
    set((state) => {
      const key = `${x},${z}`;
      const newGridData = { ...state.gridData };
      if (type === "none") {
        delete newGridData[key];
      } else {
        newGridData[key] = { type };
      }
      return { gridData: newGridData };
    }),

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
  clearMap: () => set({ gridData: {} }),
}));
