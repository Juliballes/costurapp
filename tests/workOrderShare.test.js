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
    enlace: "https://api.whatsapp.com/send?phone=5491112345678",
});

test("en un navegador compatible comparte un archivo PNG real y no abre otro chat ni descarga", async () => {
    let compartido;
    const resultado = await compartirImagenBoleta(datos(), {
        navigator: {
            canShare: ({ files }) => files[0].type === "image/png",
            share: async (contenido) => {
                compartido = contenido;
            },
        },
        descargar: () => assert.fail("No debe descargar"),
        abrir: () => assert.fail("No debe abrir enlace"),
    });
    assert.equal(resultado, "compartido");
    assert.equal(compartido.files.length, 1);
    assert.equal(compartido.files[0].name, "orden-de-trabajo-paula.png");
    assert.equal(compartido.files[0].type, "image/png");
    assert.equal(await compartido.files[0].text(), "imagen");
    assert.equal(compartido.text, datos().mensaje);
});
test("si no se pueden compartir archivos descarga la imagen y abre el chat del destinatario", async () => {
    const pasos = [];
    const resultado = await compartirImagenBoleta(datos(), {
        navigator: {
            canShare: () => false,
            share: () => assert.fail("No admite archivos"),
        },
        descargar: (blob, nombre) => {
            assert.equal(blob.type, "image/png");
            pasos.push(nombre);
        },
        abrir: (url) => pasos.push(url),
    });
    assert.equal(resultado, "descargado");
    assert.deepEqual(pasos, [datos().nombre, datos().enlace]);
});
test("sin Web Share conserva la alternativa de descarga y chat", async () => {
    let descargas = 0,
        aperturas = 0;
    await compartirImagenBoleta(datos(), {
        navigator: {},
        descargar: () => descargas++,
        abrir: () => aperturas++,
    });
    assert.equal(descargas, 1);
    assert.equal(aperturas, 1);
});
test("cancelar la pantalla de compartir no envía, descarga ni abre ventanas", async () => {
    const cancelado = new DOMException("Cancelado", "AbortError");
    await assert.rejects(
        compartirImagenBoleta(datos(), {
            navigator: {
                canShare: () => true,
                share: async () => {
                    throw cancelado;
                },
            },
            descargar: () => assert.fail("Cancelado"),
            abrir: () => assert.fail("Cancelado"),
        }),
        { name: "AbortError" },
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

test("si consultar la capacidad de compartir falla ofrece descarga y chat", async () => {
    const pasos = [];
    const r = await compartirImagenBoleta(datos(), {
        navigator: {
            share: async () => assert.fail("Sin permiso"),
            canShare: () => {
                throw new Error("No permitido");
            },
        },
        descargar: () => pasos.push("descarga"),
        abrir: () => pasos.push("chat"),
    });
    assert.equal(r, "descargado");
    assert.deepEqual(pasos, ["descarga", "chat"]);
});
