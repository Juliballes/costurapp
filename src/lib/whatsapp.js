import { prepararMensaje } from "./workshop.js";
import { normalizarTelefono } from "./phone.js";

export const mensajeRetiro = prepararMensaje;

export function enlaceWhatsapp(pedido, config) {
    const numero = normalizarTelefono(pedido?.clientes?.telefono);
    return numero
        ? `https://wa.me/${numero}?text=${encodeURIComponent(mensajeRetiro(pedido?.clientes?.nombre, config))}`
        : null;
}
