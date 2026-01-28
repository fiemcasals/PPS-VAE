export const VEHICLE_CONFIG = {
    // Dimensiones (en metros)
    WIDTH: 2.0,
    LENGTH: 4.5,
    WHEELBASE: 2.7, // Distancia entre ejes

    // Física
    MAX_SPEED: 20.0, // m/s (~72 km/h)
    MAX_REVERSE_SPEED: 5.0, // m/s
    ACCELERATION: 10.0, // m/s^2
    BRAKING: 20.0, // m/s^2
    FRICTION: 2.0, // Desaceleración natural
    TURN_SPEED: 2.0, // Velocidad de giro de las ruedas (rad/s)
    MAX_STEER_ANGLE: Math.PI / 4, // 45 grados
};
