import { findPathAsync } from './src/utils/pathfinding.js';
import fs from 'fs';

// Cargar prueba1.json
const levelData = JSON.parse(fs.readFileSync('../rover - godot/prueba1.json', 'utf8'));
const tiles = levelData.tiles;
const cellSize = 4.0;
const gridData = {};

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

const start = { x: 12.00, z: 12.00, heading: Math.PI };
const goal = { x: 36.00, z: 36.00 };

console.log("Calculando ruta...");
findPathAsync(start, goal, gridData, cellSize).then(result => {
  if (result && result.path) {
    console.log(`Ruta encontrada con ${result.path.length} puntos.`);
    result.path.forEach((pt, idx) => {
      console.log(`[${idx}] x=${pt.x.toFixed(2)}, z=${pt.z.toFixed(2)}, dir=${pt.direction}, steer=${pt.steer.toFixed(2)}`);
    });
  } else {
    console.log("No se encontró ruta.");
  }
}).catch(err => {
  console.error("Error:", err);
});
