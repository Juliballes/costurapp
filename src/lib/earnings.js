import { fechaLocal } from "./orderOrganization.js";
import { resumenPago } from "./orderTotals.js";

export function sumarDias(fecha, cantidad) {
    const dia = new Date(`${fecha}T12:00:00`);
    dia.setDate(dia.getDate() + cantidad);
    return fechaLocal(dia);
}

export function inicioSemana(fecha = fechaLocal(new Date())) {
    const dia = new Date(`${fecha}T12:00:00`);
    return sumarDias(fecha, -((dia.getDay() + 6) % 7));
}

export function resumenSemanal(pedidos, lunes) {
    const domingo = sumarDias(lunes, 6);
    const filas = pedidos
        .filter((p) => p.fecha_entrega >= lunes && p.fecha_entrega <= domingo)
        .map((pedido) => ({ pedido, ...resumenPago(pedido) }))
        .sort(
            (a, b) =>
                b.saldo - a.saldo ||
                a.pedido.fecha_entrega.localeCompare(b.pedido.fecha_entrega) ||
                String(a.pedido.id).localeCompare(String(b.pedido.id)),
        );
    // Sumar en centavos evita errores de punto flotante entre muchos pedidos.
    const sumar = (campo) =>
        filas.reduce((suma, fila) => suma + Math.round(fila[campo] * 100), 0) /
        100;
    const total = sumar("total");
    const saldo = sumar("saldo");
    return {
        filas,
        total,
        saldo,
        pagos: sumar("sena"),
        conSaldo: filas.filter((fila) => fila.saldo > 0).length,
        porcentaje:
            total > 0
                ? Math.round(
                      Math.min(
                          100,
                          Math.max(0, ((total - saldo) / total) * 100),
                      ),
                  )
                : 0,
    };
}
