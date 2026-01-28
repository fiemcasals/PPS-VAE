import React from "react";
import Joystick from "./Joystick";
import Throttle from "./Throttle";
import { Telemetry } from "./Telemetry";
import { CameraToggle } from "./CameraToggle";

const HUD = () => {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {" "}
      {/* Contenedor absoluto que ocupa toda la pantalla, insert 0 significa top:0, right:0, bottom:0, left:0 */}
      <Telemetry />
      <CameraToggle />
      <Joystick />
      <Throttle />
    </div>
  );
};

export default HUD;
