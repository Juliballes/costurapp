export function descargarImagenBoleta(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Abrir siempre el chat del teléfono cargado. Web Share no permite elegir el
// destinatario y obliga a buscarlo manualmente. El PNG se descarga para adjuntarlo.
export async function compartirImagenBoleta(
    { blob, nombre, enlace },
    entorno = {},
) {
    if (!enlace) throw new Error("El cliente no tiene un teléfono válido.");
    const descargar = entorno.descargar ?? descargarImagenBoleta;
    const abrir =
        entorno.abrir ??
        ((url) => window.open(url, "_blank", "noopener,noreferrer"));
    // Abrir durante el clic, antes de la descarga, para conservar la activación
    // del usuario que requieren los navegadores para permitir una pestaña nueva.
    abrir(enlace);
    descargar(blob, nombre);
    return "descargado";
}
