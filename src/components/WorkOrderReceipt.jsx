import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWorkOrder } from "../context/WorkOrderContext";
import { useWorkshopSettings } from "../hooks/useWorkshopSettings";
import {
    crearBoleta,
    nombreArchivoBoleta,
    mensajeBoleta,
} from "../lib/workOrder";
import { enlaceWhatsapp } from "../lib/whatsapp";
import {
    compartirImagenBoleta,
    descargarImagenBoleta,
} from "../lib/workOrderShare";
import { formatearDinero as dinero } from "../lib/orderTotals";
import Icon from "./Icon";
import logo from "../assets/mhome-logo.jpg";
import "./WorkOrderReceipt.css";

function Leaves({ className }) {
    return (
        <svg
            className={className}
            width="210"
            height="250"
            viewBox="0 0 210 250"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M25 238C70 171 105 89 177 15"
                stroke="#68785c"
                strokeWidth="2"
            />
            {[
                [35, 214, -35],
                [65, 170, -25],
                [95, 125, -20],
                [130, 78, -15],
                [155, 45, -12],
            ].map(([x, y, r], i) => (
                <g key={x} transform={`translate(${x} ${y}) rotate(${r})`}>
                    <path
                        d="M0 0C-40-8-61-32-59-63C-26-57-5-34 0 0Z"
                        fill={i % 2 ? "#a4b196" : "#8f9f80"}
                        stroke="#68785c"
                        strokeWidth="1.3"
                    />
                    <path d="M-2-3L-50-54" stroke="#68785c" />
                    <path
                        d="M6-6C13-46 37-65 61-63C57-29 34-7 6-6Z"
                        fill="#b8c4a8"
                        stroke="#68785c"
                        strokeWidth="1.3"
                    />
                    <path d="M10-10L53-55" stroke="#68785c" />
                </g>
            ))}
        </svg>
    );
}

export default function WorkOrderReceipt() {
    const { boleta, cerrarBoleta } = useWorkOrder();
    if (!boleta) return null;
    return createPortal(
        <Receipt
            key={`${boleta.pedido.id}-${boleta.emision.getTime()}`}
            boleta={boleta}
            onClose={cerrarBoleta}
        />,
        document.body,
    );
}

function Receipt({ boleta, onClose }) {
    const configuracion = useWorkshopSettings();
    const modelo = useMemo(() => crearBoleta(boleta.pedido), [boleta.pedido]);
    const [direccion, setDireccion] = useState(modelo.direccion);
    const [observaciones, setObservaciones] = useState(modelo.observaciones);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [error, setError] = useState("");
    const dialogo = useRef(null);
    const exportacion = useRef(null);
    const [imagen, setImagen] = useState(null);
    const [falloImagen, setFalloImagen] = useState(null);
    const [compartiendo, setCompartiendo] = useState(false);
    const envioEnCurso = useRef(false);
    const [avisoCompartir, setAvisoCompartir] = useState("");
    const claveImagen = JSON.stringify([
        direccion,
        observaciones,
        configuracion.telefono,
        configuracion.instagram,
    ]);
    const imagenLista = imagen?.clave === claveImagen;
    const errorImagen =
        falloImagen?.clave === claveImagen ? falloImagen.texto : "";
    const mensaje = mensajeBoleta(modelo.nombre, configuracion);
    const enlace = enlaceWhatsapp(boleta.pedido, configuracion, mensaje);
    const archivo = nombreArchivoBoleta(modelo.nombre, boleta.emision);
    useEffect(() => {
        let vigente = true;
        const timer = window.setTimeout(async () => {
            try {
                const nodo = exportacion.current;
                await document.fonts.ready;
                await Promise.all(
                    Array.from(nodo.querySelectorAll("img")).map((img) =>
                        img.decode(),
                    ),
                );
                const { toBlob } = await import("html-to-image");
                const ancho = 794;
                const alto = Math.ceil(nodo.getBoundingClientRect().height);
                const blob = await toBlob(nodo, {
                    width: ancho,
                    height: alto,
                    pixelRatio: Math.min(
                        2,
                        Math.sqrt(12000000 / (ancho * alto)),
                    ),
                    backgroundColor: "#fffdf7",
                    fontEmbedCSS: "",
                    skipAutoScale: false,
                });
                if (!blob) throw new Error("Sin imagen");
                if (vigente) setImagen({ clave: claveImagen, blob });
            } catch {
                if (vigente)
                    setFalloImagen({
                        clave: claveImagen,
                        texto: "No pudimos generar la imagen. Cerrá y volvé a abrir la boleta para reintentar. También podés imprimirla.",
                    });
            }
        }, 250);
        return () => {
            vigente = false;
            window.clearTimeout(timer);
        };
    }, [
        claveImagen,
        direccion,
        observaciones,
        configuracion.telefono,
        configuracion.instagram,
    ]);
    async function enviar() {
        if (!imagenLista || !enlace || envioEnCurso.current) return;
        envioEnCurso.current = true;
        setCompartiendo(true);
        setAvisoCompartir("");
        try {
            await compartirImagenBoleta({
                blob: imagen.blob,
                nombre: archivo,
                enlace,
            });
            setAvisoCompartir(
                `Imagen descargada. Adjuntala en el chat de ${modelo.nombre} y confirmá el envío. Si el chat no se abrió, usá el enlace de abajo.`,
            );
        } catch {
            setAvisoCompartir(
                "No pudimos completar la apertura del envío. Usá Descargar imagen y el enlace al chat para adjuntarla.",
            );
        } finally {
            envioEnCurso.current = false;
            setCompartiendo(false);
        }
    }
    const fecha = boleta.emision.toLocaleDateString("es-AR");
    useEffect(() => {
        const nodo = dialogo.current;
        const tituloAnterior = document.title;
        document.title = `Orden de trabajo - ${modelo.nombre} - Mhome`;
        document.body.classList.add("work-order-open");
        nodo.showModal();
        nodo.querySelector("h2")?.focus({ preventScroll: true });
        return () => {
            nodo.close();
            document.body.classList.remove("work-order-open");
            document.title = tituloAnterior;
        };
    }, [modelo.nombre]);
    async function imprimir() {
        setImprimiendo(true);
        setError("");
        try {
            await document.fonts.ready;
            await Promise.all(
                Array.from(dialogo.current.querySelectorAll("img")).map((img) =>
                    img.decode(),
                ),
            );
            window.print();
        } catch {
            setError(
                "No pudimos abrir la impresión. Volvé a intentar desde el menú Imprimir de tu navegador.",
            );
        } finally {
            setImprimiendo(false);
        }
    }
    return (
        <dialog
            ref={dialogo}
            className="work-order-dialog"
            aria-labelledby="work-order-preview-title"
            onCancel={(e) => {
                e.preventDefault();
                if (!imprimiendo && !compartiendo) onClose();
            }}
        >
            <div className="work-order-toolbar">
                <div>
                    <h2 id="work-order-preview-title" tabIndex="-1">
                        Boleta del trabajo
                    </h2>
                    <p>
                        El pedido está guardado. Revisá la boleta y compartí su
                        imagen con el cliente.
                    </p>
                </div>
                <div className="work-order-toolbar-actions">
                    <button
                        type="button"
                        className="receipt-share-button"
                        disabled={!imagenLista || !enlace || compartiendo}
                        onClick={enviar}
                    >
                        <Icon name="whatsapp" />
                        {compartiendo
                            ? "Abriendo…"
                            : imagenLista
                              ? "Enviar por WhatsApp"
                              : errorImagen
                                ? "Imagen no disponible"
                                : "Preparando imagen…"}
                    </button>
                    <button
                        type="button"
                        className="receipt-download-button"
                        disabled={!imagenLista || compartiendo}
                        onClick={() =>
                            descargarImagenBoleta(imagen.blob, archivo)
                        }
                    >
                        Descargar imagen
                    </button>
                    <button
                        type="button"
                        className="receipt-print-button"
                        disabled={imprimiendo || compartiendo}
                        onClick={imprimir}
                    >
                        <Icon name="orders" />
                        {imprimiendo ? "Preparando…" : "Imprimir / Guardar PDF"}
                    </button>
                    <button
                        type="button"
                        className="receipt-close-button"
                        disabled={imprimiendo || compartiendo}
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
            <div className="receipt-send-help">
                <p>
                    <strong>Para: {modelo.nombre}</strong> · {modelo.telefono}.
                    Al enviar se abre el chat de este número con el mensaje
                    preparado: WhatsApp Web en la PC o WhatsApp en el celular.
                    Se descarga la boleta para que la adjuntes en ese chat y
                    confirmes el envío.
                </p>
                {!enlace && (
                    <p className="receipt-error">
                        El cliente no tiene un teléfono válido. Corregilo desde
                        Editar pedido para abrir su chat.
                    </p>
                )}
                {avisoCompartir && <p role="status">{avisoCompartir}</p>}
                {enlace && (
                    <a href={enlace} target="_blank" rel="noreferrer">
                        Abrir chat de {modelo.nombre}
                    </a>
                )}
                {errorImagen && (
                    <p className="receipt-error" role="alert">
                        {errorImagen}
                    </p>
                )}
            </div>
            <details className="work-order-editor">
                <summary>Completar dirección o ajustar observaciones</summary>
                <div>
                    <label htmlFor="receipt-address">
                        Dirección del cliente (opcional)
                    </label>
                    <input
                        id="receipt-address"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        autoComplete="street-address"
                        placeholder="Dirección para esta boleta"
                    />
                    <label htmlFor="receipt-notes">
                        Observaciones de la boleta
                    </label>
                    <textarea
                        id="receipt-notes"
                        rows="3"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                    />
                    <p>
                        Estos cambios se usan solo en esta boleta. Los datos de
                        contacto del taller se cambian en Configuración.
                    </p>
                </div>
            </details>
            {error && (
                <p className="receipt-error" role="alert">
                    {error}
                </p>
            )}
            <div className="work-order-paper-scroll">
                <ReceiptDocument
                    modelo={modelo}
                    direccion={direccion}
                    observaciones={observaciones}
                    configuracion={configuracion}
                    fecha={fecha}
                />
            </div>
            <div className="receipt-export-wrapper" aria-hidden="true">
                <div ref={exportacion} className="receipt-export-node">
                    <ReceiptDocument
                        modelo={modelo}
                        direccion={direccion}
                        observaciones={observaciones}
                        configuracion={configuracion}
                        fecha={fecha}
                    />
                </div>
            </div>
        </dialog>
    );
}

function ReceiptDocument({
    modelo,
    direccion,
    observaciones,
    configuracion,
    fecha,
}) {
    return (
        <article
            className="work-order-document"
            aria-label="Orden de trabajo para imprimir"
        >
            <div className="receipt-decoration receipt-decoration-top">
                <Leaves className="receipt-leaves" />
            </div>
            <div className="receipt-decoration receipt-decoration-bottom">
                <Leaves className="receipt-leaves" />
            </div>
            <div className="receipt-content">
                <div className="receipt-document-type">
                    <span>X</span>
                    <p>
                        DOCUMENTO NO VÁLIDO
                        <br />
                        COMO FACTURA
                    </p>
                </div>
                <header className="receipt-header">
                    <div className="receipt-brand">
                        <img src={logo} alt="Mhome" width="115" height="105" />
                        <p>Mariana</p>
                    </div>
                    <h1>
                        ORDEN DE
                        <br />
                        TRABAJO
                    </h1>
                    <div className="receipt-date">
                        <span>Fecha de emisión</span>
                        <strong>{fecha}</strong>
                    </div>
                </header>
                <section
                    className="receipt-customer"
                    aria-label="Datos del cliente"
                >
                    <h3>DATOS DEL CLIENTE</h3>
                    <dl>
                        <div>
                            <dt>Nombre</dt>
                            <dd>{modelo.nombre}</dd>
                        </div>
                        <div>
                            <dt>Teléfono</dt>
                            <dd>{modelo.telefono}</dd>
                        </div>
                        <div>
                            <dt>Dirección</dt>
                            <dd>{direccion || "\u00a0"}</dd>
                        </div>
                    </dl>
                </section>
                <table className="receipt-items">
                    <colgroup>
                        <col className="receipt-col-qty" />
                        <col />
                        <col className="receipt-col-price" />
                        <col className="receipt-col-price" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th scope="col">Cant.</th>
                            <th scope="col">
                                Descripción del trabajo / producto
                            </th>
                            <th scope="col">Precio unit.</th>
                            <th scope="col">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modelo.filas.map((fila, i) => (
                            <tr key={i}>
                                <td>{fila.cantidad}</td>
                                <td>{fila.descripcion}</td>
                                <td>{dinero(fila.precio)}</td>
                                <td>{dinero(fila.subtotal)}</td>
                            </tr>
                        ))}
                        {Array.from(
                            {
                                length: Math.max(0, 7 - modelo.filas.length),
                            },
                            (_, i) => (
                                <tr
                                    className="receipt-empty-row"
                                    key={`empty-${i}`}
                                    aria-hidden="true"
                                >
                                    <td>&nbsp;</td>
                                    <td />
                                    <td />
                                    <td />
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
                <div className="receipt-bottom">
                    <section className="receipt-observations">
                        <h3>Observaciones</h3>
                        <p>{observaciones || "Sin observaciones."}</p>
                    </section>
                    <dl className="receipt-totals">
                        <div>
                            <dt>Fecha de entrega</dt>
                            <dd>{modelo.entrega}</dd>
                        </div>
                        <div>
                            <dt>Total</dt>
                            <dd>{dinero(modelo.total)}</dd>
                        </div>
                        <div>
                            <dt>Seña / pagos</dt>
                            <dd>{dinero(modelo.sena)}</dd>
                        </div>
                        <div className="receipt-balance">
                            <dt>Saldo restante</dt>
                            <dd>{dinero(modelo.saldo)}</dd>
                        </div>
                    </dl>
                </div>
                <footer className="receipt-footer">
                    <span className="receipt-thanks">¡Muchas gracias!</span>
                    <div className="receipt-contacts">
                        {configuracion.telefono && (
                            <p>
                                <Icon name="whatsapp" size="20" />
                                <span>{configuracion.telefono}</span>
                            </p>
                        )}
                        {configuracion.instagram && (
                            <p>
                                <Icon name="instagram" size="20" />
                                <span>@{configuracion.instagram}</span>
                            </p>
                        )}
                    </div>
                </footer>
            </div>
        </article>
    );
}
