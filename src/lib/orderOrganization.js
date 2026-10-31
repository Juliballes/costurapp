import { coincideBusqueda } from "./orderDraft.js";
import { resumenPago } from "./orderTotals.js";

export const esAntiguo = (pedido) => pedido.estado === "Entregado";
export const fechaLocal = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
const fechaValida = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor || "");

export function coincideFecha(pedido, filtro, hoy = new Date()) {
    if (!filtro || filtro === "Todos") return true;
    if (!fechaValida(pedido.fecha_entrega)) return false;
    const fecha = pedido.fecha_entrega;
    const hoyTexto = fechaLocal(hoy);
    if (filtro === "Hoy") return fecha === hoyTexto;
    if (filtro === "Mañana") {
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        return fecha === fechaLocal(manana);
    }
    if (filtro === "Atrasados" || filtro === "Vencidos")
        return !esAntiguo(pedido) && fecha < hoyTexto;
    if (filtro === "Esta semana") {
        const lunes = new Date(hoy);
        lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
        const domingo = new Date(lunes);
        domingo.setDate(domingo.getDate() + 6);
        return fecha >= fechaLocal(lunes) && fecha <= fechaLocal(domingo);
    }
    return true;
}

export function ordenAtencion(pedido, hoy = new Date()) {
    const fecha = pedido.fecha_entrega;
    if (fechaValida(fecha) && fecha < fechaLocal(hoy)) return 0;
    if (fecha === fechaLocal(hoy)) return 1;
    if (pedido.prioridad === "Urgente") return 2;
    return 3;
}

export function organizarPedidos(pedidos, filtros, hoy = new Date()) {
    const antiguos = filtros.solapa === "Antiguos";
    const compararFecha = (a, b, descendente = false) => {
        const aTiene = fechaValida(a.fecha_entrega),
            bTiene = fechaValida(b.fecha_entrega);
        if (!aTiene || !bTiene) return Number(bTiene) - Number(aTiene);
        return descendente
            ? b.fecha_entrega.localeCompare(a.fecha_entrega)
            : a.fecha_entrega.localeCompare(b.fecha_entrega);
    };
    return pedidos
        .filter((pedido) => {
            if (esAntiguo(pedido) !== antiguos) return false;
            if (!coincideBusqueda(pedido, filtros.busqueda || "")) return false;
            if (filtros.estado && filtros.estado !== "Todos") {
                if (
                    filtros.estado === "En trabajo"
                        ? !["Pendiente", "En proceso"].includes(pedido.estado)
                        : pedido.estado !== filtros.estado
                )
                    return false;
            }
            if (
                filtros.prioridad === "Urgente" &&
                pedido.prioridad !== "Urgente"
            )
                return false;
            const saldo = resumenPago(pedido).saldo;
            if (filtros.pago === "Con saldo" && saldo <= 0) return false;
            if (filtros.pago === "Sin saldo" && saldo > 0) return false;
            return coincideFecha(pedido, filtros.fecha, hoy);
        })
        .sort((a, b) => {
            let diferencia;
            if (filtros.orden === "Cliente")
                diferencia = (a.clientes?.nombre || "").localeCompare(
                    b.clientes?.nombre || "",
                    "es",
                    { sensitivity: "base" },
                );
            else if (
                filtros.orden === "Recientes" ||
                (antiguos && !filtros.orden)
            )
                diferencia = compararFecha(a, b, true);
            else if (filtros.orden === "Fecha")
                diferencia = compararFecha(a, b);
            else
                diferencia =
                    ordenAtencion(a, hoy) - ordenAtencion(b, hoy) ||
                    compararFecha(a, b) ||
                    Number(b.prioridad === "Urgente") -
                        Number(a.prioridad === "Urgente");
            return (
                diferencia ||
                String(a.id).localeCompare(String(b.id), "es", {
                    numeric: true,
                })
            );
        });
}

export function resumenOrganizacion(pedidos) {
    const activos = pedidos.filter((p) => !esAntiguo(p));
    const antiguos = pedidos.filter(esAntiguo);
    return {
        activos,
        antiguos,
        enTrabajo: activos.filter((p) => p.estado !== "Listo").length,
        listos: activos.filter((p) => p.estado === "Listo").length,
        saldoActivos:
            activos.reduce(
                (suma, p) => suma + Math.round(resumenPago(p).saldo * 100),
                0,
            ) / 100,
        saldoAntiguos:
            antiguos.reduce(
                (suma, p) => suma + Math.round(resumenPago(p).saldo * 100),
                0,
            ) / 100,
    };
}
