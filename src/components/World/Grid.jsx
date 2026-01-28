import React from "react";
import { useStore } from "../../store/useStore";

export function Grid() {
    const ancho_mapa = useStore((state) => state.ancho_mapa);
    const cantidad_celdas = useStore((state) => state.cantidad_celdas);

    return (
        <gridHelper args={[ancho_mapa, cantidad_celdas, 0x444444, 0x222222]} />
    );
}
