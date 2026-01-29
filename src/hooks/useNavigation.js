import { useStore } from "../store/useStore";
import { findPath } from "../utils/pathfinding";

export function useNavigation() {
    const { gridData, GRID_SIZE, vehicleState, setPath, setExplored, setAutonomous } = useStore();

    const calculateRoute = (targetPos) => {
        const start = {
            x: vehicleState.x,
            z: vehicleState.z,
            heading: vehicleState.heading
        };
        
        const goal = { x: targetPos.x, z: targetPos.z };

        const result = findPath(start, goal, gridData, GRID_SIZE);
        
        if (result.path) {
            setPath(result.path);
            setExplored(result.explored);
            setAutonomous(true);
        } else {
            console.error("No se encontró ruta");
            setExplored(result.explored); // Ver nube de puntos fallida
        }
    };

    return { calculateRoute };
}