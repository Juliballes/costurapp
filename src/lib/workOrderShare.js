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

// WhatsApp no acepta adjuntos en los enlaces de chat. En móvil se comparte el archivo
// mediante el sistema; en otros navegadores se descarga la imagen y se abre el chat.
export async function compartirImagenBoleta(
    { blob, nombre, mensaje, enlace },
    entorno = {},
) {
    const navegador = entorno.navigator ?? navigator;
    const crearArchivo =
        entorno.crearArchivo ??
        ((datos, nombre, opciones) => new File(datos, nombre, opciones));
    const archivo = crearArchivo([blob], nombre, { type: "image/png" });
    let admiteArchivos = false;
    try {
        admiteArchivos = Boolean(
            navegador.share && navegador.canShare?.({ files: [archivo] }),
        );
    } catch {
        /* Usar descarga si el navegador rechaza la consulta de capacidad. */
    }
    if (admiteArchivos) {
        await navegador.share({
            files: [archivo],
            title: "Orden de trabajo · Mhome",
            text: mensaje,
        });
        return "compartido";
    }
    const descargar = entorno.descargar ?? descargarImagenBoleta;
    const abrir =
        entorno.abrir ??
        ((url) => window.open(url, "_blank", "noopener,noreferrer"));
    descargar(blob, nombre);
    abrir(enlace);
    return "descargado";
}
