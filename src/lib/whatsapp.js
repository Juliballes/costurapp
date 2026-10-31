import { prepararMensaje } from "./workshop.js";
import { normalizarTelefono } from "./phone.js";

export const mensajeRetiro = prepararMensaje;

export function enlaceWhatsapp(pedido, config, textoEditado) {
    const numero = normalizarTelefono(pedido?.clientes?.telefono);
    const texto = textoEditado ?? mensajeRetiro(pedido?.clientes?.nombre, config);
    return numero && texto.trim()
        ? `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`
        : null;
}
