import test from "node:test";
import assert from "node:assert/strict";
import {
    inicioSemana,
    sumarDias,
    resumenSemanal,
} from "../src/lib/earnings.js";

const pedido = (id, cambios = {}) => ({
    id,
    estado: "En proceso",
    fecha_entrega: "2026-10-31",
    precio: 1000,
    sena: 0,
    pagado: false,
    ...cambios,
});

test("la semana va de lunes a domingo incluso al cruzar mes y año", () => {
    assert.equal(inicioSemana("2027-01-03"), "2026-12-28");
    assert.equal(inicioSemana("2027-01-04"), "2027-01-04");
    assert.equal(sumarDias("2026-12-28", 6), "2027-01-03");
    assert.equal(sumarDias("2027-01-04", -7), "2026-12-28");
});

test("incluye ambos extremos, entregados con saldo y trabajos pagados; excluye otras semanas y sin fecha", () => {
    const filas = [
        pedido(1, { fecha_entrega: "2026-10-26" }),
        pedido(2, {
            fecha_entrega: "2026-11-01",
            estado: "Entregado",
            sena: 200,
        }),
        pedido(3, { pagado: true }),
        pedido(4, { fecha_entrega: "2026-10-25" }),
        pedido(5, { fecha_entrega: "2026-11-02" }),
        pedido(6, { fecha_entrega: null }),
    ];
    const r = resumenSemanal(filas, "2026-10-26");
    assert.deepEqual(
        r.filas.map((f) => f.pedido.id),
        [1, 2, 3],
    );
    assert.equal(r.total, 3000);
    assert.equal(r.pagos, 1200);
    assert.equal(r.saldo, 1800);
    assert.equal(r.conSaldo, 2);
    assert.equal(r.porcentaje, 40);
    assert.equal(filas[1].estado, "Entregado");
});

test("usa cantidades y precios unitarios, pagos completos y centavos exactos", () => {
    const r = resumenSemanal(
        [
            pedido(1, {
                precio: 999,
                sena: 0.1,
                pedido_prendas: [{ precio: 0.1, cantidad: 3 }],
            }),
            pedido(2, { precio: 0.2, pagado: true, sena: 0 }),
        ],
        "2026-10-26",
    );
    assert.equal(r.total, 0.5);
    assert.equal(r.pagos, 0.3);
    assert.equal(r.saldo, 0.2);
    assert.equal(r.porcentaje, 60);
});

test("el progreso queda dentro de 0–100 ante semanas vacías o señas antiguas mayores al precio", () => {
    assert.deepEqual(resumenSemanal([], "2026-10-26"), {
        filas: [],
        total: 0,
        saldo: 0,
        pagos: 0,
        conSaldo: 0,
        porcentaje: 0,
    });
    const r = resumenSemanal([pedido(1, { sena: 1500 })], "2026-10-26");
    assert.equal(r.saldo, 0);
    assert.equal(r.pagos, 1500);
    assert.equal(r.porcentaje, 100);
});
