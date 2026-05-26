import React from "react";
import Joystick from "./Joystick";
import Throttle from "./Throttle";
import { Telemetry } from "./Telemetry";
import { CameraToggle } from "./CameraToggle";
import { ThresholdControl } from "./ThresholdControl";
import { ESP32ControlPanel } from "./ESP32ControlPanel";

const HUD = () => {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {" "}
      {/* Contenedor absoluto que ocupa toda la pantalla, insert 0 significa top:0, right:0, bottom:0, left:0 */}
      <Telemetry />
      <CameraToggle />
      <Joystick />
      <Throttle />
      <ThresholdControl />
      <ESP32ControlPanel />
    </div>
  );
};

export default HUD;
