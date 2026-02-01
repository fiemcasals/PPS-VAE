// Definimos primero los valores base
const LENGTH = 3.0;

export const VEHICLE_CONFIG = {
  WIDTH: 1.5, // Tu pedido
  LENGTH: LENGTH,
  WHEELBASE: LENGTH * 0.8, // Proporcional al largo
  MAX_SPEED: 10.0,
  MAX_REVERSE_SPEED: 4.0,
  ACCELERATION: 4.0,
  BRAKING: 20.0,
  FRICTION: 4.0,
  TURN_SPEED: 10.0, // MAURI: Rápido pero no instantáneo, para suavizar jitter
  MAX_STEER_ANGLE: 0.6, // ~34 grados en radianes
};
