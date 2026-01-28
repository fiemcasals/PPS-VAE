import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStore } from "../../store/useStore";
import * as THREE from "three";

export function CameraController() {
  const { gl } = useThree();
  const { camera } = useThree();
  const controlsRef = useRef();
  const cameraMode = useStore((state) => state.cameraMode);
  const vehicleState = useStore((state) => state.vehicleState);
  const selectedTool = useStore((state) => state.selectedTool);

  // Referencia para suavizar el movimiento de la cámara
  const currentPosition = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());

  const isEditing = selectedTool !== "none";

  // Efecto para que el teclado funcione apenas cargues o cambies de herramienta
  useEffect(() => {
    const handleFocus = () => {
      // Forzamos al canvas a capturar el teclado
      gl.domElement.setAttribute("tabindex", "0");
      gl.domElement.focus();
    };

    window.addEventListener("mousedown", handleFocus);
    return () => window.removeEventListener("mousedown", handleFocus);
  }, [gl]);

  useFrame((state, delta) => {
    if (cameraMode !== "FOLLOW" || !vehicleState || isEditing) return;

    // Posición objetivo del auto
    const carPos = new THREE.Vector3(vehicleState.x, 0, vehicleState.z);

    // Calcular la posición deseada de la cámara (detrás y arriba)
    // Usamos el heading del auto para posicionarnos detrás
    const distance = 35;
    const height = 10;

    // Offset relativo al auto: -sin(heading) para X, -cos(heading) para Z nos pone detrás
    const cameraOffsetX = -Math.sin(vehicleState.heading) * distance;
    const cameraOffsetZ = -Math.cos(vehicleState.heading) * distance;

    const targetPosition = new THREE.Vector3(
      carPos.x + cameraOffsetX,
      carPos.y + height,
      carPos.z + cameraOffsetZ,
    );

    // Interpolación suave (Lerp)
    // Ajustar el factor 5.0 para más o menos suavidad (más bajo = más suave/lento)
    currentPosition.current.lerp(targetPosition, delta * 5.0);
    currentLookAt.current.lerp(carPos, delta * 5.0);

    camera.position.copy(currentPosition.current);
    camera.lookAt(currentLookAt.current);
  });

  // Resetear controles cuando cambiamos de modo
  useEffect(() => {
    if (cameraMode === "FREE") {
      // Posición inicial por defecto para modo libre si se desea
      // camera.position.set(15, 10, 15);
    }
  }, [cameraMode, camera]);

  return (
    <>
      {(cameraMode === "FREE" || isEditing) && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          listenToKeyEvents={window} // IMPORTANTE: escucha al teclado global
          // ✅ Si estamos editando, desactivamos rotación (mouse izquierdo)
          // para que no interfiera con el trazo del camino.
          enableRotate={!isEditing}
          // ✅ Configuramos las teclas para PAN (desplazamiento lateral)
          keys={{
            LEFT: "KeyA", // Tecla A
            UP: "KeyW", // Tecla W
            RIGHT: "KeyD", // Tecla D
            BOTTOM: "KeyS", // Tecla S
          }}
          // IMPORTANTE: Para que WASD mueva la cámara lateralmente
          screenSpacePanning={true}
          // Sensibilidad del teclado (puedes ajustarla)
          keyPanSpeed={20}
          mouseButtons={{
            LEFT: isEditing ? -1 : THREE.MOUSE.ROTATE, // -1 es desactivado
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.1}
        />
      )}
    </>
  );
}
