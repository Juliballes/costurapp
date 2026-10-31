import { useSyncExternalStore } from "react";
import {
    configuracionInicial,
    validarConfiguracion,
    quitarEmojis,
} from "../lib/workshop";

const clave = "costurapp.configuracion.v1";
let ultimoTexto;
let ultimaConfiguracion = configuracionInicial;

function leer() {
    try {
        const texto = window.localStorage.getItem(clave);
        if (texto !== ultimoTexto) {
            ultimoTexto = texto;
            const valor = texto ? JSON.parse(texto) : configuracionInicial;
            ultimaConfiguracion = Object.keys(validarConfiguracion(valor))
                .length
                ? configuracionInicial
                : { ...valor, plantilla: quitarEmojis(valor.plantilla) };
        }
    } catch {
        ultimaConfiguracion = configuracionInicial;
    }
    return ultimaConfiguracion;
}

function suscribir(callback) {
    window.addEventListener("storage", callback);
    window.addEventListener("costurapp:configuracion", callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("costurapp:configuracion", callback);
    };
}

export function useWorkshopSettings() {
    return useSyncExternalStore(suscribir, leer, () => configuracionInicial);
}

export function guardarConfiguracion(config) {
    const valor = {
        taller: config.taller.trim(),
        remitente: config.remitente.trim(),
        plantilla: quitarEmojis(config.plantilla),
    };
    if (Object.keys(validarConfiguracion(valor)).length)
        throw new Error("Revisá los campos de configuración.");
    window.localStorage.setItem(clave, JSON.stringify(valor));
    window.dispatchEvent(new Event("costurapp:configuracion"));
    return valor;
}
