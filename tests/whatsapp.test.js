import { test } from "node:test";
import assert from "node:assert/strict";
import { enlaceWhatsapp, mensajeRetiro } from "../src/lib/whatsapp.js";
import { configuracionInicial } from "../src/lib/workshop.js";

const pedido = (nombre) => ({
    id: 10,
    clientes: { nombre, telefono: "(011) 15 1234-5678" },
});

test("en Windows, Mac y Linux abre WhatsApp Web con el teléfono y el mensaje listos", () => {
    const texto = "Hola Paula & Ana, tu orden está lista.\nTotal: $4.500 + seña 10%";
    for (const userAgent of [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/158.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0",
    ]) {
        const url = new URL(enlaceWhatsapp(pedido("Paula"), undefined, texto, { userAgent }));
        assert.equal(url.origin, "https://web.whatsapp.com");
        assert.equal(url.pathname, "/send");
        assert.equal(url.searchParams.get("phone"), "5491112345678");
        assert.equal(url.searchParams.get("text"), texto);
    }
});

test("en Android, iPhone e iPad conserva la apertura de WhatsApp móvil con el mismo destinatario", () => {
    for (const navegador of [
        { userAgent: "Mozilla/5.0 (Linux; Android 15) Mobile Safari/537.36" },
        { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148" },
        { userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)" },
        { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1.15", maxTouchPoints: 5 },
    ]) {
        const url = new URL(enlaceWhatsapp(pedido("Paula"), undefined, "Hola Paula", navegador));
        assert.equal(url.origin, "https://api.whatsapp.com");
        assert.equal(url.searchParams.get("phone"), "5491112345678");
        assert.equal(url.searchParams.get("text"), "Hola Paula");
    }
});

test("el aviso inicial de Paula no tiene emojis y conserva los párrafos", () => {
    const esperado =
        "Hola Paula, soy Mariana de Mhome\n\nTu prenda ya está lista para retirar.\n\n¡Muchas gracias!";
    assert.equal(mensajeRetiro("Paula"), esperado);
    const url = new URL(enlaceWhatsapp(pedido("Paula")));
    assert.equal(url.origin, "https://web.whatsapp.com");
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
