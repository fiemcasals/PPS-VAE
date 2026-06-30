import { WebSocketServer } from 'ws';
import { findPathAsync } from './src/utils/pathfinding.js';
import { VEHICLE_CONFIG } from './src/components/Vehicle/Physics/vehicleConfig.js';

const PORT = 8767;
const wss = new WebSocketServer({ port: PORT });

let gridData = {};
let cellSize = 4.0;

class PathTracker {
  constructor() {
    this.path = [];
    this.currentIndex = 0;
    this.maxSpeed = VEHICLE_CONFIG.MAX_SPEED;       // 10.0
    this.wheelbase = VEHICLE_CONFIG.WHEELBASE;     // 2.4
    this.maxSteer = VEHICLE_CONFIG.MAX_STEER_ANGLE; // 0.8 rad
  }

  setPath(path) {
    this.path = path;
    this.currentIndex = 0;
    console.log(`[Tracker] New path set with ${path.length} waypoints.`);
  }

  stop() {
    this.path = [];
    this.currentIndex = 0;
    console.log("[Tracker] Tracking stopped.");
  }

  update(x, z, heading, speed) {
    if (!this.path || this.path.length === 0) {
      return {
        steering: 0,
        throttle: 0,
        brake: 30,
        direction: 1,
        current_waypoint_index: 0,
        target_point: null
      };
    }

    // 1. Index update (based on AutonomousController.jsx)
    let bestIndex = this.currentIndex;
    let node = this.path[bestIndex];
    const d = Math.hypot(node.x - x, node.z - z);

    let nextNode = this.path[bestIndex + 1];
    let arrivalThreshold = 2.0;

    if (nextNode && nextNode.direction !== node.direction) {
      arrivalThreshold = (bestIndex === 0) ? 2.0 : 0.5;
    }

    if (d < arrivalThreshold && bestIndex < this.path.length - 1) {
      const willChangeDir = nextNode && nextNode.direction !== node.direction;
      if (willChangeDir) {
        if (Math.abs(speed) > 0.1) {
          // Decelerate and wait for stop before changing gears
          return {
            steering: 0,
            throttle: 0,
            brake: 25,
            direction: node.direction || 1,
            current_waypoint_index: bestIndex,
            target_point: { x: node.x, z: node.z }
          };
        }
      }
      bestIndex++;
    }

    this.currentIndex = bestIndex;

    // Check if final destination reached
    if (this.currentIndex >= this.path.length - 1 && d < 1.0) {
      console.log("[Tracker] Destination reached!");
      this.path = [];
      return {
        steering: 0,
        throttle: 0,
        brake: 30,
        direction: 1,
        current_waypoint_index: this.currentIndex,
        target_point: null,
        completed: true
      };
    }

    // 2. Lookahead logic
    const isManeuver = nextNode && nextNode.direction !== node.direction;
    let lookaheadDist = isManeuver ? 0.2 : Math.max(3.0, Math.abs(speed) * 0.4 + 2.0);
    if (this.currentIndex < 5) {
      lookaheadDist = Math.max(lookaheadDist, 1.5);
    }

    let lookaheadIndex = this.currentIndex;
    const currentDir = this.path[this.currentIndex].direction || 1;

    for (let i = this.currentIndex; i < this.path.length; i++) {
      if (this.path[i].direction !== currentDir) {
        lookaheadIndex = Math.max(this.currentIndex, i - 1);
        break;
      }
      const p = this.path[i];
      const dist = Math.hypot(p.x - x, p.z - z);
      if (dist >= lookaheadDist) {
        lookaheadIndex = i;
        break;
      }
      lookaheadIndex = i;
    }

    const target = this.path[lookaheadIndex];
    const desiredDir = target.direction || 1;

    // 3. Steering calculations (Pure Pursuit)
    const dx = target.x - x;
    const dz = target.z - z;
    const targetAngle = Math.atan2(dx, dz);

    let virtualHeading = heading;
    let actualMotionDir = 0;
    if (speed > 0.2) actualMotionDir = 1;
    else if (speed < -0.2) actualMotionDir = -1;

    const effectiveDir = actualMotionDir !== 0 ? actualMotionDir : desiredDir;
    if (effectiveDir === -1) {
      virtualHeading += Math.PI;
    }

    let angleError = targetAngle - virtualHeading;
    while (angleError > Math.PI) angleError -= 2 * Math.PI;
    while (angleError < -Math.PI) angleError += 2 * Math.PI;

    let newSteer = -Math.atan2(2.0 * this.wheelbase * Math.sin(angleError), lookaheadDist);
    if (effectiveDir === -1) {
      newSteer *= -1;
    }

    // Clamp steering to max steering angle of config
    newSteer = Math.max(-this.maxSteer, Math.min(this.maxSteer, newSteer));

    // 4. Throttle & speed control
    const isWrongWay = (speed > 1.5 && desiredDir === -1) || (speed < -1.5 && desiredDir === 1);
    const canAccelerate = !isWrongWay;

    const maxTurnError = 0.8;
    let throttleFactor = 1.0 - Math.min(Math.abs(angleError) / maxTurnError, 1.0);
    const baseThrottle = 0.4;
    const minThrottle = 0.2;
    let newThrottle = minThrottle + (baseThrottle - minThrottle) * throttleFactor;

    if (Math.abs(angleError) > maxTurnError) {
      if (Math.abs(speed) < 0.2) {
        newThrottle = 0.25;
      } else {
        newThrottle = 0.1;
      }
    }

    // Corner detection (predictive braking)
    let curveAhead = false;
    const lookAheadCount = 10;
    for (let i = this.currentIndex; i < Math.min(this.currentIndex + lookAheadCount, this.path.length); i++) {
      const p = this.path[i];
      if (Math.abs(p.steer) > 0.1 || (i > this.currentIndex && p.direction !== this.path[i - 1].direction)) {
        curveAhead = true;
        break;
      }
    }

    if (curveAhead) {
      if (speed > 1.5) {
        newThrottle = 0;
      } else {
        newThrottle = Math.min(newThrottle, 0.15);
      }
    }

    let finalThrottle = canAccelerate ? newThrottle : 0;
    let finalBrake = isWrongWay ? 30.0 : (finalThrottle === 0 ? 5.0 : 0.0);

    return {
      steering: newSteer,
      throttle: finalThrottle,
      brake: finalBrake,
      direction: desiredDir,
      current_waypoint_index: this.currentIndex,
      target_point: { x: target.x, z: target.z }
    };
  }
}

const tracker = new PathTracker();

console.log(`[PPS-VAE Logic Server] Running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[PPS-VAE Logic Server] Client connected');

  ws.on('message', async (messageStr) => {
    let data;
    try {
      data = JSON.parse(messageStr);
    } catch (e) {
      console.error("[PPS-VAE Logic Server] Failed to parse message:", messageStr);
      return;
    }

    const { type } = data;

    if (type === 'init_level') {
      const { tiles, tile_spacing } = data;
      cellSize = tile_spacing || 4.0;
      gridData = {};

      console.log(`[PPS-VAE Logic Server] Loading level grid ${tiles.length}x${tiles[0].length}, cell size: ${cellSize}`);

      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < tiles[r].length; c++) {
          const tile_type = tiles[r][c];
          const cx = c * cellSize;
          const cz = r * cellSize;

          let pf_type = 'obstacle';
          const t = typeof tile_type === 'string' ? tile_type.toLowerCase() : tile_type;

          if (t === 'caminable' || t === 'spawn_point' || t === 'road' || t === 'peso_3_4' || t === 1 || t === 2 || t === 3) {
            pf_type = 'road';
          } else if (t === 'punto_interes' || t === 'objetivo' || t === 'destination' || t === 4 || t === 6) {
            pf_type = 'destination';
          }

          gridData[`${cx},${cz}`] = { type: pf_type };
        }
      }
      ws.send(JSON.stringify({ type: 'level_initialized' }));
    }

    else if (type === 'calculate_path') {
      const { start, goal } = data;
      console.log(`[PPS-VAE Logic Server] Calculating path from (${start.x.toFixed(2)}, ${start.z.toFixed(2)}) to (${goal.x.toFixed(2)}, ${goal.z.toFixed(2)})`);

      try {
        const result = await findPathAsync(start, goal, gridData, cellSize);
        if (result && result.path) {
          console.log(`[PPS-VAE Logic Server] Path found with ${result.path.length} points.`);
          tracker.setPath(result.path);

          ws.send(JSON.stringify({
            type: 'path_calculated',
            path: result.path
          }));
        } else {
          console.log('[PPS-VAE Logic Server] No path found.');
          ws.send(JSON.stringify({ type: 'path_failed' }));
        }
      } catch (err) {
        console.error('[PPS-VAE Logic Server] Error calculating path:', err);
        ws.send(JSON.stringify({ type: 'path_failed', error: err.message }));
      }
    }

    else if (type === 'set_path') {
      const { path } = data;
      if (path && Array.isArray(path)) {
        console.log(`[PPS-VAE Logic Server] Path overridden by client (shifted/smoothed lane, ${path.length} points).`);
        console.log("First 3 points direction:", path.slice(0, 3).map(p => p.direction));
        tracker.setPath(path);
      }
    }

    else if (type === 'telemetry') {
      const { x, z, heading, speed } = data;
      const orders = tracker.update(x, z, heading, speed);
      
      if (Math.random() < 0.01) {
        console.log(`[Telemetry] x=${x.toFixed(2)}, z=${z.toFixed(2)}, speed=${speed.toFixed(2)} | Orders: steer=${orders.steering.toFixed(2)}, throttle=${orders.throttle.toFixed(2)}, brake=${orders.brake.toFixed(2)}, completed=${orders.completed || false}`);
      }

      ws.send(JSON.stringify({
        type: 'orders',
        ...orders
      }));
    }

    else if (type === 'stop') {
      tracker.stop();
      ws.send(JSON.stringify({
        type: 'orders',
        steering: 0,
        throttle: 0,
        brake: 30,
        direction: 1,
        current_waypoint_index: 0,
        target_point: null
      }));
    }
  });

  ws.on('close', () => {
    console.log('[PPS-VAE Logic Server] Client disconnected');
  });
});
