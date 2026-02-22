# Defensa del Proyecto PPS-VAE
## Proyecto: Sistema de Comando y Control para Vehículos Autónomos (SCCpVA)

## 1. Introducción
El presente proyecto, denominado **SCCpVA** (Sistema de Comando y Control para Vehículos Autónomos), surge como una respuesta a la necesidad de evolución tecnológica dentro de la Facultad de Ingeniería del Ejército (FIE). Actualmente, la institución cuenta con un prototipo vehicular capaz de ser operado de forma remota a corta distancia; sin embargo, este esquema presenta limitaciones críticas: la dependencia de la línea de visión directa, la falta de una interfaz de telemetría visual robusta y la imposibilidad de operar en escenarios de larga distancia.

El **SCCpVA** se propone como una solución integral que trasciende el manejo radial básico para establecer un ecosistema de comando y control avanzado. Este proyecto representa la evolución y continuación directa del proyecto **VAE** (Vehículo Autónomo Eléctrico). Mientras que el VAE proporcionó una plataforma robusta con una estructura física completa y capacidades de transporte de material o personal, el SCCpVA dota a esta base de la inteligencia y conectividad necesarias para operaciones complejas.

Los pilares fundamentales de esta solución son:

1.  **Robustez en el Comando a Larga Distancia:** Implementación de una arquitectura cliente-servidor basada en tecnologías web modernas (React, Vite, Django) que permite el control y monitoreo del vehículo a través de redes IP, superando las limitaciones geográficas del control remoto tradicional. Actualmente operando mediante una VPN, el sistema permite la supervisión desde cualquier punto dentro de la red de la FIE, lugar donde reside el vehículo.
2.  **Entorno de Simulación Integrado:** Desarrollo de un simulador de alta fidelidad que funciona como un "entorno de prueba seguro". Este simulador es vital para el ciclo de desarrollo, ya que permite validar algoritmos de navegación y lógicas de seguridad sin poner en riesgo la integridad física del hardware real, ni de su entorno operativo.
3.  **Navegación Autónoma y Proyección Táctica:** Integración de algoritmos de trayectoria avanzada (como A* y Hybrid A*) y sistemas de visión artificial. Esto no solo facilita la autonomía, sino que sienta las bases para futuras capacidades operativas, como la posibilidad de artillar la plataforma para prestar apoyo de fuego en primera línea, garantizando un nivel nulo de exposición para el personal humano.

## Acronimo y nombre del proyecto
Sistema de comando y control para vehiculos autonomos - SCCpVA

## 2. Antecedentes y Contexto
El punto de partida de este desarrollo se sitúa en el proyecto **VAE** (Vehículo Autónomo Eléctrico), una plataforma plenamente funcional en su parte mecánica y estructural, pero cuya capacidad operativa estaba restringida a un manejo manual de corto alcance. Originalmente, el VAE se operaba mediante una red Wi-Fi local generada por el propio vehículo, lo que limitaba su radio de acción a aproximadamente 100 metros bajo una modalidad de visión directa. Un punto crítico de esta configuración inicial era la ausencia de protocolos de seguridad y autenticación: cualquier operador conectado a la red local podía tomar el mando de la unidad sin verificaciones previas, lo que representaba una vulnerabilidad significativa para el despliegue en escenarios reales.

Aunque el VAE ya demostraba su versatilidad para el transporte y logística, su potencial se veía limitado por la ausencia de una "conciencia situacional" remota (falta de cámaras y telemetría en tiempo real) y la dependencia de un operador físicamente cercano. La transición hacia el SCCpVA busca capitalizar la robustez física del VAE, transformándolo en un sistema autónomo capaz de operar en entornos hostiles o de difícil acceso, donde la seguridad del personal es la prioridad absoluta.

El desafío principal radicaba en la necesidad de un sistema que no solo permitiera la operación remota, sino que también gestionara la complejidad de la navegación autónoma. Para ello, era imperativo contar con una plataforma que permitiera testear algoritmos en un entorno controlado antes de su despliegue en el terreno, garantizando que el vehículo pueda interpretar su entorno y tomar decisiones de seguridad de manera proactiva.

## 3. Implementación Técnica
La arquitectura de SCCpVA ha sido diseñada bajo un modelo de **Sistemas Distribuidos**, permitiendo la separación clara entre la interfaz de operación, el procesamiento de datos y el control del hardware.

### 3.1. Stack Tecnológico
Para garantizar un rendimiento óptimo y una experiencia de usuario fluida, se seleccionaron las siguientes tecnologías:

*   **Frontend (Estación de Control):**
    *   **React + Vite:** Utilizados para construir una Single Page Application (SPA) reactiva. Vite proporciona un entorno de desarrollo ultra rápido y un empaquetado eficiente.
    *   **CSS Vanilla:** Implementación de un diseño moderno con "Rich Aesthetics", utilizando gradientes, micro-animaciones y un modo oscuro (Dark Mode) para reducir la fatiga visual del operador.
    *   **Hooks y Context API:** Para la gestión de estados complejos como la telemetría en tiempo real y los comandos de control.

*   **Backend (Servidor de Comando):**
    *   **Django (Python):** Actúa como el núcleo de procesamiento. Se encarga de la gestión de usuarios, almacenamiento de logs de misiones y la comunicación con los scripts de bajo nivel del vehículo.
    *   **Django Rest Framework (DRF):** Para exponer las APIs necesarias que el frontend consume para el envío de rutas y comandos.

*   **Infraestructura de Red:**
    *   **Conectividad VPN:** Para superar la barrera de los 100 metros del Wi-Fi original, el sistema se comunica a través de una Red Privada Virtual (VPN). Esto permite que cualquier terminal autorizada en la red de la FIE pueda comandar el vehículo de forma segura.

### 3.2. Arquitectura del Sistema y Flujo de Datos
La arquitectura se fundamenta en una jerarquía de control distribuido que garantiza latencia mínima y alta disponibilidad:

1.  **Unidad de Control Vehicular (Hardware de Bajo Nivel):**
    *   El control físico de los actuadores (dirección, tracción, frenado) está gestionado por un microcontrolador **ESP**, montado directamente en el chasis.
    *   Este dispositivo recibe instrucciones en formato **JSON** a través de una conexión de baja latencia mediante **WebSockets**.
    *   **Infraestructura Física:** Actualmente, la comunicación interna se realiza vía Wi-Fi, pero el sistema está preparado para una migración inminente a **Red Ethernet**. La placa de la ESP ya cuenta con la adaptación física necesaria (puerto RJ45 integrado) para garantizar una conexión inmune a interferencias electromagnéticas.


2.  **Computadora Central de Abordo (Cerebro Industrial):**
    *   El vehículo porta una **computadora industrial** que actúa como el nodo central de procesamiento.
    *   **Procesamiento de IA:** Todos los algoritmos de visión artificial y navegación autónoma corren localmente en este equipo para evitar la dependencia de la latencia de la red externa (VPN).
    *   **Redundancia y Contenedores:** El sistema de cámaras y visualización cuenta con una arquitectura de **redundancia**. Existe un servicio de respaldo que corre dentro de un contenedor **Docker** en la misma computadora central, asegurando que, ante el fallo de un servicio de visualización, el operador no pierda la conciencia situacional.

3.  **Sensor de Posicionamiento e Inercial (VectorNav):**
    *   Dispositivo externo de alta precisión que provee datos críticos a la computadora industrial.
    *   **Posicionamiento Multi-constelación:** Permite obtener la ubicación GPS bajo los sistemas norteamericano, europeo (Galileo) y ruso (GLONASS).
    *   **Datos de Aceleración:** Proporciona mediciones de aceleración en los tres ejes cartesianos.
    *   **Potencial de Sincronización:** Aunque su integración total es un objetivo a corto plazo, su uso permitirá emparejar los movimientos en el simulador con la vida real. Mediante la comparación entre la aceleración teórica enviada a la ESP y la aceleración real medida por el VectorNav, se podrán realizar las correcciones necesarias para una fidelidad absoluta en el modelado de movimientos.

4.  **Flujo de Telemetría e Intercambio de Comandos:**
    *   El **Cerebro Industrial** recolecta datos de sensores y el estado de la ESP.
    *   El **Servidor Django** (viviendo también en la red interna o localmente) sincroniza estos estados con la Estación de Control.
    *   La **Estación de Control (React)** permite al usuario interactuar con el sistema, enviando comandos que recorren el camino inverso hasta llegar a la ESP.

### 3.3. Navegación y Trazado de Rutas: Evolución y Desafíos
La inteligencia de navegación no fue un proceso lineal, sino una evolución basada en la resolución de problemas técnicos complejos y el ajuste fino de la conducta del vehículo:

1.  **Iteración Inicial (Hybrid A* Puro):** Se comenzó implementando Hybrid A*, pero el algoritmo evaluaba una cantidad masiva de nodos en todas direcciones sin una orientación clara. Esto resultaba en tiempos de procesamiento prohibitivos y una tasa de éxito muy baja para alcanzar destinos lejanos.
2.  **Uso de Heurísticas de Distancia:** Para corregir lo anterior, se introdujo una fuerte dependencia de la **distancia euclidiana**. Si bien esto hizo al algoritmo más "agresivo" hacia el objetivo, generó "trampas locales": cuando el camino real obligaba al vehículo a alejarse momentáneamente del destino para rodear un obstáculo o seguir una calle, el sistema se bloqueaba al no querer "retroceder" en su aproximación heurística.
3.  **Navegación Táctica (Guía Topológica/Dijkstra):** La solución final consistió en implementar un sistema de dos capas. Se utiliza un algoritmo de búsqueda (Dijkstra/A* de alto nivel) sobre un grafo de nodos grandes y dispersos. Este genera primero una "macro-ruta" imprecisa pero válida a través del mapa. Esta ruta sirve de guía para el algoritmo principal, permitiéndole alejarse del destino si la macro-ruta así lo indica, superando el problema de las trampas locales.
4.  **Balance de Pesos y Conducta Vehicular:** Se trabajó extensamente en la función de costo para evitar comportamientos "poco naturales":
    *   **Prioridad de Avance:** Se penalizó fuertemente la marcha atrás. Inicialmente, el algoritmo optaba por retroceder largas distancias si los pesos así lo sugerían, lo cual es inaceptable dado que la cámara de seguridad está frontalmente orientada.
    *   **Control de Cambios de Marcha:** Se incrementó el costo de transición entre Directa y Reversa para evitar oscilaciones constantes que desgastaran la transmisión.
    *   **Mitigación de Zigzag:** Se ajustaron los pesos de giro para favorecer trayectorias rectas y fluidas.
5.  **Suavizado de Trayectoria (Smoothing):** Para evitar que el vehículo circulara "cabeceando" (micro-correcciones constantes de dirección), se implementó un algoritmo de suavizado sobre la ruta final, garantizando una navegación estable y confortable.
6.  **Márgenes de Seguridad Adaptativos:** Se desarrolló una lógica para manejar situaciones donde el vehículo comienza en una posición "bloqueada" o muy cerca de un obstáculo. El sistema relaja dinámicamente los márgenes de colisión para encontrar un punto de escape válido, garantizando que el vehículo pueda iniciar su marcha incluso en entornos congestionados.
7.  **Control de Agresividad:** Se expuso un parámetro de "agresividad" ajustable por el operador. Esto permite sintonizar dinámicamente el peso de la heurística, permitiendo que el algoritmo sea más audaz en espacios abiertos o más cauteloso en zonas estrechas.

*   **Grabación y Reproducción de Recorridos (Path Recording):** El sistema permite al operador "enseñar" una ruta mediante la conducción manual. Esta trayectoria se almacena y puede ser reproducida de forma autónoma posteriormente. Una característica clave es la **integración algorítmica**: si el vehículo se encuentra en una posición distinta a la de inicio del recorrido guardado, el sistema calcula automáticamente una ruta para posicionarse en el punto de partida antes de iniciar la reproducción fiel del trayecto grabado.
*   **Navegación por Puntos de Interés (POI) e Itinerarios:** El sistema permite la gestión de destinos pre-cargados en el entorno (bases, depósitos, puntos de patrulla). El operador puede simplemente seleccionar un destino específico o encadenar una serie de ellos para fijar un itinerario completo, permitiendo que el SCCpVA gestione de forma autónoma los tránsitos entre cada punto.

### 3.4. Sistema de Seguridad y Detección
La seguridad es un componente transversal en el SCCpVA. Se implementó un sistema de visión artificial basado en modelos pre-entrenados para la detección de personas en tiempo real:

*   **Detección Constante:** El operador mantiene contacto visual con la cámara del vehículo mientras monitorea la telemetría.
*   **Parada Automática de Seguridad:** Si el sistema detecta una persona en la trayectoria inmediata, el vehículo detiene su marcha automáticamente y notifica al operador, quien debe decidir si tomar el control manual o reanudar la rutina autónoma tras verificar que el área está despejada.

### 3.5. Seguridad en Comunicaciones: Análisis de WebSockets
El uso de WebSockets para el control en tiempo real entre la CPU industrial y la ESP aporta una ventaja crítica en latencia, pero introduce desafíos de seguridad que han sido considerados y documentados:

#### Vulnerabilidades Potenciales:
1.  **Falta de Cifrado (WS vs WSS):** Si el canal de comunicación no está cifrado (ws://), la información (JSON de comandos) viaja en texto plano, siendo vulnerable a ataques de *Man-in-the-Middle* (MitM).
2.  **Secuestro de WebSocket (CSWSH):** Un atacante podría intentar abrir una conexión WebSocket desde un origen no autorizado si el servidor no valida correctamente las cabeceras `Origin`.
3.  **Inyección de Datos:** Dado que la ESP procesa objetos JSON, una entrada mal formada o maliciosa podría causar desbordamientos de memoria o comportamientos erráticos en el microcontrolador.

#### Mejoras e Implementaciones Previstas:
*   **Encapsulamiento en VPN:** Actualmente, la seguridad se delega a la capa de red (VPN). Al estar toda la comunicación dentro de un túnel cifrado, se mitiga el riesgo de interceptación externa.
*   **Migración a WSS (WebSocket Secure):** Se contempla la implementación de TLS/SSL para asegurar que incluso dentro de la red interna, el tráfico sea ilegible para terceros.
*   **Autenticación mediante Tokens (Handshake):** Implementar un sistema de intercambio de llaves (handshake) donde la ESP solo acepte conexiones que presenten un token válido generado por el servidor Django.
*   **Validación Estricta de Esquemas JSON:** Implementación de un parseo rígido en la ESP que descarte cualquier paquete que no cumpla exactamente con la estructura de control definida, previniendo inyecciones de datos.

### 3.6. Simulador y Editor de Entornos Personalizados
El SCCpVA incluye una potente herramienta de edición y simulación que permite materializar escenarios de prueba fieles a la realidad:

*   **Creación de Entornos Dinámicos:** El usuario puede diseñar el mapa desde cero, agregando caminos con **dimensiones programables**. Esto asegura que las distancias y anchos de calzada en el simulador sean fieles al entorno físico real donde operará el vehículo.
*   **Elementos de Ambientación y Orientación:** Para enriquecer la conciencia situacional y servir de referencia visual, el editor permite colocar edificios, árboles, sendas peatonales y plazas.

#### 3.6.1. Modelado Físico y Dinámico
Para que la simulación sea una herramienta de validación técnica y no solo visual, el entorno contempla las leyes físicas que rigen el movimiento del vehículo real:

1.  **Dimensiones y Geometría Fiel:** El simulador contempla las medidas exactas del chasis (ancho, largo y distancia entre ejes). Esto es fundamental para que el **Hybrid A*** calcule radios de giro que el vehículo sea realmente capaz de ejecutar sin colisionar.
2.  **Inercia y Masa:** Se modela la inercia del vehículo, asegurando que los cambios de velocidad y dirección respeten la física del transporte de carga o personal. Esto evita que el simulador genere movimientos instantáneos imposibles de replicar en la realidad.
3.  **Perfil de Velocidad Inteligente:** El simulador no aplica una velocidad constante; calcula un perfil dinámico donde la velocidad se reduce proporcionalmente a la curvatura de la ruta y se maximiza en tramos rectos, emulando la conducción segura de un operador humano o de un sistema autónomo avanzado.
4.  **Sincronización de Comandos:** Este modelado permite que las órdenes enviadas a la ESP en el ambiente virtual sean directamente aplicables al vehículo real, minimizando el error entre la trayectoria planeada y la ejecutada.

### 3.7. Capa de Autenticación y Gestión de Roles
Para robustecer la seguridad del ecosistema SCCpVA, se ha implementado un sistema de gestión de accesos que trasciende la seguridad a nivel de red (VPN):

*   **Interfaz de Inicio de Sesión (Login):** Se incorporó una vista de autenticación obligatoria antes de acceder a la estación de control. Esto asegura que solo personal autorizado pueda interactuar con el vehículo o el servidor de misiones, eliminando el riesgo de acceso indiscriminado que presentaba el proyecto original (VAE).
*   **Proyección de Roles y Permisos:** El backend está diseñado para soportar una estructura de **Control de Acceso Basado en Roles (RBAC)**. Esto es fundamental debido a la naturaleza modular y táctica del proyecto:
    *   **Diferenciación de Funcionalidades:** Se preve que distintos usuarios tengan acceso a capacidades específicas. Por ejemplo, un "Operador de Conducción" podría gestionar la navegación, mientras que un "Operador de Sistemas" tendría el control sobre cargas útiles sensibles.
    *   **Proyección de Nuevas Capacidades:** Esta capa de seguridad es el cimiento necesario para la implementación de funcionalidades avanzadas, como el manejo de **dispositivos de armas de fuego** o **cámaras direccionales (PTZ)** con capacidad de puntería, cuya operación requiere una trazabilidad y autorización rigurosa por parte del sistema.

## 4. Resultados y Pruebas
La fase de validación del SCCpVA se centró en garantizar la fiabilidad del sistema bajo condiciones de estrés y la efectividad de los protocolos de seguridad.

### 4.1. Validación del Sistema de Seguridad
Uno de los hitos más significativos fue la comprobación del **frenado automático por detección de personas**. Durante las pruebas:
*   Se verificó que el modelo de visión artificial identifica sujetos con un alto grado de confianza.
*   Al detectarse una persona en la trayectoria, el sistema interrumpe inmediatamente el flujo de comandos a la ESP, forzando la detención del vehículo.
*   El operador recibe una notificación visual instatánea, permitiendo la toma de decisiones (manual vs. autónomo) para reanudar la operación de forma segura.

### 4.2. Pruebas de Estrés y Navegación
Para validar la robustez de los algoritmos de trazado de rutas (A*/Topológico), se implementó una funcionalidad de **generación de rutas aleatorias**.
*   **Testeo Masivo:** Esta opción permite al sistema calcular y proponer múltiples trayectorias al azar dentro del entorno configurado. 
*   **Propósito:** El objetivo es someter al planificador a una variedad infinita de obstáculos y geometrías, detectando posibles "esquinas" donde el algoritmo pudiese fallar antes de realizar una prueba con el hardware real.
*   **Consistencia:** Se comprobó que el sistema mantiene la coherencia táctica (respetando caminos y límites de velocidad) incluso en las rutas generadas aleatoriamente.

### 4.3. Telemetría y Visualización
La interfaz de control permite monitorear en tiempo real:
*   La posición exacta sobre el mapa (integración GPS/VectorNav).
*   El estado de los actuadores del vehículo.
*   El trazado previsto frente al recorrido real realizado, permitiendo auditar la precisión de la navegación.

## 5. Desafíos y Lecciones Aprendidas
El desarrollo del SCCpVA fue un proceso de aprendizaje intensivo que obligó a trascender los límites de la especialidad informática para abordar problemas complejos de ingeniería integral.

### 5.1. El Desafío de la Interdisciplinariedad (Árbol de Incumbencias)
Una de las lecciones más valiosas fue la gestión de las fronteras entre lo informático, lo electrónico y lo mecánico. 
*   **Aislamiento de Problemas:** Inicialmente, se intentó resolver la detección de obstáculos mediante sensores físicos (Lidar) sin tener plenamente dominada la tecnología, lo que generó cuellos de botella. La lección aprendida fue la importancia de utilizar simuladores con obstáculos precargados para avanzar en la lógica de navegación (software) mientras se resolvían los problemas de hardware por separado.
*   **Modularidad y Metas Intermedias:** La dificultad de trabajar con equipos físicos que no respondían según lo previsto (como las limitaciones del Lidar o la potencia de la Jetson inicial) subrayó la necesidad de una arquitectura modular. Comprender que el proyecto debía avanzar mediante hitos intermedios y no como un único bloque indivisible permitió salvar meses de trabajo que, de otro modo, se habrían perdido.

### 5.2. Integración Tecnológica, Redes y Seguridad Web
La consolidación de un "sistema de sistemas" presentó desafíos técnicos significativos:
*   **Evolución del Hardware:** La necesidad de mayores capacidades de cómputo y memoria obligó a la transición de una unidad **Nvidia Jetson** a una **Computadora Industrial**, capaz de gestionar la telemetría, la IA y los WebSockets simultáneamente.
*   **Infraestructura de Red:** Se gestionó la convivencia de múltiples interfaces: redes Wi-Fi paralelas para comunicación de corto alcance y una red **Ethernet** robusta mediante la implementación de un switch. La transición de solicitudes HTTP tradicionales a **WebSockets** fue vital para lograr la respuesta en tiempo real que el control del vehículo exige.
*   **Seguridad y Conectividad:** La implementación de la VPN para permitir el control a larga distancia y el estudio de nuevas placas de red (pasando de sistemas con fuentes separadas a integraciones "todo en uno") permitieron estabilizar la infraestructura.

#### 5.2.1. Despliegue con Dominio Público e Infraestructura HTTPS
Uno de los hitos técnicos significativos fue la transición desde direcciones técnicas internas (IPs y puertos como `:8000` o `:5173`) hacia una identidad de dominio corporativa plenamente asegurada. Esta evolución se materializó en varias etapas:

*   **Registro de Dominio y DNS (Cloudflare):** Se configuró el subdominio `comandovae.misitiowebpersonal.com.ar` a través de la plataforma **Cloudflare**, que actúa como servicio de gestión DNS. Cloudflare proporciona además capas adicionales de protección contra ataques DDoS y optimización de tráfico.

*   **Certificados SSL/TLS con Let's Encrypt:** Para garantizar la confidencialidad e integridad de todas las comunicaciones entre la estación de control del operador y el servidor del vehículo, se implementó un certificado **SSL/TLS** emitido por **Let's Encrypt**, una Autoridad de Certificación (CA) reconocida globalmente. La obtención del certificado se realizó mediante la herramienta **Certbot**, utilizando el método de validación **DNS-01** a través del plugin de Cloudflare. Este método verifica la propiedad del dominio creando un registro DNS temporal, sin necesidad de exponer puertos adicionales al exterior. El certificado se renueva automáticamente, asegurando una operación continua sin intervención manual.

*   **Proxy Inverso con Nginx (Arquitectura de Seguridad):** Se implementó **Nginx** como proxy inverso, actuando como punto único de entrada al sistema. Su configuración contempla:
    *   **Redirección HTTP → HTTPS:** Todo el tráfico HTTP (puerto 80) se redirige automáticamente al canal cifrado HTTPS (puerto 443), asegurando que ninguna comunicación viaje en texto plano.
    *   **Terminación SSL:** Nginx gestiona la negociación TLS con protocolos modernos (TLSv1.2 y TLSv1.3), descargando al backend de esta responsabilidad.
    *   **Enrutamiento Inteligente:** Nginx discrimina el tráfico y lo distribuye entre el backend Django (autenticación y APIs) y el frontend React/Vite (estación de control), de forma transparente para el usuario.

*   **Protección contra Ataques Web (CORS y CSRF):**
    *   **CORS (Cross-Origin Resource Sharing):** Se configuró una lista blanca de orígenes permitidos en Django, restringiendo qué dominios pueden realizar solicitudes al servidor. Esto previene que sitios web maliciosos intenten ejecutar acciones no autorizadas en nombre del operador.
    *   **CSRF (Cross-Site Request Forgery):** Se implementó la validación de tokens CSRF con una lista de orígenes confiables, protegiendo los formularios de autenticación y las operaciones POST contra ataques de falsificación de solicitudes.

*   **Resultado:** El sistema quedó accesible de forma segura en `https://comandovae.misitiowebpersonal.com.ar`, con un certificado válido emitido por Let's Encrypt (vigencia de 90 días con renovación automática), cifrado de extremo a extremo y protección contra las principales vulnerabilidades web (OWASP Top 10).

![Certificado SSL válido emitido por Let's Encrypt para el dominio comandovae.misitiowebpersonal.com.ar](DefensaPPS/certificado_ssl_letsencrypt.png)

### 5.3. Modelado Físico en el Simulador
El simulador no es solo una interfaz visual, sino un motor de física cinemática que materializa las leyes del movimiento.
*   **Implementación en React:** Se utilizó un motor de física integrado en el estado de React, donde cada "frame" de la simulación calcula la nueva posición basándose en vectores de fuerza y resistencia.
*   **Fundamentos Matemáticos:** Se aplicaron fórmulas de **cinemática de cuerpo rígido**, considerando:
    *   **Fuerza de Tracción ($F=m \cdot a$):** Determinando cómo el par motor vence la inercia.
    *   **Inercia y Masa:** Para simular la resistencia al cambio de movimiento, vital para representar un vehículo pesado.
    *   **Resistencia al Avance y Giro:** Fricción simulada que afecta la velocidad de respuesta de los actuadores.
*   **Sincronización:** Estas fórmulas permiten que el comportamiento del vehículo virtual sea un espejo del real, facilitando que las correcciones en el código tengan efectos predecibles en el hardware.

### 5.4. Monitoreo y Visión Artificial Constante
Un desafío operativo crítico fue mantener la detección de personas activa sin sacrificar la visibilidad de la telemetría.
*   **Evolución del PIP (Picture-in-Picture):** Tras intentar ejecuciones en segundo plano que resultaron ineficientes, se optó por integrar una pantalla de visualización constante en todas las vistas del sistema. Esto permite que el operador nunca pierda el contacto visual con la cámara y que los algoritmos de IA corran en tiempo real de forma ininterrumpida, garantizando la seguridad en todo momento.

## 6. Glosario de Términos
Para facilitar la comprensión del documento, se definen a continuación los términos técnica y siglas utilizadas:

*   **SCCpVA:** Sistema de Comando y Control para Vehículos Autónomos. Es el nombre del ecosistema de software desarrollado en este proyecto.
*   **VAE:** Vehículo Autónomo Eléctrico. Proyecto previo que proporcionó la plataforma física (hardware/chasis) sobre la cual se monta el SCCpVA.
*   **PIP (Picture-in-Picture):** "Imagen sobre imagen". Técnica de visualización donde una ventana pequeña (en este caso, la cámara con detección de personas) se superpone a la interfaz principal (telemetría) de forma constante.
*   **WebSocket:** Protocolo de comunicación que permite un canal de datos bidireccional y en tiempo real entre el servidor y el vehículo, con una latencia mucho menor que las solicitudes web tradicionales (HTTP).
*   **ESP:** Microcontrolador de bajo costo y consumo utilizado para el control físico de los actuadores del vehículo (motores y dirección).
*   **VectorNav:** Sensor de alta precisión que combina GPS (posicionamiento) e IMU (aceleración y orientación) para dar datos exactos del estado físico del vehículo.
*   **GLONASS / Galileo:** Sistemas de posicionamiento satelital de Rusia y Europa, respectivamente, que funcionan junto al GPS norteamericano para dar mayor precisión.
*   **RBAC (Control de Acceso Basado en Roles):** Sistema de seguridad que otorga permisos específicos a los usuarios según su función (conducción, armamento, supervisión).
*   **Nginx:** Servidor web de alto rendimiento utilizado en este proyecto como **Proxy Inverso** para unificar el acceso al backend y frontend bajo un único dominio, gestionar la terminación SSL/TLS y redirigir tráfico HTTP a HTTPS.
*   **SSL/TLS (Secure Sockets Layer / Transport Layer Security):** Protocolos criptográficos que proporcionan comunicaciones seguras sobre una red, cifrando los datos en tránsito entre el navegador del operador y el servidor.
*   **Let's Encrypt:** Autoridad de Certificación (CA) gratuita y automatizada que emite certificados SSL/TLS reconocidos por todos los navegadores web modernos.
*   **Certbot:** Herramienta de software de código abierto que automatiza la obtención y renovación de certificados SSL/TLS de Let's Encrypt.
*   **Cloudflare:** Plataforma de servicios de red que ofrece gestión DNS, protección contra ataques DDoS y optimización de tráfico web. En este proyecto se utilizó para la validación DNS-01 de certificados SSL.
*   **CORS (Cross-Origin Resource Sharing):** Mecanismo de seguridad del navegador que controla qué dominios pueden realizar solicitudes a un servidor, previniendo accesos no autorizados desde sitios web externos.
*   **CSRF (Cross-Site Request Forgery):** Tipo de ataque web donde un sitio malicioso intenta ejecutar acciones en nombre de un usuario autenticado. Se previene mediante tokens de validación en formularios y solicitudes POST.
*   **A* / Hybrid A*:** Algoritmos de búsqueda de caminos. El "Hybrid" añade la capacidad de tener en cuenta que el auto no puede girar sobre su propio eje, calculando rutas físicamente posibles para un vehículo.
*   **Dijkstra:** Algoritmo matemático clásico para encontrar la ruta más corta en una red de nodos o puntos de conexión.
*   **Heurística:** Una "regla de oro" o estimación que ayuda a los algoritmos a decidir qué camino probar primero para llegar más rápido al destino.
*   **VPN (Red Privada Virtual):** Túnel de comunicación cifrado que permite conectar computadoras distantes como si estuvieran en la misma red local de forma segura.
*   **Docker:** Tecnología que permite "empaquetar" una aplicación y sus dependencias para que corra siempre de la misma forma, independientemente de la computadora donde se instale.
*   **Jetson:** Plataforma de cómputo de Nvidia diseñada para ejecutar inteligencia artificial en sistemas móviles o robóticos.

## 7. Posibles Aplicaciones y Casos de Uso
La versatilidad del SCCpVA y su arquitectura modular permiten que el sistema sea desplegado en una amplia gama de escenarios, tanto en el ámbito de la Defensa como en el sector civil.

### 7.1. Ámbito Militar y Táctico
El sistema está diseñado para actuar como un multiplicador de fuerzas, priorizando siempre la preservación de la vida humana al delegar tareas de alto riesgo a la plataforma autónoma.

*   **Logística y Abastecimiento en Combate (Contexto Ucrania):** 
    En los conflictos modernos, como se observa actualmente en la guerra de Ucrania, el uso de sistemas autónomos terrestres (UGVs) ha revolucionado la logística. El SCCpVA permite la automatización de rutas de suministro para transporte de munición, raciones o repuestos hacia la primera línea. Al no requerir un conductor físico, se elimina el riesgo de bajas en "pasillos de fuego" o zonas bajo observación constante de drones enemigos, permitiendo un flujo logístico constante y silencioso.
*   **Evacuación de Heridos (MEDEVAC):**
    Una de las aplicaciones más críticas es la extracción de personal herido desde la zona de contacto hacia la retaguardia. El vehículo puede ser enviado de forma autónoma a un punto de recogida y regresar a una zona segura, permitiendo que el personal médico o los camilleros no tengan que exponerse bajo fuego directo.
*   **Apoyo de Fuego y Artillado:**
    La robustez del chasis y la precisión de la telemetría permiten la integración de estaciones de armas remotas. El sistema puede actuar como una plataforma de apoyo de fuego móvil, permitiendo a los operadores suprimir blancos desde un puesto de comando protegido.
*   **Desminado y Limpieza de Campos:**
    La capacidad de operar en zonas de alta peligrosidad hace del SCCpVA una plataforma ideal para la detección y neutralización de minas terrestres o artefactos explosivos improvisados (IEDs), evitando que personal especializado deba ingresar a pie en terrenos minados.
*   **Exploración y Reconocimiento de Zonas Peligrosas:**
    En entornos urbanos saturados o áreas con posible contaminación (RBC), el vehículo puede realizar patrullas de reconocimiento, enviando telemetría y video en tiempo real sin arriesgar tripulaciones.
*   **Patrullaje y Vigilancia Autónoma:**
    Utilizando la lógica de itinerarios y POIs, el sistema puede realizar patrullas perimetrales constantes. Esto libera a los centinelas de tareas rutinarias y reduce su fatiga, permitiendo que el personal humano se concentre en la toma de decisiones estratégicas desde el centro de control.

### 7.2. Ámbito Civil, Comercial e Industrial
La tecnología de navegación y el simulador de entornos ofrecen soluciones escalables para sectores no militares:

*   **Aplicaciones Agrícolas y Ganaderas:** 
    Automatización de tareas de monitoreo de cultivos, distribución de insumos o vigilancia de ganado en extensiones de tierra de gran escala donde el patrullaje humano es ineficiente.
*   **Logística Industrial:** 
    Transporte de materiales en grandes predios industriales, fábricas o depósitos, donde la precisión del Hybrid A* asegura un tránsito seguro entre estructuras y personal.
*   **Exploración en Desastres Naturales:** 
    Uso en zonas de catástroffe (derrumbes, incendios o fugas químicas) para localizar víctimas o auditar daños sin comprometer a los equipos de rescate iniciales.
*   **Simulador para Análisis de Equipos:** 
    La plataforma sirve como un entorno de testeo virtual para el desarrollo de nuevos softwares de navegación o la evaluación de hardware complementario antes de su adquisición o despliegue físico.

## 8. Conclusión
El proyecto **SCCpVA** ha logrado transformar con éxito una plataforma física preexistente (VAE) en un sistema avanzado de comando y control con proyecciones tácticas e industriales reales. A lo largo del desarrollo, se cumplieron los objetivos fundamentales de superar la dependencia del corto alcance mediante una arquitectura basada en redes IP y protocolos de tiempo real (WebSockets), garantizando un despliegue seguro a través de túneles VPN.

La implementación de un simulador de alta fidelidad no solo aceleró el ciclo de desarrollo, sino que demostró ser una herramienta esencial para la validación de algoritmos de navegación como el **Hybrid A*** y el sistema de **vision artificial** para la seguridad de terceros. Las lecciones aprendidas subrayan que la robótica autónoma es una disciplina eminentemente interdisciplinaria, donde el éxito depende de la armonía entre el software, la electrónica y el modelado físico.

Hacia el futuro, el SCCpVA queda posicionado como una infraestructura base escalable. Su arquitectura de roles y seguridad permite la integración inminente de sistemas de apoyo de fuego, transporte autónomo de carga o evacuación médica, alineándose con las tendencias globales en el uso de vehículos no tripulados para la preservación de vidas humanas en entornos hostiles.

---
*Nota: Este documento ha sido estructurado para servir como guía técnica y operativa durante la defensa del proyecto.*


