import { prepararMensaje } from "./workshop.js";
import { normalizarTelefono } from "./phone.js";

export const mensajeRetiro = prepararMensaje;

export function enlaceWhatsapp(
    pedido,
    config,
    textoEditado,
    navegador = globalThis.navigator,
) {
    const numero = normalizarTelefono(pedido?.clientes?.telefono);
    const texto = textoEditado ?? mensajeRetiro(pedido?.clientes?.nombre, config);
    const agente = navegador?.userAgent ?? "";
    const esMovil = /Android|iPhone|iPad|iPod|Mobile/i.test(agente) ||
        (/Macintosh/i.test(agente) && navegador?.maxTouchPoints > 1);
    const base = esMovil
        ? "https://api.whatsapp.com/send"
        : "https://web.whatsapp.com/send";
    return numero && texto.trim()
        ? `${base}?phone=${numero}&text=${encodeURIComponent(texto)}`
        : null;
}
