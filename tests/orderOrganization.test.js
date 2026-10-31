import { test } from "node:test";
import assert from "node:assert/strict";
import {
    esAntiguo,
    coincideFecha,
    organizarPedidos,
    resumenOrganizacion,
} from "../src/lib/orderOrganization.js";

const hoy = new Date(2026, 9, 31, 15);
const filtros = (cambios = {}) => ({
    solapa: "Activos",
    busqueda: "",
    estado: "Todos",
    fecha: "Todos",
    prioridad: "Todos",
    pago: "Todos",
    orden: "Atención",
    ...cambios,
});
const pedido = (id, estado, fecha, extra = {}) => ({
    id,
    estado,
    fecha_entrega: fecha,
    precio: 1000,
    sena: 0,
    prioridad: "Normal",
    clientes: { nombre: `Cliente ${id}`, telefono: "11 1234-5678" },
    ...extra,
});
const datos = () => [
    pedido(1, "En proceso", "2026-10-30"),
    pedido(2, "Listo", "2026-10-31"),
    pedido(3, "Entregado", "2026-10-29"),
    pedido(4, "Pendiente", "2026-11-02", { pagado: true }),
    pedido(5, "Entregado", "2026-10-31", { sena: 300 }),
];

test("solo Entregado pertenece a Antiguos: Listo y pagado siguen activos", () => {
    assert.deepEqual(
        organizarPedidos(datos(), filtros(), hoy).map((p) => p.id),
        [1, 2, 4],
    );
    assert.deepEqual(
        organizarPedidos(
            datos(),
            filtros({ solapa: "Antiguos", orden: "Recientes" }),
            hoy,
        ).map((p) => p.id),
        [5, 3],
    );
    assert.equal(esAntiguo(datos()[1]), false);
    assert.equal(esAntiguo(datos()[3]), false);
});

test("entregar y reactivar mueven de solapa sin cambiar total, seña ni saldo", () => {
    const pedidos = datos();
    const antes = resumenOrganizacion(pedidos);
    const original = structuredClone(pedidos[1]);
    pedidos[1].estado = "Entregado";
    const despues = resumenOrganizacion(pedidos);
    assert.equal(despues.activos.length, antes.activos.length - 1);
    assert.equal(despues.antiguos.length, antes.antiguos.length + 1);
    assert.equal(despues.saldoAntiguos, antes.saldoAntiguos + 1000);
    assert.equal(pedidos[1].precio, original.precio);
    assert.equal(pedidos[1].sena, original.sena);
    pedidos[1].estado = "En proceso";
    assert.equal(
        organizarPedidos(pedidos, filtros(), hoy).some((p) => p.id === 2),
        true,
    );
});

test("prioriza atrasados, hoy, urgentes y luego las fechas próximas; no muta el origen", () => {
    const pedidos = [
        pedido(1, "Listo", "2026-11-03"),
        pedido(2, "En proceso", "2026-10-29"),
        pedido(3, "En proceso", "2026-11-10", { prioridad: "Urgente" }),
        pedido(4, "Pendiente", "2026-10-31"),
        pedido(5, "En proceso", null),
        pedido(6, "En proceso", "2026-11-01"),
    ];
    assert.deepEqual(
        organizarPedidos(pedidos, filtros(), hoy).map((p) => p.id),
        [2, 4, 3, 6, 1, 5],
    );
    assert.deepEqual(
        pedidos.map((p) => p.id),
        [1, 2, 3, 4, 5, 6],
    );
});

test("combina búsqueda de prendas secundarias, estado, fecha, prioridad y pago", () => {
    const pedidos = datos();
    pedidos[0].prioridad = "Urgente";
    pedidos[0].pedido_prendas = [
        {
            tipo_prenda: "Vestido",
            descripcion: "Cambiar cierre",
            cantidad: 1,
            precio: 3000,
        },
        {
            tipo_prenda: "Camisa",
            descripcion: "Botón",
            cantidad: 1,
            precio: 500,
        },
    ];
    const elegidos = organizarPedidos(
        pedidos,
        filtros({
            busqueda: "boton",
            estado: "En trabajo",
            fecha: "Atrasados",
            prioridad: "Urgente",
            pago: "Con saldo",
        }),
        hoy,
    );
    assert.deepEqual(
        elegidos.map((p) => p.id),
        [1],
    );
    assert.equal(
        organizarPedidos(pedidos, filtros({ busqueda: "Cliente 3" }), hoy)
            .length,
        0,
    );
    assert.equal(
        organizarPedidos(
            pedidos,
            filtros({
                busqueda: "Cliente 3",
                solapa: "Antiguos",
                orden: "Recientes",
            }),
            hoy,
        ).length,
        1,
    );
});

test("no confunde los pagos del historial con los pedidos activos", () => {
    const resumen = resumenOrganizacion(datos());
    assert.equal(resumen.enTrabajo, 2);
    assert.equal(resumen.listos, 1);
    assert.equal(resumen.saldoActivos, 2000);
    assert.equal(resumen.saldoAntiguos, 1700);
    assert.deepEqual(
        organizarPedidos(
            datos(),
            filtros({
                solapa: "Antiguos",
                orden: "Recientes",
                pago: "Con saldo",
            }),
            hoy,
        ).map((p) => p.id),
        [5, 3],
    );
    assert.deepEqual(
        organizarPedidos(datos(), filtros({ pago: "Sin saldo" }), hoy).map(
            (p) => p.id,
        ),
        [4],
    );
});

test("fechas locales: mañana cruza mes y año; semana incluye lunes a domingo", () => {
    const fin = new Date(2026, 11, 31, 23, 50);
    assert.equal(
        coincideFecha(pedido(1, "Listo", "2027-01-01"), "Mañana", fin),
        true,
    );
    const domingo = new Date(2026, 10, 1, 12);
    assert.equal(
        coincideFecha(pedido(1, "Listo", "2026-10-26"), "Esta semana", domingo),
        true,
    );
    assert.equal(
        coincideFecha(pedido(1, "Listo", "2026-11-01"), "Esta semana", domingo),
        true,
    );
    assert.equal(
        coincideFecha(pedido(1, "Listo", "2026-11-02"), "Esta semana", domingo),
        false,
    );
    assert.equal(
        coincideFecha(pedido(1, "Entregado", "2026-10-01"), "Atrasados", hoy),
        false,
    );
    assert.equal(
        coincideFecha(pedido(1, "En proceso", null), "Hoy", hoy),
        false,
    );
    assert.equal(
        coincideFecha(pedido(1, "En proceso", null), "Todos", hoy),
        true,
    );
});

test("ordena el historial por fecha prevista reciente y deja los pedidos sin fecha al final", () => {
    const pedidos = [
        pedido(1, "Entregado", null),
        pedido(2, "Entregado", "2026-10-01"),
        pedido(3, "Entregado", "2026-10-20"),
    ];
    assert.deepEqual(
        organizarPedidos(
            pedidos,
            filtros({ solapa: "Antiguos", orden: "Recientes" }),
            hoy,
        ).map((p) => p.id),
        [3, 2, 1],
    );
    pedidos[1].clientes.nombre = "Ángela";
    pedidos[2].clientes.nombre = "Belén";
    pedidos[0].clientes.nombre = "Zoe";
    assert.deepEqual(
        organizarPedidos(
            pedidos,
            filtros({ solapa: "Antiguos", orden: "Cliente" }),
            hoy,
        ).map((p) => p.id),
        [2, 3, 1],
    );
});

test("la carga del historial recorre todas las páginas sin truncar los activos después del pedido 1000", async () => {
    const { cargarTodosLosPedidos } =
        await import("../src/lib/orderRepository.js");
    const registros = Array.from({ length: 1003 }, (_, id) =>
        pedido(id, id < 1000 ? "Entregado" : "Listo", "2026-10-31"),
    );
    const rangos = [];
    const db = {
        from: () => ({
            select() {
                return this;
            },
            order() {
                return this;
            },
            async range(inicio, fin) {
                rangos.push([inicio, fin]);
                return { data: registros.slice(inicio, fin + 1), error: null };
            },
        }),
    };
    const cargados = await cargarTodosLosPedidos(db);
    assert.equal(cargados.length, 1003);
    assert.equal(resumenOrganizacion(cargados).activos.length, 3);
    assert.deepEqual(rangos, [
        [0, 499],
        [500, 999],
        [1000, 1499],
    ]);
});

test("si falla una página del historial, no devuelve un listado parcial", async () => {
    const { cargarTodosLosPedidos } =
        await import("../src/lib/orderRepository.js");
    const db = {
        from: () => ({
            select() {
                return this;
            },
            order() {
                return this;
            },
            async range(inicio) {
                return inicio === 0
                    ? {
                          data: Array.from({ length: 500 }, (_, id) => ({
                              id,
                          })),
                          error: null,
                      }
                    : { data: null, error: new Error("Sin conexión") };
            },
        }),
    };
    await assert.rejects(cargarTodosLosPedidos(db), /Sin conexión/);
});
