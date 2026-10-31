// Los precios de pedido_prendas son unitarios; pedidos.precio es el total.
const centavos = (valor) => {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
};

export const subtotalPrenda = (prenda) =>
    (centavos(prenda.precio) * Number(prenda.cantidad ?? 1)) / 100;

export const totalPrendas = (prendas = []) =>
    prendas.reduce((total, prenda) => total + Math.round(subtotalPrenda(prenda) * 100), 0) / 100;

export const totalPedido = (pedido) =>
    pedido.pedido_prendas?.length
        ? totalPrendas(pedido.pedido_prendas)
        : centavos(pedido.precio) / 100;

export const resumenPago = (pedido) => {
    const total = totalPedido(pedido);
    const sena = pedido.pagado ? total : centavos(pedido.sena) / 100;
    return { total, sena, saldo: Math.max(0, centavos(total) - centavos(sena)) / 100 };
};

export const formatearDinero = (valor) =>
    Number(valor || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
