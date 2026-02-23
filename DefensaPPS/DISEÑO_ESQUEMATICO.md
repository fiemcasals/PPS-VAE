# Diseño Esquemático del Sistema PPS-VAE

Este documento describe la arquitectura técnica del sistema de navegación autónoma y control de vehículos del proyecto.

## Arquitectura General

El sistema se basa en una arquitectura de **Bucle Cerrado** donde la percepción (Escenario 3D) alimenta la lógica de navegación (Segmentada), que a su vez genera comandos para el actuador (Vehículo).

```mermaid
graph TD
    subgraph "Interfaz de Usuario (React)"
        Toolbar[Editor Toolbar]
        HUD[Panel de Telemetría/HUD]
        Joystick[Joystick Control]
    end

    subgraph "Gestión de Estado (Zustand)"
        Store[useStore.js]
    end

    subgraph "Lógica de Navegación"
        TP[Topology Pathfinder - Dijkstra]
        AF[findPathAsync - A* Híbrido]
        SegmentedLogic[Navegación Segmentada]
    end

    subgraph "Mundo 3D (React-Three-Fiber)"
        Map[MapVisualizer]
        Car[Vehicle Physics]
        Turret[Turret System]
    end
El presente proyecto, denominado **SCCpVA** (Sistema de Comando y Control para Vehículos Autónomos), surge como una respuesta a la necesidad de evolución tecnológica dentro de la Facultad de Ingeniería del Ejército (FIE). Actualmente, la institución cuenta con un prototipo vehicular capaz de ser operado de forma remota a corta distancia; sin embargo, este esquema presenta limitaciones críticas: la dependencia de la línea de visión directa, la falta de una interfaz de telemetría visual robusta y la imposibilidad de operar en escenarios de larga distancia.

El **SCCpVA** se propone como una solución integral que trasciende el manejo radial básico para establecer un ecosistema de comando y control avanzado. Este proyecto representa la evolución y continuación directa del proyecto **VAE** (Vehículo Autónomo Eléctrico). Mientras que el VAE proporcionó una plataforma robusta con una estructura física completa y capacidades de transporte de material o personal, el SCCpVA dota a esta base de la inteligencia y conectividad necesarias para operaciones complejas.

Los pilares fundamentales de esta solución son:

1.  **Robustez en el Comando a Larga Distancia:** Implementación de una arquitectura cliente-servidor basada en tecnologías web modernas (React, Vite, Django) que permite el control y monitoreo del vehículo a través de redes IP, superando las limitaciones geográficas del control remoto tradicional. Actualmente operando mediante una VPN, el sistema permite la supervisión desde cualquier punto dentro de la red de la FIE, lugar donde reside el vehículo.
2.  **Entorno de Simulación Integrado:** Desarrollo de un simulador de alta fidelidad que funciona como un "entorno de prueba seguro". Este simulador es vital para el ciclo de desarrollo, ya que permite validar algoritmos de navegación y lógicas de seguridad sin poner en riesgo la integridad física del hardware real, ni de su entorno operativo.
3.  **Navegación Autónoma y Proyección Táctica:** Integración de algoritmos de trayectoria avanzada (como A* y Hybrid A*) y sistemas de visión artificial. Esto no solo facilita la autonomía, sino que sienta las bases para futuras capacidades operativas, como la posibilidad de artillar la plataforma para prestar apoyo de fuego en primera línea, garantizando un nivel nulo de exposición para el personal humano.
    Toolbar -->|Define Destino| Store
    Store -->|Datos de Mapa| TP
    TP -->|Ruta Macro/Waypoints| SegmentedLogic
    SegmentedLogic -->|Tramo Local| AF
    AF -->|Ruta Detallada| Store
    Store -->|Waypoints/Ruta| Map
    Store -->|Control Simulado| Car
    Joystick -->|Control Manual| Turret
    Car -->|Telemetría| Store
    Store --> HUD
```

## Componentes Clave

### 1. Sistema de Navegación Dual
- **Nivel Macro (Topológico):** Utiliza **Dijkstra** sobre un grafo de puntos clave (nodos rojos) para determinar la secuencia de calles a seguir. Genera **Waypoints** (puntos azules).
- **Nivel Micro (Geométrico):** Utiliza **A* Híbrido** segmentalmente. Se enfoca en un hito a la vez, garantizando trayectorias suaves y evitando obstáculos locales.

### 2. Capa de Visualización (Digital Twin)
- **MapVisualizer:** Renderiza dinámicamente el suelo, edificios, vegetación y la red vial.
- **PathVisualizer:** Muestra en tiempo real la "nube de exploración" (puntos rojos) y la trayectoria final calculada (línea verde/naranja).

### 3. Sistemas de Seguridad y Detección
- **Visión Artificial:** Integración de **COCO-SSD (TensorFlow.js)** para detección de personas en tiempo real.
- **Freno Automático:** Lógica de seguridad que bloquea el acelerador ante una detección de peligro (< 2.3m).

### 4. Control de Armamento (Torreta)
- **Sistema de Gimbal Dual:** Control de Yaw (horizontal) y Pitch (vertical) mediante joysticks virtuales, con cámara en primera persona integrada para precisión operativa.
