import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarTelefono } from "../src/lib/phone.js";
import {
    crearBorrador,
    validarBorrador,
    coincideBusqueda,
} from "../src/lib/orderDraft.js";
import {
    configuracionInicial,
    validarConfiguracion,
    prepararMensaje,
} from "../src/lib/workshop.js";
import { enlaceWhatsapp } from "../src/lib/whatsapp.js";
import { guardarPedido } from "../src/lib/orderRepository.js";

const pedidoBase = () => ({
    id: 10,
    tipo_prenda: "Pantalón",
    descripcion: "Ajustar cintura",
    fecha_entrega: "2026-11-02",
    precio: 4500,
    sena: 1000,
    pagado: false,
    estado: "En proceso",
    prioridad: "Normal",
    notas: "",
    clientes: { id: 1, nombre: "Ana María", telefono: "11 1234-5678" },
    pedido_prendas: [
        {
            id: 20,
            tipo_prenda: "Pantalón",
            cantidad: 3,
            descripcion: "Ajustar cintura",
            precio: 1500,
        },
    ],
});

// Doble de persistencia con estado: comprueba efectos y reversiones, no solo llamadas.
function baseSimulada({ fallar, unaVez = true } = {}) {
    const original = pedidoBase();
    const tablas = {
        clientes: [structuredClone(original.clientes)],
        pedidos: [
            { ...original, clientes: undefined, pedido_prendas: undefined },
        ],
        pedido_prendas: original.pedido_prendas.map((p) => ({
            ...p,
            pedido_id: 10,
        })),
    };
    let siguienteId = 100;
    let falloUsado = false;
    const operaciones = [];
    const db = {
        from(tabla) {
            let operacion = "select";
            let valores;
            let unico = false;
            let rango;
            const filtros = [];
            const consulta = {
                select() {
                    return consulta;
                },
                order() {
                    return consulta;
                },
                range(inicio, fin) {
                    rango = [inicio, fin];
                    return consulta;
                },
                eq(campo, valor) {
                    filtros.push((fila) => fila[campo] === valor);
                    return consulta;
                },
                in(campo, valores) {
                    filtros.push((fila) => valores.includes(fila[campo]));
                    return consulta;
                },
                single() {
                    unico = true;
                    return consulta;
                },
                insert(datos) {
                    operacion = "insert";
                    valores = datos;
                    return consulta;
                },
                update(datos) {
                    operacion = "update";
                    valores = datos;
                    return consulta;
                },
                delete() {
                    operacion = "delete";
                    return consulta;
                },
                then(resolve, reject) {
                    return Promise.resolve()
                        .then(() => {
                            operaciones.push({ tabla, operacion, valores });
                            if (
                                (!falloUsado || !unaVez) &&
                                fallar?.({ tabla, operacion, valores })
                            ) {
                                falloUsado = true;
                                return {
                                    data: null,
                                    error: { message: "Fallo simulado" },
                                };
                            }
                            let filas = tablas[tabla].filter((f) =>
                                filtros.every((filtro) => filtro(f)),
                            );
                            if (operacion === "insert") {
                                filas = (
                                    Array.isArray(valores) ? valores : [valores]
                                ).map((v) => ({ id: siguienteId++, ...v }));
                                tablas[tabla].push(...filas);
                            }
                            if (operacion === "update")
                                filas.forEach((f) => Object.assign(f, valores));
                            if (operacion === "delete")
                                tablas[tabla] = tablas[tabla].filter(
                                    (f) => !filas.includes(f),
                                );
                            if (rango)
                                filas = filas.slice(rango[0], rango[1] + 1);
                            return {
                                data: structuredClone(unico ? filas[0] : filas),
                                error: null,
                            };
                        })
                        .then(resolve, reject);
                },
            };
            return consulta;
        },
    };
    return { db, tablas, operaciones, original };
}

test("formatos argentinos equivalentes generan un solo teléfono y enlace", () => {
    for (const telefono of [
        "11 1234-5678",
        "(011) 15-1234-5678",
        "+54 9 11 1234 5678",
        "0054 9 11 1234 5678",
        "541112345678",
        "5491112345678",
    ])
        assert.equal(normalizarTelefono(telefono), "5491112345678", telefono);
    assert.equal(normalizarTelefono("0351 15 2345678"), "5493512345678");
    assert.equal(normalizarTelefono("03492 15 123456"), "5493492123456");
    for (const telefono of ["", "abc", "1234", "15 1234-5678"])
        assert.equal(normalizarTelefono(telefono), null);
    assert.equal(normalizarTelefono("+34 612 345 678"), "34612345678");
    assert.equal(enlaceWhatsapp({ clientes: { telefono: "abc" } }), null);
});

test("la búsqueda encuentra prendas secundarias, descripciones y textos sin acentos", () => {
    const pedido = pedidoBase();
    pedido.pedido_prendas.push({
        tipo_prenda: "Camisa",
        descripcion: "Cambiar botón",
    });
    for (const texto of [
        "camisa",
        "boton",
        "ana maria",
        "pantalon",
        "1112345678",
        "10",
    ])
        assert.equal(coincideBusqueda(pedido, texto), true, texto);
    assert.equal(coincideBusqueda(pedido, "vestido"), false);
});

test("validación por campo impide cantidades fraccionarias, precios vacíos y seña excesiva", () => {
    const datos = crearBorrador(pedidoBase());
    assert.deepEqual(validarBorrador(datos), {});
    datos.fecha_entrega = "2026-02-31";
    datos.nombre = "";
    datos.telefono = "123";
    datos.prendas[0].cantidad = "1.5";
    datos.prendas[0].precio = "";
    datos.sena = "5000";
    const errores = validarBorrador(datos);
    for (const campo of [
        "nombre",
        "telefono",
        "fecha_entrega",
        "prendas.0.cantidad",
        "prendas.0.precio",
        "sena",
    ])
        assert.ok(errores[campo], campo);
});

test("pedidos antiguos se pueden editar sin perder su precio ni descripción", () => {
    const pedido = pedidoBase();
    pedido.pedido_prendas = [];
    const datos = crearBorrador(pedido);
    assert.equal(datos.prendas[0].precio, "4500");
    assert.equal(datos.prendas[0].descripcion, "Ajustar cintura");
    assert.deepEqual(validarBorrador(datos), {});
});

test("la plantilla respeta nombres con $ y conserva saltos sin emojis", () => {
    const config = {
        ...configuracionInicial,
        taller: "Taller $&",
        remitente: "Sol",
        plantilla: "Hola {nombre}\nSoy {remitente} de {taller} 🥰",
    };
    assert.deepEqual(validarConfiguracion(config), {});
    assert.equal(
        prepararMensaje("Ana $1", config),
        "Hola Ana $1\nSoy Sol de Taller $&",
    );
    assert.ok(validarConfiguracion({ ...config, plantilla: "Hola" }).plantilla);
    assert.ok(
        validarConfiguracion({ ...config, plantilla: "{nombre} {desconocido}" })
            .plantilla,
    );
    assert.ok(validarConfiguracion(null).plantilla);
});

test("editar actualiza prendas existentes, agrega y elimina, y conserva la identidad del cliente", async () => {
    const { db, tablas, original } = baseSimulada();
    const datos = crearBorrador(original);
    datos.nombre = "Ana Corregida";
    datos.prendas[0].cantidad = "2";
    datos.prendas[0].precio = "2000";
    datos.prendas.push({
        key: "nueva",
        tipo_prenda: "Camisa",
        cantidad: "2",
        descripcion: "Botones",
        precio: "500",
    });
    const guardado = await guardarPedido(db, datos, original);
    assert.equal(guardado.precio, 5000);
    assert.equal(guardado.clientes.id, 1);
    assert.equal(guardado.clientes.nombre, "Ana Corregida");
    assert.equal(tablas.clientes.length, 1);
    assert.equal(tablas.pedido_prendas.length, 2);
    assert.equal(tablas.pedido_prendas[0].id, 20);
    const siguiente = crearBorrador(guardado);
    siguiente.prendas.splice(0, 1);
    siguiente.sena = "0";
    const reducido = await guardarPedido(db, siguiente, guardado);
    assert.equal(reducido.precio, 1000);
    assert.equal(tablas.pedido_prendas.length, 1);
    assert.equal(
        tablas.pedido_prendas.some((p) => p.id === 20),
        false,
    );
});

test("crear reutiliza el cliente antiguo aunque el teléfono tenga otro formato", async () => {
    const { db, tablas } = baseSimulada();
    const datos = crearBorrador(pedidoBase());
    datos.telefono = "+54 9 11 1234 5678";
    const guardado = await guardarPedido(db, datos);
    assert.equal(tablas.clientes.length, 1);
    assert.equal(guardado.clientes.id, 1);
    assert.equal(guardado.precio, 4500);
    assert.equal(guardado.pedido_prendas[0].precio, 1500);
});

test("no se pisa el nombre de otro cliente al crear ni se permite usar su teléfono al editar", async () => {
    const { db, tablas, original, operaciones } = baseSimulada();
    const datos = crearBorrador(original);
    datos.nombre = "Otra persona";
    await assert.rejects(
        guardarPedido(db, datos),
        (e) => e.campo === "telefono",
    );
    assert.equal(
        operaciones.some((o) => o.operacion !== "select"),
        false,
    );
    tablas.clientes.push({ id: 2, nombre: "Sol", telefono: "11 8765-4321" });
    datos.telefono = "011 15 8765-4321";
    await assert.rejects(
        guardarPedido(db, datos, original),
        (e) => e.campo === "telefono",
    );
    assert.equal(tablas.clientes[0].nombre, "Ana María");
});

for (const etapa of ["prenda", "cabecera", "eliminar"]) {
    test(`si falla ${etapa}, se restauran cliente, precios y prendas confirmadas`, async () => {
        const { db, tablas, original } = baseSimulada({
            fallar: ({ tabla, operacion }) =>
                etapa === "prenda"
                    ? tabla === "pedido_prendas" && operacion === "insert"
                    : etapa === "cabecera"
                      ? tabla === "pedidos" && operacion === "update"
                      : tabla === "pedido_prendas" && operacion === "delete",
        });
        const datos = crearBorrador(original);
        datos.nombre = "Ana Corregida";
        datos.prendas[0].precio = "2000";
        datos.prendas.push({
            key: "nueva",
            tipo_prenda: "Camisa",
            cantidad: "1",
            descripcion: "",
            precio: "500",
        });
        if (etapa === "eliminar") datos.prendas.splice(0, 1);
        datos.sena = "0";
        await assert.rejects(
            guardarPedido(db, datos, original),
            /Se revirtieron/,
        );
        assert.equal(tablas.clientes[0].nombre, original.clientes.nombre);
        assert.equal(tablas.pedidos[0].precio, original.precio);
        assert.equal(tablas.pedido_prendas.length, 1);
        assert.equal(tablas.pedido_prendas[0].precio, 1500);
    });
}

test("si falla una prenda nueva, no queda un pedido incompleto", async () => {
    const { db, tablas } = baseSimulada({
        fallar: ({ tabla, operacion }) =>
            tabla === "pedido_prendas" && operacion === "insert",
    });
    await assert.rejects(
        guardarPedido(db, crearBorrador(pedidoBase())),
        /Se revirtieron/,
    );
    assert.equal(tablas.pedidos.length, 1);
    assert.equal(tablas.pedido_prendas.length, 1);
});

test("si también falla la reversión, se informa que el pedido requiere revisión", async () => {
    const { db, tablas, original } = baseSimulada({
        unaVez: false,
        fallar: ({ tabla, operacion, valores }) =>
            (tabla === "pedidos" && operacion === "update") ||
            (tabla === "clientes" &&
                operacion === "update" &&
                valores.nombre === "Ana María"),
    });
    const datos = crearBorrador(original);
    datos.nombre = "Ana Corregida";
    datos.prendas[0].precio = "2000";
    await assert.rejects(
        guardarPedido(db, datos, original),
        /No pudimos revertir todos los cambios/,
    );
    assert.equal(tablas.clientes[0].nombre, "Ana Corregida");
    assert.equal(tablas.pedido_prendas[0].precio, 1500);
});

test("la búsqueda de clientes recorre más de una página y no crea duplicados antiguos", async () => {
    const { db, tablas, original } = baseSimulada();
    tablas.clientes = Array.from({ length: 500 }, (_, indice) => ({
        id: indice + 2,
        nombre: "Cliente",
        telefono: "sin teléfono",
    }));
    tablas.clientes.push(original.clientes);
    await guardarPedido(db, crearBorrador(original));
    assert.equal(tablas.clientes.length, 501);
    assert.equal(tablas.pedidos[1].cliente_id, 1);
});

test("descripciones nulas anteriores se pueden editar y las señas no aceptan fracciones de centavo", () => {
    const pedido = pedidoBase();
    pedido.pedido_prendas[0].descripcion = null;
    const datos = crearBorrador(pedido);
    assert.equal(datos.prendas[0].descripcion, "");
    assert.deepEqual(validarBorrador(datos), {});
    datos.sena = "1.005";
    assert.ok(validarBorrador(datos).sena);
});
