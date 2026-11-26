import { resumenPago, subtotalPrenda } from "./orderTotals.js";

export function normalizarInstagram(valor = "") {
    let usuario = String(valor ?? "").trim();
    if (/^https?:\/\//i.test(usuario)) {
        try {
            const url = new URL(usuario);
            if (!["instagram.com", "www.instagram.com"].includes(url.hostname))
                return null;
            usuario = url.pathname.replace(/^\/+|\/+$/g, "");
        } catch {
            return null;
        }
    }
    usuario = usuario.replace(/^@/, "");
    return !usuario || /^[a-zA-Z0-9._]{1,30}$/.test(usuario) ? usuario : null;
}

export function fechaBoleta(fecha) {
    if (!fecha) return "Sin fecha";
    const texto = String(fecha).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return "Sin fecha";
    return texto.split("-").reverse().join("/");
}

export function crearBoleta(pedido) {
    if (!pedido?.id)
        throw new Error("Primero guardá el pedido para generar su boleta.");
    const pago = resumenPago(pedido);
    const prendas = pedido.pedido_prendas?.length
        ? pedido.pedido_prendas
        : [
              {
                  tipo_prenda: pedido.tipo_prenda || "Trabajo",
                  cantidad: 1,
                  precio: pago.total,
                  descripcion: pedido.descripcion || "",
              },
          ];
    return {
        nombre: pedido.clientes?.nombre || "Sin cliente",
        telefono: pedido.clientes?.telefono || "Sin teléfono",
        direccion: pedido.clientes?.direccion || "",
        observaciones: pedido.notas || "",
        entrega: fechaBoleta(pedido.fecha_entrega),
        filas: prendas.map((p) => ({
            cantidad: Number(p.cantidad ?? 1),
            descripcion: [p.tipo_prenda || "Trabajo", p.descripcion]
                .filter(Boolean)
                .join(" · "),
            precio: Number(p.precio || 0),
            subtotal: subtotalPrenda(p),
        })),
        ...pago,
    };
}

export function nombreArchivoBoleta(nombre, fecha = new Date()) {
    const seguro =
        String(nombre || "cliente")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60) || "cliente";
    const dia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    return `orden-de-trabajo-${seguro}-${dia}.png`;
}
export function mensajeBoleta(nombre, config) {
    return `Hola ${nombre || "cliente"}, soy ${config.remitente} de ${config.taller}.\n\nTe envío tu orden de trabajo.\n\n¡Muchas gracias!`;
}
