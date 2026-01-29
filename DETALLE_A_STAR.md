# Detalle del Algoritmo A* (Hybrid A*)

Este documento describe la lógica implementada en `src/utils/pathfinding.js` para la navegación autónoma del vehículo.

## Resumen
Utilizamos una variante del algoritmo **A* (A-Star)** conocida como **Hybrid A***. A diferencia del A* tradicional que funciona en una cuadrícula simple (moverse de celda a celda), el Hybrid A* tiene en cuenta la **cinemática del vehículo** (su capacidad de giro y orientación).

## Componentes Principales

### 1. El Nodo (`Node`)
Cada paso en la búsqueda se representa como un nodo que contiene:
-   `x`, `z`: Posición en el mundo.
-   `theta`: Orientación (ángulo) del vehículo.
-   `g`: Costo acumulado desde el inicio hasta este punto.
-   `f`: Costo total estimado (`g` + heurística).
-   `steer`: Ángulo del volante utilizado para llegar aquí.
-   `direction`: Dirección de marcha (1 = Drive, -1 = Reversa).

### 2. Generación de Sucesores
En lugar de moverse a las 8 celdas vecinas, calculamos físicamente dónde terminaría el auto si aplicamos diferentes ángulos de volante durante un corto periodo (`SEGMENT_LENGTH`).
-   Probamos 5 ángulos de volante: Izquierda Máxima, Izquierda Media, Recto, Derecha Media, Derecha Máxima.
-   Probamos 2 direcciones: Hacia adelante y Reversa.
-   Calculamos la nueva posición usando un **Modelo de Bicicleta** simple.

### 3. Función de Costo (`g`)
El costo de moverse de un nodo a otro no es solo la distancia. Penalizamos comportamientos indeseados para obtener un manejo suave:
-   **Distancia**: Costo base por moverse.
-   **Reversa**: Penalización MUY ALTA (`20.0`) para evitar ir marcha atrás a menos que sea la única opción.
-   **Cambio de Marcha**: Penalización (`5.0`) por cambiar de Drive a Reverse o viceversa (evita maniobras de "adelante-atrás" innecesarias).
-   **Giro**: Penalización leve por girar el volante (prefiere ir recto).
-   **Cambio de Volante (Zig-Zag)**: Penalización (`5.0`) por cambiar la dirección del volante bruscamente entre pasos consecutivos. Esto suaviza la trayectoria.

### 4. Heurística (`h`)
La heurística estima cuánto falta para llegar a la meta. Usamos:
-   **Distancia Euclidiana**: Línea recta a la meta.
-   **Penalización de Alineación**: Un costo adicional si el auto no está apuntando hacia la meta.
    -   *Nota*: Hemos reducido este peso (`0.5`) para permitir que el auto se aleje momentáneamente de la meta si necesita espacio para maniobrar (ej. dar la vuelta).

### 5. Detección de Colisiones
Para cada paso propuesto:
-   Calculamos la posición de las 4 esquinas del vehículo (caja delimitadora).
-   Verificamos si alguna esquina cae en una celda ocupada o fuera del camino.
-   **Punto Medio**: También verificamos el punto medio del trayecto para asegurar que el auto no "salte" esquinas o atraviese obstáculos delgados.

## Configuración Actual
-   **Resolución de Ángulo**: 7.5 grados (`Math.PI / 24`). Permite giros finos y precisos.
-   **Longitud de Paso**: 1.0 metro. Pasos cortos para mayor resolución.
-   **Iteraciones Máximas**: 25,000. Necesario debido a la alta resolución (muchos pasos pequeños).

---
*Generado automáticamente por Antigravity*
