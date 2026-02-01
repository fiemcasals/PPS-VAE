import { useStore } from "../../store/useStore";

export function MapVisualizer() {
  const gridData = useStore((state) => state.gridData);
  const buildings = useStore((state) => state.buildings); // Nueva lista de edificios
  const GRID_SIZE = useStore((state) => state.GRID_SIZE);

  if (!gridData) return null;

  return (
    <group>
      {/* 1. RENDERIZADO DE GRILLA (Caminos, Destinos, Árboles) */}
      {Object.entries(gridData).map(([key, value]) => {
        const [x, z] = key.split(",").map(Number);

        // ROAD & DESTINATION
        if (value.type === "road" || value.type === "destination") {
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
        }

        // TREES (Árboles - Estilo "Ramas a la vista")
        if (value.type === "tree") {
          return (
            <group key={key} position={[x, 0, z]}>
              {/* Tronco Principal (más fino y alto) */}
              <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.1, 0.15, 2, 6]} />
                <meshStandardMaterial color="#5D4037" />
              </mesh>

              {/* Rama 1 (Derecha abajo) */}
              <mesh position={[0.3, 1.2, 0]} rotation={[0, 0, -0.5]}>
                <cylinderGeometry args={[0.05, 0.08, 0.8, 4]} />
                <meshStandardMaterial color="#5D4037" />
              </mesh>
              {/* Follaje Rama 1 */}
              <mesh position={[0.6, 1.5, 0]}>
                <dodecahedronGeometry args={[0.4]} />
                <meshStandardMaterial color="#2d5a27" />
              </mesh>

              {/* Rama 2 (Izquierda arriba) */}
              <mesh position={[-0.2, 1.6, 0.2]} rotation={[0.5, 0, 0.5]}>
                <cylinderGeometry args={[0.05, 0.08, 0.6, 4]} />
                <meshStandardMaterial color="#5D4037" />
              </mesh>
              {/* Follaje Rama 2 */}
              <mesh position={[-0.4, 1.9, 0.3]}>
                <dodecahedronGeometry args={[0.35]} />
                <meshStandardMaterial color="#2d5a27" />
              </mesh>

              {/* Follaje Superior (Poco tupido) */}
              <mesh position={[0, 2.2, 0]}>
                <dodecahedronGeometry args={[0.5]} />
                <meshStandardMaterial color="#2d5a27" />
              </mesh>
            </group>
          );
        }

        // STREETLIGHT (Farola)
        if (value.type === "streetlight") {
          return (
            <group key={key} position={[x, 0, z]}>
              {/* Poste */}
              <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.05, 0.1, 4, 8]} />
                <meshStandardMaterial color="#2c3e50" />
              </mesh>
              {/* Lámpara */}
              <mesh position={[0.4, 3.8, 0]} rotation={[0, 0, -0.5]}>
                <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
                <meshStandardMaterial color="#2c3e50" />
              </mesh>
              {/* Bulbo de Luz */}
              <mesh position={[0.6, 3.7, 0]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshStandardMaterial color="#ffffcc" emissive="#ffff00" emissiveIntensity={2} />
              </mesh>
              {/* Luz real */}
              <pointLight position={[0.6, 3.5, 0]} intensity={2} distance={10} color="#ffffcc" />
            </group>
          );
        }

        // FLAG (Bandera Argentina)
        if (value.type === "flag") {
          return (
            <group key={key} position={[x, 0, z]}>
              {/* Mástil */}
              <mesh position={[0, 3, 0]}>
                <cylinderGeometry args={[0.05, 0.1, 6, 8]} />
                <meshStandardMaterial color="#ecf0f1" metalness={0.5} roughness={0.2} />
              </mesh>
              {/* Bandera (Celeste - Blanca - Celeste) */}
              <group position={[0.8, 5.5, 0]}>
                {/* Franja Superior */}
                <mesh position={[0, 0.33, 0]}>
                  <boxGeometry args={[1.6, 0.33, 0.05]} />
                  <meshStandardMaterial color="#74acdf" />
                </mesh>
                {/* Franja Media */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[1.6, 0.33, 0.05]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                {/* Sol (Amarillo simple) */}
                <mesh position={[0, 0, 0.03]}>
                  <circleGeometry args={[0.1, 8]} />
                  <meshBasicMaterial color="#f1c40f" />
                </mesh>
                {/* Franja Inferior */}
                <mesh position={[0, -0.33, 0]}>
                  <boxGeometry args={[1.6, 0.33, 0.05]} />
                  <meshStandardMaterial color="#74acdf" />
                </mesh>
              </group>
            </group>
          );
        }

        // OBSTACULOS (Simplemente suelo bloqueado)
        return null;
      })}

      {/* 2. RENDERIZADO DE EDIFICIOS Y SUELOS */}
      {(buildings || []).map((b) => {
        // --- SUELO (Baldosas) ---
        if (b.type === "floor") {
          return (
            <mesh key={b.id} position={[b.x, 0.02, b.z]}>
              <boxGeometry args={[b.width, 0.05, b.depth]} />
              <meshStandardMaterial color="#95a5a6" roughness={0.8} /> {/* Gris Baldosa */}
            </mesh>
          );
        }

        // --- EDIFICIO (Galpón Militar) ---
        return (
          <group key={b.id} position={[b.x, b.depth > b.width ? 1.5 : 2, b.z]}>
            {/* Cuerpo del edificio (Estilo Militar) */}
            <mesh>
              <boxGeometry args={[b.width, 3, b.depth]} />
              <meshStandardMaterial color="#4b5d4b" roughness={0.9} /> {/* Verde Oliva */}
            </mesh>

            {/* Techo (A dos aguas simulado o plano simple por ahora) */}
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[b.width + 0.2, 0.2, b.depth + 0.2]} />
              <meshStandardMaterial color="#3e2723" />
            </mesh>

            {/* --- PUERTAS EN LOS 4 LADOS --- */}
            {/* Frontal (Z+) */}
            <mesh position={[0, -0.5, b.depth / 2 + 0.05]}>
              <planeGeometry args={[1.5, 2]} />
              <meshStandardMaterial color="#3e2723" />
            </mesh>
            {/* Trasera (Z-) */}
            <mesh position={[0, -0.5, -b.depth / 2 - 0.05]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[1.5, 2]} />
              <meshStandardMaterial color="#3e2723" />
            </mesh>
            {/* Derecha (X+) */}
            <mesh position={[b.width / 2 + 0.05, -0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[1.5, 2]} />
              <meshStandardMaterial color="#3e2723" />
            </mesh>
            {/* Izquierda (X-) */}
            <mesh position={[-b.width / 2 - 0.05, -0.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.5, 2]} />
              <meshStandardMaterial color="#3e2723" />
            </mesh>

            {/* --- VENTANAS EN LOS 4 LADOS (A los lados de las puertas) --- */}
            {/* Frontal y Trasera (Si el ancho > 3) */}
            {b.width > 3 && (
              <>
                {/* Frontal */}
                <mesh position={[1.5, 0.5, b.depth / 2 + 0.06]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
                <mesh position={[-1.5, 0.5, b.depth / 2 + 0.06]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
                {/* Trasera */}
                <mesh position={[1.5, 0.5, -b.depth / 2 - 0.06]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
                <mesh position={[-1.5, 0.5, -b.depth / 2 - 0.06]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
              </>
            )}

            {/* Derecha e Izquierda (Si la profundidad > 3) */}
            {b.depth > 3 && (
              <>
                {/* Derecha */}
                <mesh position={[b.width / 2 + 0.06, 0.5, 1.5]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
                <mesh position={[b.width / 2 + 0.06, 0.5, -1.5]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
                {/* Izquierda */}
                <mesh position={[-b.width / 2 - 0.06, 0.5, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
                <mesh position={[-b.width / 2 - 0.06, 0.5, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#87ceeb" />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
