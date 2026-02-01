import { useStore } from "../../store/useStore";
import { useState } from "react";

export function MapEditor() {
  const selectedTool = useStore((state) => state.selectedTool);
  const setGridObject = useStore((state) => state.setGridObject);
  const addBuilding = useStore((state) => state.addBuilding); // Nuevo action
  const buildings = useStore((state) => state.buildings);
  const removeBuilding = useStore((state) => state.removeBuilding);
  const GRID_SIZE = useStore((state) => state.GRID_SIZE);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // {x, z} (celda)
  const [dragEnd, setDragEnd] = useState(null); // {x, z} (celda actual)

  if (selectedTool === "none") return null;

  // Calcula celda desde coordenadas de mundo
  const worldToCell = (point) => ({
    x: Math.floor(point.x / GRID_SIZE),
    z: Math.floor(point.z / GRID_SIZE)
  });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    const dragTools = ["building", "floor", "road", "pool", "quincho", "eraser", "parking"];

    if (!dragTools.includes(selectedTool)) {
      // Herramientas de "un clic" (Tree, Eraser, Dest, Streetlight, Flag)
      setIsDragging(true);
      handlePaint(e, true);
    } else {
      // Herramienta de Área (Edificio, Baldosas, Camino)
      const cell = worldToCell(e.point);
      setDragStart(cell);
      setDragEnd(cell);
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e) => {
    e.stopPropagation();
    if (!isDragging) return;

    const dragTools = ["building", "floor", "road", "pool", "quincho", "eraser", "parking"];

    if (!dragTools.includes(selectedTool)) {
      // Pintar continuo
      handlePaint(e, false);
    } else {
      // Actualizar preview de área
      setDragEnd(worldToCell(e.point));
    }
  };

  const handlePointerUp = (e) => {
    e.stopPropagation();
    setIsDragging(false);

    const dragTools = ["building", "floor", "road", "pool", "quincho", "eraser", "parking"];

    if (dragTools.includes(selectedTool) && dragStart && dragEnd) {
      // 1. Calcular límites del rectángulo
      const minX = Math.min(dragStart.x, dragEnd.x);
      const maxX = Math.max(dragStart.x, dragEnd.x);
      const minZ = Math.min(dragStart.z, dragEnd.z);
      const maxZ = Math.max(dragStart.z, dragEnd.z);

      if (selectedTool === "road" || selectedTool === "parking") {
        // Lógica especial para CAMINOS y ESTACIONAMIENTO (Solo pinta la grilla)
        const type = selectedTool === "parking" ? "parking" : "road";
        for (let i = minX; i <= maxX; i++) {
          for (let j = minZ; j <= maxZ; j++) {
            const wx = (i + 0.5) * GRID_SIZE;
            const wz = (j + 0.5) * GRID_SIZE;
            setGridObject(wx, wz, type);
          }
        }
      } else if (selectedTool === "eraser") {
        // --- BORRAR ÁREA (Grilla + Edificios) ---
        // 1. Borrar objetos de la grilla
        for (let i = minX; i <= maxX; i++) {
          for (let j = minZ; j <= maxZ; j++) {
            const wx = (i + 0.5) * GRID_SIZE;
            const wz = (j + 0.5) * GRID_SIZE;
            setGridObject(wx, wz, "none");
          }
        }

        // 2. Borrar edificios que intersectan con el área seleccionada
        // Convertimos celdas a coordenadas de mundo del área de selección
        const selMinX = minX * GRID_SIZE;
        const selMaxX = (maxX + 1) * GRID_SIZE;
        const selMinZ = minZ * GRID_SIZE;
        const selMaxZ = (maxZ + 1) * GRID_SIZE;

        buildings.forEach((b) => {
          // AABB Collision (Axis-Aligned Bounding Box)
          // Edificio bounds:
          const bMinX = b.x - b.width / 2;
          const bMaxX = b.x + b.width / 2;
          const bMinZ = b.z - b.depth / 2;
          const bMaxZ = b.z + b.depth / 2;

          if (
            bMinX < selMaxX &&
            bMaxX > selMinX &&
            bMinZ < selMaxZ &&
            bMaxZ > selMinZ
          ) {
            removeBuilding(b.id);
          }
        });

      } else {
        // Lógica para EDIFICIOS y BALDOSAS (Crea objeto 3D + marca grilla)
        const width = (maxX - minX + 1) * GRID_SIZE;
        const depth = (maxZ - minZ + 1) * GRID_SIZE;
        const centerX = (minX + (maxX - minX + 1) / 2) * GRID_SIZE;
        const centerZ = (minZ + (maxZ - minZ + 1) / 2) * GRID_SIZE;
        const type = selectedTool === "floor" ? "floor" : (selectedTool === "pool" ? "pool" : (selectedTool === "quincho" ? "quincho" : "building"));

        addBuilding({
          id: Date.now(),
          x: centerX,
          z: centerZ,
          width,
          depth,
          type: type
        });

        // Marcar celdas en la grilla
        for (let i = minX; i <= maxX; i++) {
          for (let j = minZ; j <= maxZ; j++) {
            const wx = (i + 0.5) * GRID_SIZE;
            const wz = (j + 0.5) * GRID_SIZE;

            if (type === "building") {
              setGridObject(wx, wz, "obstacle", { subtype: "building_base" });
            } else if (type === "pool") {
              setGridObject(wx, wz, "obstacle", { subtype: "water" });
            } else if (type === "quincho") {
              setGridObject(wx, wz, "obstacle", { subtype: "structure" });
            } else {
              setGridObject(wx, wz, "floor", { subtype: "paved" });
            }
          }
        }
      }

      setDragStart(null);
      setDragEnd(null);
    }
  };

  const handlePaint = (e, isClick) => {
    // Lógica original de pintado celda a celda
    const cell = worldToCell(e.point);
    const x = (cell.x + 0.5) * GRID_SIZE;
    const z = (cell.z + 0.5) * GRID_SIZE;

    let toolToApply = selectedTool;
    let metadata = {};

    if (["tree", "streetlight", "flag"].includes(selectedTool)) toolToApply = selectedTool;
    else if (selectedTool === "destination") {
      if (!isClick) return; // Solo clic simple
      const name = window.prompt("Nombre del destino:", `Destino ${Math.round(x)},${Math.round(z)}`);
      if (!name) return;
      metadata = { name };
    }

    setGridObject(x, z, toolToApply, metadata);
  };

  // Render del Preview (Fantasma de Construcción)
  const renderPreview = () => {
    const dragTools = ["building", "floor", "road", "pool", "quincho", "eraser", "parking"];
    if (!isDragging || !dragTools.includes(selectedTool) || !dragStart || !dragEnd) return null;

    const minX = Math.min(dragStart.x, dragEnd.x);
    const maxX = Math.max(dragStart.x, dragEnd.x);
    const minZ = Math.min(dragStart.z, dragEnd.z);
    const maxZ = Math.max(dragStart.z, dragEnd.z);

    const width = (maxX - minX + 1) * GRID_SIZE;
    const depth = (maxZ - minZ + 1) * GRID_SIZE;
    const cx = (minX + (maxX - minX + 1) / 2) * GRID_SIZE;
    const cz = (minZ + (maxZ - minZ + 1) / 2) * GRID_SIZE;

    let height = 3;
    let color = "#8b4513";
    let yPos = 1.5;
    let shape = "box"; // default

    if (selectedTool === "floor") {
      height = 0.1;
      color = "#555555"; // Gris Oscuro para Baldosas
      yPos = 0.1;
    } else if (selectedTool === "road") {
      height = 0.05;
      color = "#111111"; // Negro para Caminos
      yPos = 0.05;
    } else if (selectedTool === "parking") {
      height = 0.05;
      color = "#8d6e63"; // Marrón para Estacionamiento
      yPos = 0.05;
    } else if (selectedTool === "pool") {
      height = 0.1;
      color = "#3498db"; // Azul para Piletas
      yPos = 0.1;
    } else if (selectedTool === "quincho") {
      height = 2.0;
      color = "#d35400"; // Naranja techo
      yPos = 1.0;
      shape = "cylinder"; // preview shape
    } else if (selectedTool === "eraser") {
      height = 1.0;
      color = "#e74c3c"; // Rojo borrar
      yPos = 0.5;
    }

    if (shape === "cylinder") {
      const radius = Math.min(width, depth) / 2;
      return (
        <mesh position={[cx, yPos, cz]}>
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshStandardMaterial color={color} transparent opacity={0.5} />
        </mesh>
      );
    }

    return (
      <mesh position={[cx, yPos, cz]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.5} />
      </mesh>
    );
  };

  return (
    <group>
      {/* Plano Base (Suelo Verde) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]} // Position slightly higher if needed, but 0 is fine if transparent
        receiveShadow // Doesn't matter if invisible
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial transparent opacity={0} /> {/* Invisible, solo para eventos */}
      </mesh>

      {/* Visualización del área que estamos arrastrando */}
      {renderPreview()}
    </group>
  );
}
