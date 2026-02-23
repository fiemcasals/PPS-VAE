# **SCCpVA**
# **Sistema de Comando y Control para Vehículos Autónomos**

*Informe Final del Proyecto de Promoción*
*y Síntesis presentado por el estudiante*

**[NOMBRE DEL ESTUDIANTE]**

*como requisito parcial para la obtención del título de*
*Ingeniero en Informática por la Facultad de Ingeniería del*
*Ejército 'Grl Div Manuel N. Savio' de la Universidad*
*de la Defensa Nacional.*

---

**TRIBUNAL EXAMINADOR**

Presidente - Tutor de Proyecto: **CR (R) Ing. Gabriel Vicente López**
Vocal 1: **CR (R) OIM Cesar Daniel Cicerchia**
Vocal 2: **[NOMBRE VOCAL 2]**

---

**Propiedad**
© 2026

Este ejemplar es propiedad de la Facultad de Ingeniería del Ejército. Los conceptos expresados en este trabajo son de exclusiva responsabilidad del autor y los tutores.

---

> **DEDICATORIA**
>
> A mi familia, compañeros y docentes de la FIE, por el apoyo constante durante estos años de formación y por brindarme las herramientas para afrontar este desafío con profesionalismo.

---

**AGRADECIMIENTOS**

En primer lugar, al TC OIM Marcelo Acuña por su visión y liderazgo en el proyecto VAE. Al CR (R) Ing. Gabriel Vicente López por su invaluable tutoría técnica. Finalmente, a la Facultad de Ingeniería del Ejército por el marco de excelencia académica.

---

# Abstract

El proyecto **SCCpVA (Sistema de Comando y Control para Vehículos Autónomos)** desarrolla un ecosistema tecnológico avanzado diseñado para dotar de inteligencia, autonomía y conectividad al proyecto VAE (Vehículo Autónomo Eléctrico). Su objetivo principal es permitir la operación remota segura y el control táctico a gran distancia, eliminando la dependencia del contacto visual directo. Mediante una arquitectura robusta basada en React y Django, comunicación cifrada vía VPN, y una navegación segmentada que utiliza algoritmos Dijkstra y A* Híbrido, el sistema permite la validación de misiones complejas. El uso de un Gemelo Digital (Digital Twin) de alta fidelidad garantiza la preservación de la vida humana y la integridad del material en operaciones hostiles o logísticas, permitiendo simulaciones previas al despliegue en hardware real.

# Palabras Clave
Vehículo Autónomo - Comando y Control - Hybrid A* - Dijkstra - Visión Artificial - Digital Twin - React - Django.

# Glosario
*   **SCCpVA:** Sistema de Comando y Control para Vehículos Autónomos.
*   **VAE:** Vehículo Autónomo Eléctrico.
*   **Gemelo Digital:** Representación virtual precisa de un activo físico para simulación.
*   **Hybrid A*:** Algoritmo de búsqueda con restricciones cinemáticas (radio de giro).
*   **RBAC:** Control de Acceso Basado en Roles.

# Abreviaturas y Acrónimos
**API:** Application Programming Interface (Interfaz de Programación de Aplicaciones)
**FIE:** Facultad de Ingeniería del Ejército
**GPS / GNSS:** Global Positioning System / Global Navigation Satellite System
**HUD:** Head-Up Display (Interfaz de visualización frontal)
**IMU:** Inertial Measurement Unit (Unidad de Medición Inercial)
**OIM:** Oficial Ingeniero Militar
**PIP:** Picture-in-Picture (Imagen sobre imagen)
**RBAC:** Role-Based Access Control (Control de acceso basado en roles)
**SCCpVA:** Sistema de Comando y Control para Vehículos Autónomos
**UI / UX:** Interfaz de usuario / Experiencia de usuario
**UGV:** Unmanned Ground Vehicle (Vehículo Terrestre no Tripulado)
**VAE:** Vehículo Autónomo Eléctrico
**VPN:** Virtual Private Network (Red Privada Virtual)
**VPS:** Virtual Private Server (Servidor Privado Virtual)

---

**CAPÍTULO 1**

## 1. Introducción

### 1.1. Antecedentes
El proyecto nace de la necesidad de evolucionar la plataforma **VAE (Vehículo Autónomo Eléctrico)** de la FIE. Originalmente limitado por el alcance de radiofrecuencia (Wi-Fi local < 100m) y carente de telemetría o autonomía, el VAE requerería una capa superior de inteligencia para ser operativamente viable en escenarios de defensa modernos.

### 1.2. Formulación del Problema
La operación de vehículos terrestres no tripulados (UGV) en el terreno presenta riesgos críticos: pérdida de enlace, colisiones imprevistas y exposición del operador al fuego enemigo por necesidad de contacto visual. La carencia de un sistema de comando y control seguro limitaba el despliegue del VAE a entornos estrictamente controlados y de corto alcance.

### 1.3. Justificación
El desarrollo del SCCpVA se justifica por la necesidad institucional de contar con una plataforma de experimentación en sistemas autónomos que sea segura, escalable y capaz de operar a través de redes IP militares existentes. El uso de simulación y visión artificial garantiza un margen de seguridad activo que protege tanto al personal como al equipamiento.

### 1.4. Objetivos
#### 1.4.1. Objetivo General
Diseñar e implementar un sistema de comando y control centralizado para vehículos autónomos que permita la operación remota segura y la navegación autónoma sobre infraestructuras de red IP.

#### 1.4.2. Objetivos Específicos
- Establecer una arquitectura cliente-servidor web segura con WebSockets en tiempo real.
- Desarrollar un "Digital Twin" 3D para la simulación y validación de misiones.
- Implementar un motor de navegación segmentado (Dijkstra + A* Híbrido).
- Integrar visión artificial para la parada automática de seguridad ante personas.

---

**CAPÍTULO 2**

## 2. Gestión del Proyecto

### 2.1. Metodología de Gestión
Se adoptó una metodología **Scrum (Agile)** adaptativa, estructurando el desarrollo en Sprints orientados a hitos funcionales: conectividad (RED), inteligencia (CEREBRO) e integración total (SCCpVA). Esta agilidad permitió ajustar lógicas de navegación basadas en pruebas de campo inmediatas en el simulador.

### 2.2. Gestión del Alcance
El proyecto abarca el software de comando, la lógica de navegación autónoma, la interfaz de operación 3D y la integración de IA. Queda fuera de alcance la fabricación física de antenas de largo alcance y la construcción mecánica de armamento pesado.

### 2.3. Cronograma y Hitos (2025)
- **Q1:** Infraestructura base, VPN y WebSockets.
- **Q2:** Desarrollo del Digital Twin y Editor de Entornos.
- **Q3:** Implementación de Hybrid A* y Navegación Segmentada.
- **Q4:** Integración de IA de seguridad, control de torreta y cierre de PPS.

---

**CAPÍTULO 3**

## 3. Análisis de la Situación y Requerimientos

### 3.1. Análisis de los Interesados (Stakeholders)
- **Dirección Estratégica:** TC OIM Marcelo Acuña. Define la visión táctica.
- **Tutoría Técnica:** CR (R) Ing. Gabriel Vicente López. Valida lógicas de control.
- **Academia:** CR (R) OIM Cesar Daniel Cicerchia. Estándares de ingeniería.

### 3.2. Requerimientos Funcionales (RF)
- **RF1: Autonomía segmentada:** Cálculo de rutas cinemáticamente posibles.
- **RF2: Seguridad Activa:** Detección de personas y parada automática mediante IA.
- **RF3: Telemetría:** Monitoreo en tiempo real de velocidad y posición.
- **RF4: Control de Cargas:** Manejo de torreta (Yaw/Pitch) y visión 1ra persona.

### 3.3. Requerimientos No Funcionales (RNF)
- **RNF1: Latencia:** Retardo crítico comando-actuador < 100ms.
- **RNF2: Seguridad:** Cifrado TLS/SSL y túneles VPN.
- **RNF3: Robustez:** Manejo de reconexión automática de enlaces perdidos.

---

**CAPÍTULO 4**

## 4. Aspectos Tecnológicos

### 4.1. Arquitectura del Sistema
Arquitectura distribuida en contenedores **Docker**:
- **Frontend:** React + Vite3 + Three.js para la representación espacial.
- **Backend:** Django Framework para gestión de misiones y usuarios.
- **Comunicaciones:** Protocolo WebSocket para baja latencia.

![Interfaz de Acceso inicial del sistema SCCpVA](/home/mauri/uni/PPS-VAE/DefensaPPS/login_inicial.png)

### 4.2. Tecnologías de Navegación e IA
- **Algoritmia:** Dijkstra para niveles macro y Hybrid A* para micro-navegación.
- **Seguridad:** TensorFlow.js con el modelo COCO-SSD ejecutándose en el navegador del operador para redundancia de procesamiento.

---

**CAPÍTULO 5**

## 5. Diseño del Sistema

### 5.1. Arquitectura de Alto Nivel
El sistema utiliza un bucle cerrado donde el simulador 3D refleja el estado del "Digital Twin".

```text
[Diagrama de Arquitectura - Ver versión Markdown para visualización]
graph TD
    subgraph "Interfaz (React)"
        HUD[HUD Telemetría]
        Joy[Control Manual]
    end
    subgraph "Motor de Navegación"
        TP[Macro-ruta Dijkstra]
        AF[Tramo Local A*]
    end
    Store[useStore.js] --> TP
    TP --> AF
    AF --> HUD
```

### 5.2. Diseño de Componentes
- **MapVisualizer:** Render de carreteras, edificios y vegetación 1:1.
- **Gimbal/Torreta:** Lógica de rotación independiente del chasis para conciencia situacional.
- **Seguridad Activa:** Lógica de interrupción de motor si la IA detecta amenaza en el área crítica (<2.3m).

#### 5.2.1. Interfaces de Usuario
El sistema provee interfaces adaptadas al rol operativo, garantizando una conciencia situacional óptima.

**Rol: Operador de Vehículo**
![Menú de roles resaltando Operador](/home/mauri/uni/PPS-VAE/DefensaPPS/menu_roles_operador.png)

**Rol: Apuntador del Arma**
![Menú de roles resaltando Apuntador](/home/mauri/uni/PPS-VAE/DefensaPPS/menu_roles_operador.png)

**Ambiente: Operador**
![Ambiente desde la perspectiva del operador](/home/mauri/uni/PPS-VAE/DefensaPPS/ambiente_operador.png)

**Ambiente: Apuntador**
![Ambiente desde la perspectiva del apuntador](/home/mauri/uni/PPS-VAE/DefensaPPS/ambiente_apuntador.png)

**Menú de Construcciones**
![Menú de objetos para la edición del mapa](/home/mauri/uni/PPS-VAE/DefensaPPS/menu_construcciones.png)

---

**CAPÍTULO 6**

## 6. Implementación, Pruebas y Demostración

### 6.1. Demostración Secuencial
La validación se realiza en fases lógicas:
1.  **Carga de Escenario:** Selección del entorno "B Ing Anf 121".

**Gestión de Escenarios**
![Interfaz de selección y guardado de escenarios](/home/mauri/uni/PPS-VAE/DefensaPPS/gestion_escenarios.png)

2.  **Edición:** Generación de ambientes dinámicos con el Menú de Construcciones.
3.  **Misión:** Creación de **Itinerarios** y grabación de rutas para patrullaje.

**Selección de Destinos**
![Lista de puntos de interés configurados](/home/mauri/uni/PPS-VAE/DefensaPPS/destinos_posibles.png)

**Creación de Itinerarios**
![Ejemplo de itinerario con múltiples paradas](/home/mauri/uni/PPS-VAE/DefensaPPS/itinerario_ejemplo.png)

4.  **Autonomía:** Ejecución de navegación de largo alcance con re-planificación.
5.  **Tuning:** Ajuste fino de umbrales de llegada, pesos de heurística y suavizado de cámara.

**Panel de Configuración Técnica**
![Ajustes de medidas y lógicas del vehículo](/home/mauri/uni/PPS-VAE/DefensaPPS/configuracion_vehiculo.png)

#### A. Umbrales y Planeador (A*)
![Configuración de umbrales de llegada](/home/mauri/uni/PPS-VAE/DefensaPPS/umbral_objetivos.png)
![Variables del planeador de ruta A*](/home/mauri/uni/PPS-VAE/DefensaPPS/config_planificador.png)

#### B. Piloto Automático y Cámara
![Configuración del comportamiento del piloto automático](/home/mauri/uni/PPS-VAE/DefensaPPS/config_piloto_automatico.png)

**Opciones de Visualización**
![Checkboxes de visualización](/home/mauri/uni/PPS-VAE/DefensaPPS/config_visualizacion.png)

**Configuración de Cámara**
![Sliders de suavizado de cámara](/home/mauri/uni/PPS-VAE/DefensaPPS/config_camara.png)

### 6.2. Resultados de Pruebas
- **Éxito en Ruta:** 90% de llegadas satisfactorias sin colisiones.
- **Freno de Seguridad:** Activación instantánea al detectar personas en el camino.
- **Telemetría:** Latencia estable por debajo de los umbrales de control táctico.

### 6.3. Fase de Control Táctico y Proyecciones
- **Operación de la Torreta:** Manejo independiente mediante el joystick virtual en modo Apuntador, permitiendo el barrido del horizonte sin afectar la navegación.
- **Simulador de Tiro:** Presentación de la funcionalidad de simulación de balística y tiro. 

Nota: El Simulador de Tiro está fuera del alcance central de este proyecto de navegación, pero ha sido desarrollado y presentado como un valor agregado para futuros proyectos de artillado.

---

**CAPÍTULO 7**

## 7. Cierre del Proyecto

### 7.1. Conclusiones
El SCCpVA ha transformado el VAE de un prototipo radial a un sistema de comando y control profesional. Se ha logrado la independencia geográfica del operador y se han establecido las bases para la autonomía militar funcional.

### 7.2. Recomendaciones
- Integrar sensores LIDAR físicos para complementar la visión artificial.
- Implementar estabilización inercial via hardware para la cámara de la torreta.
- Explorar lógicas de enjambre (swarming) multivehículo.

---

### BIBLIOGRAFÍA CONSULTADA
- **Sedgewick, R. (2011).** *Algoritmos*.
- **LaValle, S. M. (2006).** *Planning Algorithms*.
- **Russel & Norvig (2021).** *Artificial Intelligence*.
