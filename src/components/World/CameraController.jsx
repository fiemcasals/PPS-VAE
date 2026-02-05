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
    rotateLeft: false,
    rotateRight: false,
    rotateUp: false,
    rotateDown: false,
  });

  // Manejador de eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case "KeyW": movement.current.forward = true; break;
        case "KeyS": movement.current.backward = true; break;
        case "KeyA": movement.current.left = true; break;
        case "KeyD": movement.current.right = true; break;
        case "ArrowLeft": movement.current.rotateLeft = true; break;
        case "ArrowRight": movement.current.rotateRight = true; break;
        case "ArrowUp": movement.current.rotateUp = true; break;
        case "ArrowDown": movement.current.rotateDown = true; break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case "KeyW": movement.current.forward = false; break;
        case "KeyS": movement.current.backward = false; break;
        case "KeyA": movement.current.left = false; break;
        case "KeyD": movement.current.right = false; break;
        case "ArrowLeft": movement.current.rotateLeft = false; break;
        case "ArrowRight": movement.current.rotateRight = false; break;
        case "ArrowUp": movement.current.rotateUp = false; break;
        case "ArrowDown": movement.current.rotateDown = false; break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Snap to car when switching to FREE or BIFOCAL mode
  useEffect(() => {
    if (cameraMode === "FREE" || cameraMode === "BIFOCAL" || isEditing) {
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

    // Lógica para DRIVER (Frontal)
    if (cameraMode === "DRIVER" && vehicleState) {
      // Posición del conductor (aproximada dentro de la cabina)
      // Ajustar offsets según el modelo del auto (e.g., +0.5m x, +1.5m y, +0.5m z relativo al centro rotado)
      // Asumimos que heading es la rotación en Y.
      const carPos = new THREE.Vector3(vehicleState.x, 1.6, vehicleState.z); // Altura de ojos aprox

      // Offset hacia adelante (z) y un poco a la izquierda/derecha si se quiere
      // Asumiendo +Z es "hacia adelante" en el modelo local del auto antes de rotar
      // Pero en el mundo, heading define la dirección.
      // Offset de 0.5 hacia adelante del centro del auto
      const forwardOffset = 1.0;

      const camX = carPos.x + Math.sin(vehicleState.heading) * forwardOffset;
      const camZ = carPos.z + Math.cos(vehicleState.heading) * forwardOffset;

      const targetPos = new THREE.Vector3(camX, 1.8, camZ);

      // Mirar hacia adelante
      const lookAtDist = 10.0;
      const lookAtX = carPos.x + Math.sin(vehicleState.heading) * (forwardOffset + lookAtDist);
      const lookAtZ = carPos.z + Math.cos(vehicleState.heading) * (forwardOffset + lookAtDist);

      // Lerp más rápido para sentir la inercia del auto
      // MAURI FIX: Eliminamos lerp para que la cámara quede FIJA y sin lag (Extrictamente solidaria al auto)
      camera.position.copy(targetPos);
      camera.lookAt(lookAtX, 1.8, lookAtZ);
    }

    // Lógica para BIFOCAL (Placeholder - Dejar libre por ahora)
    if (cameraMode === "BIFOCAL") {
      // Por ahora no hace nada específico, permitimos que se quede donde estaba o que sea controlable si decidimos
      // El usuario pidió "dejalo libre", así que podríamos dejarlo como FREE o estático.
      // Si queremos que sea "libre" de control like FREE, necesitamos habilitar OrbitControls.
      // Pero si es para conectar una cámara real, quizás solo dejamos la cámara quieta.
      // Vamos a tratarlo como FREE MODE en cuanto a controles por ahora para no bloquear.
    }

    // Lógica de movimiento manual (WASD) y rotación (Flechas) para FREE/EDIT/BIFOCAL mode
    if ((cameraMode === "FREE" || cameraMode === "BIFOCAL" || isEditing) && controlsRef.current) {
      const speed = 40 * delta; // Velocidad de movimiento
      const rotateSpeed = 2.0 * delta; // Velocidad de rotación

      // --- MOVIMIENTO (WASD) ---
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
        camera.position.add(moveDir);
        controlsRef.current.target.add(moveDir);
      }

      // --- ROTACIÓN (FLECHAS) ---
      if (
        movement.current.rotateLeft ||
        movement.current.rotateRight ||
        movement.current.rotateUp ||
        movement.current.rotateDown
      ) {
        const offset = new THREE.Vector3().copy(camera.position).sub(controlsRef.current.target);

        // Usamos esféricas para rotar alrededor del target
        const spherical = new THREE.Spherical().setFromVector3(offset);

        if (movement.current.rotateLeft) spherical.theta += rotateSpeed;
        if (movement.current.rotateRight) spherical.theta -= rotateSpeed;
        if (movement.current.rotateUp) spherical.phi -= rotateSpeed;
        if (movement.current.rotateDown) spherical.phi += rotateSpeed;

        // Limitar ángulo vertical (Polar) para no dar la vuelta completa
        spherical.phi = Math.max(0.01, Math.min(Math.PI / 2.1, spherical.phi));

        spherical.makeSafe();

        // Convertir de nuevo a cartesianas y aplicar
        offset.setFromSpherical(spherical);

        camera.position.copy(controlsRef.current.target).add(offset);
        camera.lookAt(controlsRef.current.target);
      }

      // Siempre actualizamos controles para mantener sincronía si hubo cambios
      if (moveDir.lengthSq() > 0 || movement.current.rotateLeft || movement.current.rotateRight || movement.current.rotateUp || movement.current.rotateDown) {
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      {(cameraMode === "FREE" || cameraMode === "BIFOCAL" || isEditing) && (
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
