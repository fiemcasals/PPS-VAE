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

  // Estado para el movimiento manual (WASD)
  const movement = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Manejador de eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case "KeyW": movement.current.forward = true; break;
        case "KeyS": movement.current.backward = true; break;
        case "KeyA": movement.current.left = true; break;
        case "KeyD": movement.current.right = true; break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case "KeyW": movement.current.forward = false; break;
        case "KeyS": movement.current.backward = false; break;
        case "KeyA": movement.current.left = false; break;
        case "KeyD": movement.current.right = false; break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Snap to car when switching to FREE mode
  useEffect(() => {
    if (cameraMode === "FREE" || isEditing) {
      const state = useStore.getState().vehicleState;
      if (state) {
        const carPos = new THREE.Vector3(state.x, 0, state.z);

        // Posicionamos la cámara arriba y atrás del auto, pero con control orbital
        // Mantenemos la altura y distancia actuales si es posible, o reseteamos a unos valores cómodos
        const offset = new THREE.Vector3(20, 20, 20);

        camera.position.copy(carPos).add(offset);
        camera.lookAt(carPos);

        if (controlsRef.current) {
          controlsRef.current.target.copy(carPos);
          controlsRef.current.update();
        }
      }
    }
  }, [cameraMode, isEditing, camera]);

  useFrame((state, delta) => {
    // Lógica de seguimiento (FOLLOW)
    if (cameraMode === "FOLLOW" && vehicleState && !isEditing) {
      const carPos = new THREE.Vector3(vehicleState.x, 0, vehicleState.z);
      const distance = 35;
      const height = 10;
      const cameraOffsetX = -Math.sin(vehicleState.heading) * distance;
      const cameraOffsetZ = -Math.cos(vehicleState.heading) * distance;

      const targetPosition = new THREE.Vector3(
        carPos.x + cameraOffsetX,
        carPos.y + height,
        carPos.z + cameraOffsetZ,
      );

      currentPosition.current.lerp(targetPosition, delta * 5.0);
      currentLookAt.current.lerp(carPos, delta * 5.0);

      camera.position.copy(currentPosition.current);
      camera.lookAt(currentLookAt.current);
    }

    // Lógica de movimiento manual (WASD) para FREE/EDIT mode
    if ((cameraMode === "FREE" || isEditing) && controlsRef.current) {
      const speed = 40 * delta; // Velocidad de movimiento
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0; // Mantener movimiento en plano XZ
      forward.normalize();

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();

      const moveDir = new THREE.Vector3();

      if (movement.current.forward) moveDir.add(forward);
      if (movement.current.backward) moveDir.sub(forward);
      if (movement.current.right) moveDir.add(right);
      if (movement.current.left) moveDir.sub(right);

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize().multiplyScalar(speed);

        // Movemos tanto la cámara como el target del OrbitControls
        camera.position.add(moveDir);
        controlsRef.current.target.add(moveDir);
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      {(cameraMode === "FREE" || isEditing) && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableRotate={!isEditing}
          enablePan={true} // Habilitamos pan con mouse derecho
          screenSpacePanning={true}
          mouseButtons={{
            LEFT: isEditing ? -1 : THREE.MOUSE.ROTATE,
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
