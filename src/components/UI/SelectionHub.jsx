import React from "react";
import "./styles/SelectionHub.css";

const BASE = import.meta.env.BASE_URL;

export function SelectionHub({ onSelect }) {
    return (
        <div className="selection-hub">
            <h1 className="hub-title">SCCpVA</h1>
            <p className="hub-subtitle">Seleccione estación de operación</p>

            <div className="hub-cards">
                {/* Tarjeta Vehículo */}
                <div className="hub-card vehicle" onClick={() => onSelect("vehicle")}>
                    <img
                        className="hub-card-image"
                        src={`${BASE}images/vehiculo_hub.png`}
                        alt="Vehículo"
                    />
                    <span className="hub-card-label">Conducción</span>
                    <span className="hub-card-desc">Control del vehículo</span>
                </div>

                {/* Tarjeta Torreta */}
                <div className="hub-card turret" onClick={() => onSelect("turret")}>
                    <img
                        className="hub-card-image"
                        src={`${BASE}images/torreta_hub.png`}
                        alt="Torreta"
                    />
                    <span className="hub-card-label">Armamento</span>
                    <span className="hub-card-desc">Control de torreta</span>
                </div>
            </div>

            <div className="hub-footer">Sistema de Comando y Control para Vehículos Autónomos</div>
        </div>
    );
}
