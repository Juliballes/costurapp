import { normalizarTelefono } from "./phone.js";
import { normalizarInstagram } from "./workOrder.js";

export const configuracionInicial = Object.freeze({
    taller: "Mhome",
    remitente: "Mariana",
    telefono: "+54 9 11 5954-5739",
    instagram: "mhome.larra",
    plantilla:
        "Hola {nombre}, soy {remitente} de {taller}\n\nTu prenda ya está lista para retirar.\n\n¡Muchas gracias!",
});

export function validarConfiguracion(config) {
    if (!config || typeof config !== "object")
        return { plantilla: "Revisá la configuración." };
    const errores = {};
    if (!config.taller?.trim())
        errores.taller = "Ingresá el nombre del taller.";
    if (!config.remitente?.trim())
        errores.remitente = "Ingresá el nombre de quien saluda.";
    if (!config.plantilla?.trim())
        errores.plantilla = "Escribí el mensaje de retiro.";
    else if (!config.plantilla.includes("{nombre}"))
        errores.plantilla = "Incluí {nombre} para saludar a cada cliente.";
    else if (
        /\{(?!nombre\}|remitente\}|taller\})[^}]*\}/.test(config.plantilla)
    )
        errores.plantilla =
            "Usá solamente {nombre}, {remitente} y {taller} como campos automáticos.";
    if (config.telefono?.trim() && !normalizarTelefono(config.telefono))
        errores.telefono = "Ingresá un teléfono válido con código de área.";
    if (normalizarInstagram(config.instagram) === null)
        errores.instagram =
            "Ingresá un usuario válido de Instagram, por ejemplo mhome.larra.";
    return errores;
}

export function quitarEmojis(texto) {
    return texto
        .replace(
            /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\uFE0F|\u200D|\u20E3|\uFFFD/gu,
            "",
        )
        .replace(/([!?])[ \t]+\./g, "$1")
        .replace(/[ \t]+$/gm, "")
        .trim();
}

export function prepararMensaje(nombre, config = configuracionInicial) {
    const valores = {
        nombre: nombre?.trim() || "cliente",
        remitente: config.remitente,
        taller: config.taller,
    };
    return quitarEmojis(
        config.plantilla.replace(
            /\{(nombre|remitente|taller)\}/g,
            (_, campo) => valores[campo],
        ),
    );
}
