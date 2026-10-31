import { test } from "node:test";
import assert from "node:assert/strict";
import { enlaceWhatsapp, mensajeRetiro } from "../src/lib/whatsapp.js";
import { configuracionInicial } from "../src/lib/workshop.js";

const pedido = (nombre) => ({
    id: 10,
    clientes: { nombre, telefono: "(011) 15 1234-5678" },
});

test("el aviso inicial de Paula no tiene emojis y conserva los párrafos", () => {
    const esperado =
        "Hola Paula, soy Mariana de Mhome\n\nTu prenda ya está lista para retirar.\n\n¡Muchas gracias!";
    assert.equal(mensajeRetiro("Paula"), esperado);
    const url = new URL(enlaceWhatsapp(pedido("Paula")));
    assert.equal(url.origin, "https://api.whatsapp.com");
    assert.equal(url.searchParams.get("phone"), "5491112345678");
    assert.equal(url.searchParams.get("text"), esperado);
});

test("una plantilla anterior guardada pierde sus emojis sin perder el texto personalizado", () => {
    const config = {
        taller: "Taller de Ana",
        remitente: "Sol",
        plantilla:
            "Hola {nombre}👋🏻 soy {remitente} de {taller}\n\nPasá mañana por tu prenda.\n\n¡Muchas gracias! 🥰.",
    };
    assert.equal(
        mensajeRetiro("Paula", config),
        "Hola Paula soy Sol de Taller de Ana\n\nPasá mañana por tu prenda.\n\n¡Muchas gracias!",
    );
});

test("el enlace utiliza exactamente la edición de este aviso y no cambia la plantilla", () => {
    const anterior = configuracionInicial.plantilla;
    const texto =
        "Hola Paula & Sol, ¿pasás mañana?\n\nRetirá después de las 17:30. + # 100%";
    const url = new URL(
        enlaceWhatsapp(pedido("Paula"), configuracionInicial, texto),
    );
    assert.equal(url.searchParams.get("text"), texto);
    assert.equal([...url.searchParams].length, 2);
    assert.equal(configuracionInicial.plantilla, anterior);
    assert.equal(
        mensajeRetiro("Otra clienta"),
        "Hola Otra clienta, soy Mariana de Mhome\n\nTu prenda ya está lista para retirar.\n\n¡Muchas gracias!",
    );
});

test("no se abre un aviso vacío ni un número inválido", () => {
    assert.equal(enlaceWhatsapp(pedido("Paula"), undefined, ""), null);
    assert.equal(enlaceWhatsapp(pedido("Paula"), undefined, "  \n "), null);
    assert.equal(
        enlaceWhatsapp(
            { clientes: { telefono: "123", nombre: "Paula" } },
            undefined,
            "Hola",
        ),
        null,
    );
});

test("las plantillas anteriores con símbolos de reemplazo también se limpian", () => {
    const config = {
        ...configuracionInicial,
        plantilla:
            "Hola {nombre}� soy {remitente} de {taller}\n\nTu prenda ya está lista para retirar.\n\n¡Muchas gracias! �.",
    };
    assert.equal(
        mensajeRetiro("Paula", config),
        "Hola Paula soy Mariana de Mhome\n\nTu prenda ya está lista para retirar.\n\n¡Muchas gracias!",
    );
});
