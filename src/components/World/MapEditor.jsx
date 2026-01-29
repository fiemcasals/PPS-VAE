import { useStore } from "../../store/useStore";
import { useState } from "react";

export function MapEditor() {
  const selectedTool = useStore((state) => state.selectedTool);
  const setGridObject = useStore((state) => state.setGridObject);
  // Definimos la constante aquí para evitar errores de importación por ahora
  const GRID_SIZE = useStore((state) => state.GRID_SIZE);

  const [isDragging, setIsDragging] = useState(false);

  if (selectedTool === "none") return null;

  const handlePaint = (e) => {
    // Evita que el click mueva la cámara mientras pintas
    e.stopPropagation();

    if (!isDragging && e.type !== "pointerdown") return;

    // 1. Calculamos a qué celda pertenece el click (Índice de celda)
    const cellX = Math.floor(e.point.x / GRID_SIZE);
    const cellZ = Math.floor(e.point.z / GRID_SIZE);

    // 2. Posicionamos en el CENTRO de esa celda
    // Sumamos 0.5 para movernos de la esquina/intersección al centro
    const x = (cellX + 0.5) * GRID_SIZE;
    const z = (cellZ + 0.5) * GRID_SIZE;

    // 2. LÓGICA DE HERRAMIENTA (Pintar o Borrar)
    let toolToApply = selectedTool;
    let metadata = {};

    if (selectedTool === "eraser") {
      toolToApply = "none";
    } else if (selectedTool === "destination") {
      // Para destinos, solo permitimos click (no arrastrar) y pedimos nombre
      if (e.type !== "pointerdown" || isDragging) return;

      const name = window.prompt("Nombre del destino:", `Destino ${x},${z}`);
      if (!name) return; // Si cancela, no ponemos nada
      metadata = { name };
    }

    // 3. ACTUALIZAR STORE
    setGridObject(x, z, toolToApply, metadata);
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onPointerDown={(e) => {
        setIsDragging(true);
        handlePaint(e);
      }}
      onPointerUp={() => setIsDragging(false)}
      onPointerMove={handlePaint}
      onPointerLeave={() => setIsDragging(false)}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );
}
