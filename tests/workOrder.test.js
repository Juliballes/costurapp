import test from "node:test";
import assert from "node:assert/strict";
import {
    crearBoleta,
    fechaBoleta,
    normalizarInstagram,
} from "../src/lib/workOrder.js";
import {
    configuracionInicial,
    validarConfiguracion,
} from "../src/lib/workshop.js";

const pedido = (extra = {}) => ({
    id: 1,
    precio: 999,
    sena: 1000,
    pagado: false,
    fecha_entrega: "2026-12-04",
    notas: "Retirar por la tarde.",
    clientes: { nombre: "Paula", telefono: "5491112345678" },
    pedido_prendas: [
        {
            tipo_prenda: "Pantalón",
            cantidad: 3,
            precio: 1500,
            descripcion: "Hacer ruedo",
        },
        {
            tipo_prenda: "Blusa",
            cantidad: 1,
            precio: 500,
            descripcion: "Cambiar cierre",
        },
    ],
    ...extra,
});

test("la boleta usa cantidades y precios unitarios y descuenta los pagos del total calculado", () => {
    const p = pedido();
    const antes = structuredClone(p);
    const r = crearBoleta(p);
    assert.equal(r.total, 5000);
    assert.equal(r.sena, 1000);
    assert.equal(r.saldo, 4000);
    assert.deepEqual(r.filas[0], {
        cantidad: 3,
        descripcion: "Pantalón · Hacer ruedo",
        precio: 1500,
        subtotal: 4500,
    });
    assert.equal(r.nombre, "Paula");
    assert.equal(r.entrega, "04/12/2026");
    assert.equal(r.observaciones, p.notas);
    assert.deepEqual(p, antes);
});
test("los pedidos antiguos sin prendas mantienen su importe y descripción", () => {
    const r = crearBoleta(
        pedido({
            pedido_prendas: [],
            precio: 2500,
            tipo_prenda: "Saco",
            descripcion: "Ajustar mangas",
            sena: 0,
        }),
    );
    assert.deepEqual(r.filas, [
        {
            cantidad: 1,
            descripcion: "Saco · Ajustar mangas",
            precio: 2500,
            subtotal: 2500,
        },
    ]);
    assert.equal(r.saldo, 2500);
});
test("un pedido pagado o sin cargo no genera una deuda falsa en la boleta", () => {
    const r = crearBoleta(pedido({ pagado: true }));
    assert.equal(r.total, 5000);
    assert.equal(r.sena, 5000);
    assert.equal(r.saldo, 0);
    const gratis = crearBoleta(
        pedido({
            pedido_prendas: [{ tipo_prenda: "Blusa", precio: 0, cantidad: 3 }],
            sena: 0,
        }),
    );
    assert.equal(gratis.total, 0);
    assert.equal(gratis.saldo, 0);
});
test("la boleta conserva centavos y completa datos opcionales sin inventar dirección", () => {
    const r = crearBoleta(
        pedido({
            clientes: null,
            notas: null,
            pedido_prendas: [{ precio: 0.1, cantidad: 3 }],
            sena: 0.1,
            fecha_entrega: null,
        }),
    );
    assert.equal(r.total, 0.3);
    assert.equal(r.saldo, 0.2);
    assert.equal(r.nombre, "Sin cliente");
    assert.equal(r.telefono, "Sin teléfono");
    assert.equal(r.direccion, "");
    assert.equal(r.entrega, "Sin fecha");
});
test("no genera boletas de borradores sin un guardado confirmado", () => {
    assert.throws(() => crearBoleta(null), /guardá/);
    assert.throws(() => crearBoleta({}), /guardá/);
});
test("fechas de entrega no cambian por la zona horaria", () => {
    assert.equal(fechaBoleta("2026-12-04"), "04/12/2026");
    assert.equal(fechaBoleta("2026-12-04T00:00:00Z"), "04/12/2026");
    assert.equal(fechaBoleta(""), "Sin fecha");
});
test("el Instagram acepta usuario, arroba o enlace y rechaza direcciones de otro sitio", () => {
    for (const v of [
        "mhome.larra",
        "@mhome.larra",
        " https://www.instagram.com/mhome.larra/?hl=es ",
    ])
        assert.equal(normalizarInstagram(v), "mhome.larra");
    for (const v of [
        "https://example.com/mhome.larra",
        "bad/name",
        "tiene espacios",
    ])
        assert.equal(normalizarInstagram(v), null);
    assert.equal(normalizarInstagram(""), "");
    assert.equal(normalizarInstagram(null), "");
});
test("los contactos iniciales son los provistos y la configuración antigua sigue siendo válida", () => {
    assert.equal(configuracionInicial.telefono, "+54 9 11 5954-5739");
    assert.equal(configuracionInicial.instagram, "mhome.larra");
    const { telefono, instagram, ...antigua } = configuracionInicial;
    assert.deepEqual(validarConfiguracion(antigua), {});
    assert.ok(validarConfiguracion({ ...antigua, telefono: "123" }).telefono);
    assert.ok(
        validarConfiguracion({ ...antigua, instagram: "bad/name" }).instagram,
    );
    assert.deepEqual(
        validarConfiguracion({ ...antigua, telefono, instagram }),
        {},
    );
});
