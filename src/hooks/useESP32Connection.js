import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore";

/**
 * Hook de React para controlar la conexión en tiempo real con el auto real (ESP32).
 * Mapea los controles de Zustand a la sintaxis del microcontrolador STM32 y envía comandos a 25Hz.
 */
export function useESP32Connection(esp32Ip = "192.168.0.50") {
    const [status, setStatus] = useState("DISCONNECTED"); // "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR"
    const [latency, setLatency] = useState(0);
    const [txData, setTxData] = useState({ angle: 90, ac: 0 });
    
    const socketRef = useRef(null);
    const intervalRef = useRef(null);
    const lastPingTimeRef = useRef(Date.now());

    const connect = () => {
        if (socketRef.current) return;
        setStatus("CONNECTING");

        const wsUrl = `ws://${esp32Ip}/ws`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            setStatus("CONNECTED");
            console.log(`[ESP32] Conectado exitosamente en ${wsUrl}`);
            
            // Bucle de transmisión a 25Hz (cada 40ms)
            intervalRef.current = setInterval(sendControlPacket, 40);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Handshake de inicialización obligatorio en el firmware del ESP32
                if (data.encendido === true) {
                    socket.send(JSON.stringify({ en: 1 }));
                }
                
                // Calcular latencia
                setLatency(Date.now() - lastPingTimeRef.current);
            } catch (e) {
                // Mensaje no-JSON o log ordinario
            }
        };

        socket.onclose = () => {
            cleanup();
            setStatus("DISCONNECTED");
        };

        socket.onerror = () => {
            setStatus("ERROR");
            cleanup();
        };
    };

    const cleanup = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    };

    const disconnect = () => {
        cleanup();
        setStatus("DISCONNECTED");
    };

    const sendControlPacket = () => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        const store = useStore.getState();
        const { steering, throttle, direction } = store.controls;

        // 1. Mapear Aceleración (0 a 100)
        const ac = parseFloat(Math.max(0, Math.min(100, throttle * 100)).toFixed(2));

        // 2. Mapear Ángulo y Marcha
        // Ruedas rectas = 90 grados. Dirección positiva = adelante, negativa = atrás.
        const baseAngle = 90 - (steering * 60);
        const angle = parseFloat((direction * baseAngle).toFixed(2));

        // Actualizar telemetría transmitida para renderizado UI
        setTxData({ angle, ac });

        // 3. Envío por WebSocket
        lastPingTimeRef.current = Date.now();
        socketRef.current.send(JSON.stringify({ angle, ac }));
    };

    useEffect(() => {
        return cleanup;
    }, [esp32Ip]);

    return { status, latency, txData, connect, disconnect };
}
