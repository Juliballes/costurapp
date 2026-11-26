import test from "node:test";
import assert from "node:assert/strict";
import { compartirImagenBoleta } from "../src/lib/workOrderShare.js";
import { nombreArchivoBoleta, mensajeBoleta } from "../src/lib/workOrder.js";
import { enlaceWhatsapp } from "../src/lib/whatsapp.js";
import { configuracionInicial } from "../src/lib/workshop.js";

const datos = () => ({
    blob: new Blob(["imagen"], { type: "image/png" }),
    nombre: "orden-de-trabajo-paula.png",
    mensaje: "Hola Paula, te envío tu orden de trabajo.",
    enlace: "https://web.whatsapp.com/send?phone=5491112345678",
});

test("abre directamente el chat del destinatario incluso si el celular admite compartir archivos", async () => {
    const pasos = [];
    const contenido = datos();
    const resultado = await compartirImagenBoleta(contenido, {
        navigator: {
            canShare: () => assert.fail("No debe consultar Web Share"),
            share: () => assert.fail("No debe pedir elegir un contacto"),
        },
        abrir: (url) => pasos.push(url),
        descargar: (blob, nombre) => {
            assert.equal(blob, contenido.blob);
            pasos.push(nombre);
        },
    });
    assert.equal(resultado, "descargado");
    assert.deepEqual(pasos, [contenido.enlace, contenido.nombre]);
});

test("abre el chat durante el clic y antes de descargar también sin Web Share", async () => {
    const pasos = [];
    const pendiente = compartirImagenBoleta(datos(), {
        abrir: (url) => pasos.push(url),
        descargar: () => pasos.push("descarga"),
    });
    // Los efectos ya ocurrieron, antes de esperar ninguna promesa.
    assert.deepEqual(pasos, [datos().enlace, "descarga"]);
    await pendiente;
});

test("un enlace ausente no abre ventanas ni descarga imágenes", async () => {
    await assert.rejects(
        compartirImagenBoleta({ ...datos(), enlace: null }, {
            abrir: () => assert.fail("Sin destinatario"),
            descargar: () => assert.fail("Sin destinatario"),
        }),
        /teléfono válido/,
    );
});

test("el enlace abre el número del cliente con un mensaje de orden, distinto del aviso de retiro", () => {
    const mensaje = mensajeBoleta("Paula", configuracionInicial);
    const url = new URL(
        enlaceWhatsapp(
            { clientes: { telefono: "11 1234-5678" } },
            configuracionInicial,
            mensaje,
        ),
    );
    assert.equal(url.searchParams.get("phone"), "5491112345678");
    assert.equal(url.searchParams.get("text"), mensaje);
    assert.match(mensaje, /orden de trabajo/);
    assert.doesNotMatch(mensaje, /lista para retirar/);
});
test("el archivo tiene extensión PNG, fecha local y nombre seguro para descargar", () => {
    assert.equal(
        nombreArchivoBoleta(
            "Ana María / <cliente>",
            new Date("2026-11-26T12:00:00"),
        ),
        "orden-de-trabajo-ana-maria-cliente-2026-11-26.png",
    );
});


test("si falla la descarga conserva el intento de abrir el chat y comunica el error", async () => {
    const pasos = [];
    await assert.rejects(
        compartirImagenBoleta(datos(), {
            abrir: (url) => pasos.push(url),
            descargar: () => { throw new Error("Descarga fallida"); },
        }),
        /Descarga fallida/,
    );
    assert.deepEqual(pasos, [datos().enlace]);
});
