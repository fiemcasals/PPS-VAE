import { useStore } from "../../store/useStore";

export function MapVisualizer() {
  // CORRECTO: Todos los hooks dentro de la función
  const gridData = useStore((state) => state.gridData);

  const GRID_SIZE = useStore((state) => state.GRID_SIZE);

  // Validación: si no hay datos, no renderizamos nada para evitar errores
  if (!gridData) return null;

  return (
    <group>
      {Object.entries(gridData).map(([key, value]) => {
        const [x, z] = key.split(",").map(Number);
        return (
          <mesh key={key} position={[x, 0.05, z]}>
            <boxGeometry args={[GRID_SIZE, 0.1, GRID_SIZE]} />
            <meshStandardMaterial
              color={value.type === "road" ? "#111111" : "#ffcc00"}
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}
