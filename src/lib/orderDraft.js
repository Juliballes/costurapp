import { normalizarTelefono } from "./phone.js";
import { totalPrendas } from "./orderTotals.js";

export const tiposPrenda = [
    "Vestido",
    "Pantalón",
    "Blusa",
    "Camisa",
    "Saco",
    "Falda",
    "Otro",
];
export function nuevaPrenda() {
    return {
        key: crypto.randomUUID(),
        tipo_prenda: "",
        cantidad: "1",
        descripcion: "",
        precio: "",
    };
}

export function crearBorrador(pedido) {
    const prendas = pedido?.pedido_prendas?.length
        ? pedido.pedido_prendas
        : pedido
          ? [
                {
                    tipo_prenda: pedido.tipo_prenda || "",
                    cantidad: 1,
                    descripcion: pedido.descripcion || "",
                    precio: pedido.precio ?? "",
                },
            ]
          : [];
    return {
        nombre: pedido?.clientes?.nombre || "",
        telefono: pedido?.clientes?.telefono || "",
        fecha_entrega: pedido?.fecha_entrega || "",
        estado: pedido?.estado || "En proceso",
        prioridad: pedido?.prioridad || "Normal",
        notas: pedido?.notas || "",
        sena: String(pedido?.sena ?? ""),
        pagado: Boolean(pedido?.pagado),
        prendas: prendas.length
            ? prendas.map((p) => ({
                  ...p,
                  tipo_prenda: p.tipo_prenda || "",
                  descripcion: p.descripcion || "",
                  key: p.id != null ? `prenda-${p.id}` : crypto.randomUUID(),
                  cantidad: String(p.cantidad ?? 1),
                  precio: String(p.precio ?? ""),
              }))
            : [nuevaPrenda()],
    };
}

export function validarBorrador(borrador) {
    const errores = {};
    if (!borrador.nombre.trim())
        errores.nombre = "Ingresá el nombre del cliente.";
    if (!normalizarTelefono(borrador.telefono))
        errores.telefono =
            "Ingresá un teléfono con código de área, por ejemplo 11 1234-5678.";
    const fecha = new Date(`${borrador.fecha_entrega}T12:00:00Z`);
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(borrador.fecha_entrega) ||
        Number.isNaN(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== borrador.fecha_entrega
    )
        errores.fecha_entrega = "Elegí una fecha de entrega válida.";
    if (!borrador.prendas.length)
        errores.prendas = "Agregá al menos una prenda.";
    borrador.prendas.forEach((prenda, indice) => {
        if (!prenda.tipo_prenda.trim())
            errores[`prendas.${indice}.tipo_prenda`] =
                "Seleccioná el tipo de prenda.";
        const cantidad = Number(prenda.cantidad);
        if (!Number.isSafeInteger(cantidad) || cantidad < 1)
            errores[`prendas.${indice}.cantidad`] =
                "La cantidad debe ser un número entero mayor a cero.";
        if (
            String(prenda.precio).trim() === "" ||
            !Number.isFinite(Number(prenda.precio)) ||
            Number(prenda.precio) < 0 ||
            Math.abs(
                Number(prenda.precio) * 100 -
                    Math.round(Number(prenda.precio) * 100),
            ) > 0.000001
        )
            errores[`prendas.${indice}.precio`] =
                "Ingresá un precio con hasta dos decimales; usá 0 si es sin cargo.";
    });
    const sena = Number(borrador.sena || 0);
    if (
        !borrador.pagado &&
        (!Number.isFinite(sena) ||
            sena < 0 ||
            Math.abs(sena * 100 - Math.round(sena * 100)) > 0.000001)
    )
        errores.sena =
            "La seña debe ser un importe positivo o cero, con hasta dos decimales.";
    else if (!borrador.pagado && sena > totalPrendas(borrador.prendas))
        errores.sena = "La seña no puede superar el total del pedido.";
    return errores;
}

export function coincideBusqueda(pedido, busqueda) {
    const normalizar = (texto) =>
        String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    const texto = normalizar(busqueda).trim();
    const telefonoBuscado = texto.replace(/\D/g, "");
    const campos = [
        pedido.id,
        pedido.clientes?.nombre,
        pedido.clientes?.telefono,
        pedido.tipo_prenda,
        pedido.descripcion,
        pedido.notas,
        ...(pedido.pedido_prendas || []).flatMap((p) => [
            p.tipo_prenda,
            p.descripcion,
        ]),
    ];
    return (
        campos.some((campo) => normalizar(campo).includes(texto)) ||
        (/^[\d\s+()-]+$/.test(texto) &&
            telefonoBuscado.length > 0 &&
            String(pedido.clientes?.telefono || "")
                .replace(/\D/g, "")
                .includes(telefonoBuscado))
    );
}
