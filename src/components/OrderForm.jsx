import Icon from "./Icon";
import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
    crearBorrador,
    nuevaPrenda,
    tiposPrenda,
    validarBorrador,
} from "../lib/orderDraft";
import { guardarPedido } from "../lib/orderRepository";
import {
    totalPrendas,
    subtotalPrenda,
    resumenPago,
    formatearDinero,
} from "../lib/orderTotals";
import { navegar } from "../lib/navigation";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import "../pages/OrderForm.css";

export default function OrderForm({ pedido, onBack, onSaved }) {
    const [inicial, setInicial] = useState(() => crearBorrador(pedido));
    const [datos, setDatos] = useState(inicial);
    const [errores, setErrores] = useState({});
    const [errorGuardado, setErrorGuardado] = useState("");
    const [guardando, setGuardando] = useState(false);
    const formulario = useRef(null);
    const enviando = useRef(false);
    const marcarGuardado = useUnsavedChanges(
        JSON.stringify(datos) !== JSON.stringify(inicial),
        guardando,
    );
    const total = totalPrendas(datos.prendas);
    const pago = resumenPago({
        pedido_prendas: datos.prendas,
        sena: datos.sena,
        pagado: datos.pagado,
    });
    const unidades = datos.prendas.reduce(
        (suma, p) => suma + (Number(p.cantidad) || 0),
        0,
    );

    function cambiar(campo, valor) {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actual) => ({ ...actual, [campo]: undefined }));
    }
    function cambiarPrenda(indice, campo, valor) {
        setDatos((actual) => ({
            ...actual,
            prendas: actual.prendas.map((p, i) =>
                i === indice ? { ...p, [campo]: valor } : p,
            ),
        }));
        setErrores((actual) => ({
            ...actual,
            [`prendas.${indice}.${campo}`]: undefined,
        }));
    }
    const ayudaError = (campo) =>
        errores[campo] ? (
            <small className="field-error" id={`error-${campo}`}>
                {errores[campo]}
            </small>
        ) : null;
    const accesibilidad = (campo) => ({
        "aria-invalid": Boolean(errores[campo]),
        "aria-describedby": errores[campo] ? `error-${campo}` : undefined,
    });

    async function guardar(event) {
        event.preventDefault();
        if (enviando.current) return;
        const validacion = validarBorrador(datos);
        setErrores(validacion);
        setErrorGuardado("");
        if (Object.keys(validacion).length) {
            requestAnimationFrame(() =>
                formulario.current
                    ?.querySelector('[aria-invalid="true"]')
                    ?.focus(),
            );
            return;
        }
        enviando.current = true;
        setGuardando(true);
        let resultado;
        try {
            resultado = await guardarPedido(supabase, datos, pedido);
        } catch (error) {
            console.error("Error guardando pedido:", error);
            if (error.campo) setErrores({ [error.campo]: error.message });
            setErrorGuardado(
                error.message ||
                    "No se pudo guardar. Tus datos siguen en el formulario.",
            );
            return;
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
        marcarGuardado();
        setInicial(datos);
        // Un error de refresco no debe volver a crear un pedido que ya se guardó.
        try {
            if (onSaved) await onSaved(resultado);
            else onBack?.();
        } catch {
            setErrorGuardado(
                "El pedido se guardó, pero no pudimos actualizar la vista. Volvé a Pedidos y reintentá la carga.",
            );
        }
    }

    return (
        <div className="new-order-page">
            <header className="page-header">
                <div>
                    <h1>{pedido ? "Editar pedido" : "Nuevo pedido"}</h1>
                    <p>
                        Todos los trabajos, importes y datos del cliente en un
                        solo lugar.
                    </p>
                </div>
                <button
                    type="button"
                    className="back-button"
                    disabled={guardando}
                    onClick={() => navegar(onBack)}
                >
                    ← Volver
                </button>
            </header>
            <form
                className="order-form"
                ref={formulario}
                onSubmit={guardar}
                noValidate
            >
                {errorGuardado && (
                    <div className="form-error-banner" role="alert">
                        {errorGuardado}
                    </div>
                )}
                <fieldset className="order-fields" disabled={guardando}>
                    <section className="form-section">
                        <h2><Icon name="user" /> Datos del cliente</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="cliente-nombre">
                                    Nombre del cliente
                                </label>
                                <input
                                    id="cliente-nombre"
                                    autoComplete="name"
                                    placeholder="Ej: Susana González"
                                    value={datos.nombre}
                                    onChange={(e) =>
                                        cambiar("nombre", e.target.value)
                                    }
                                    {...accesibilidad("nombre")}
                                />
                                {ayudaError("nombre")}
                            </div>
                            <div className="form-group">
                                <label htmlFor="cliente-telefono">
                                    Teléfono
                                </label>
                                <input
                                    id="cliente-telefono"
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="Ej: 11 1234-5678"
                                    value={datos.telefono}
                                    onChange={(e) =>
                                        cambiar("telefono", e.target.value)
                                    }
                                    {...accesibilidad("telefono")}
                                />
                                {ayudaError("telefono")}
                            </div>
                        </div>
                        <p className="section-help">
                            {pedido
                                ? "Los cambios de nombre y teléfono se aplican a todos los pedidos de este cliente."
                                : "Si el teléfono ya está registrado, se reutiliza el cliente existente."}
                        </p>
                    </section>
                    <section className="form-section">
                        <div className="form-section-heading">
                            <div>
                                <h2><Icon name="thread" /> Trabajos del pedido</h2>
                                <p className="section-help">
                                    Ingresá el precio de una unidad. La cantidad
                                    se multiplica automáticamente.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="new-order-button"
                                onClick={() =>
                                    cambiar("prendas", [
                                        ...datos.prendas,
                                        nuevaPrenda(),
                                    ])
                                }
                            >
                                <Icon name="plus" /> Agregar prenda
                            </button>
                        </div>
                        {ayudaError("prendas")}
                        <div className="garments-editor">
                            {datos.prendas.map((prenda, indice) => {
                                const campo = (nombre) =>
                                    `prendas.${indice}.${nombre}`;
                                return (
                                    <article
                                        className="garment-card"
                                        key={prenda.key}
                                    >
                                        <div className="garment-header">
                                            <strong>
                                                Trabajo {indice + 1}
                                            </strong>
                                            <button
                                                type="button"
                                                className="remove-garment-button"
                                                aria-label={`Eliminar trabajo ${indice + 1}`}
                                                disabled={
                                                    datos.prendas.length === 1
                                                }
                                                onClick={() => {
                                                    cambiar(
                                                        "prendas",
                                                        datos.prendas.filter(
                                                            (_, i) =>
                                                                i !== indice,
                                                        ),
                                                    );
                                                    setErrores({});
                                                }}
                                            >
                                                <Icon name="trash" />
                                            </button>
                                        </div>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label
                                                    htmlFor={`${prenda.key}-tipo`}
                                                >
                                                    Tipo de prenda
                                                </label>
                                                <select
                                                    id={`${prenda.key}-tipo`}
                                                    value={prenda.tipo_prenda}
                                                    onChange={(e) =>
                                                        cambiarPrenda(
                                                            indice,
                                                            "tipo_prenda",
                                                            e.target.value,
                                                        )
                                                    }
                                                    {...accesibilidad(
                                                        campo("tipo_prenda"),
                                                    )}
                                                >
                                                    <option value="">
                                                        Seleccionar prenda
                                                    </option>
                                                    {[
                                                        ...new Set([
                                                            ...tiposPrenda,
                                                            ...(prenda.tipo_prenda
                                                                ? [
                                                                      prenda.tipo_prenda,
                                                                  ]
                                                                : []),
                                                        ]),
                                                    ].map((tipo) => (
                                                        <option key={tipo}>
                                                            {tipo}
                                                        </option>
                                                    ))}
                                                </select>
                                                {ayudaError(
                                                    campo("tipo_prenda"),
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label
                                                    htmlFor={`${prenda.key}-cantidad`}
                                                >
                                                    Cantidad
                                                </label>
                                                <div className="quantity-control">
                                                    <button
                                                        type="button"
                                                        aria-label={`Quitar una unidad del trabajo ${indice + 1}`}
                                                        disabled={
                                                            Number(
                                                                prenda.cantidad,
                                                            ) <= 1
                                                        }
                                                        onClick={() =>
                                                            cambiarPrenda(
                                                                indice,
                                                                "cantidad",
                                                                String(
                                                                    Math.max(
                                                                        1,
                                                                        (Number(
                                                                            prenda.cantidad,
                                                                        ) ||
                                                                            1) -
                                                                            1,
                                                                    ),
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        id={`${prenda.key}-cantidad`}
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={prenda.cantidad}
                                                        onChange={(e) =>
                                                            cambiarPrenda(
                                                                indice,
                                                                "cantidad",
                                                                e.target.value,
                                                            )
                                                        }
                                                        {...accesibilidad(
                                                            campo("cantidad"),
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Agregar una unidad al trabajo ${indice + 1}`}
                                                        onClick={() =>
                                                            cambiarPrenda(
                                                                indice,
                                                                "cantidad",
                                                                String(
                                                                    (Number(
                                                                        prenda.cantidad,
                                                                    ) || 0) + 1,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                {ayudaError(campo("cantidad"))}
                                            </div>
                                        </div>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label
                                                    htmlFor={`${prenda.key}-descripcion`}
                                                >
                                                    Descripción del trabajo
                                                </label>
                                                <textarea
                                                    id={`${prenda.key}-descripcion`}
                                                    rows="3"
                                                    placeholder="Ej: Ajustar cintura..."
                                                    value={prenda.descripcion}
                                                    onChange={(e) =>
                                                        cambiarPrenda(
                                                            indice,
                                                            "descripcion",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label
                                                    htmlFor={`${prenda.key}-precio`}
                                                >
                                                    Precio por unidad
                                                </label>
                                                <input
                                                    id={`${prenda.key}-precio`}
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="$ 0"
                                                    value={prenda.precio}
                                                    onChange={(e) =>
                                                        cambiarPrenda(
                                                            indice,
                                                            "precio",
                                                            e.target.value,
                                                        )
                                                    }
                                                    {...accesibilidad(
                                                        campo("precio"),
                                                    )}
                                                />
                                                {ayudaError(campo("precio"))}
                                                <div
                                                    className="line-subtotal"
                                                    aria-live="polite"
                                                >
                                                    <span>
                                                        {prenda.cantidad || 0} ×{" "}
                                                        {formatearDinero(
                                                            prenda.precio,
                                                        )}{" "}
                                                        por unidad
                                                    </span>
                                                    <strong>
                                                        {formatearDinero(
                                                            subtotalPrenda(
                                                                prenda,
                                                            ),
                                                        )}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                    <section className="form-section">
                        <h2><Icon name="calendar" /> Entrega y estado</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="fecha-entrega">
                                    Fecha de entrega
                                </label>
                                <input
                                    id="fecha-entrega"
                                    type="date"
                                    value={datos.fecha_entrega}
                                    onChange={(e) =>
                                        cambiar("fecha_entrega", e.target.value)
                                    }
                                    {...accesibilidad("fecha_entrega")}
                                />
                                {ayudaError("fecha_entrega")}
                            </div>
                            <div className="form-group">
                                <label htmlFor="pedido-estado">
                                    Estado del pedido
                                </label>
                                <select
                                    id="pedido-estado"
                                    value={datos.estado}
                                    onChange={(e) =>
                                        cambiar("estado", e.target.value)
                                    }
                                >
                                    {[
                                        "Pendiente",
                                        "En proceso",
                                        "Listo",
                                        "Entregado",
                                    ].map((estado) => (
                                        <option key={estado}>{estado}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="pedido-prioridad">
                                    Prioridad
                                </label>
                                <select
                                    id="pedido-prioridad"
                                    value={datos.prioridad}
                                    onChange={(e) =>
                                        cambiar("prioridad", e.target.value)
                                    }
                                >
                                    <option>Normal</option>
                                    <option>Urgente</option>
                                </select>
                            </div>
                        </div>
                    </section>
                    <section className="form-section">
                        <h2><Icon name="wallet" /> Información de pago</h2>
                        <div className="payment-summary">
                            <div className="payment-summary-item">
                                <span>Total del pedido</span>
                                <strong>{formatearDinero(total)}</strong>
                            </div>
                            <div className="payment-summary-item">
                                <label htmlFor="pedido-sena">Seña</label>
                                <input
                                    id="pedido-sena"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    disabled={datos.pagado}
                                    value={datos.pagado ? total : datos.sena}
                                    onChange={(e) =>
                                        cambiar("sena", e.target.value)
                                    }
                                    {...accesibilidad("sena")}
                                />
                                {ayudaError("sena")}
                            </div>
                            <div className="payment-summary-item">
                                <span>Saldo pendiente</span>
                                <strong
                                    className={
                                        pago.saldo > 0
                                            ? "saldo-pendiente"
                                            : "saldo-pagado"
                                    }
                                >
                                    {formatearDinero(pago.saldo)}
                                </strong>
                            </div>
                        </div>
                        <div className="payment-status-container">
                            <span className="payment-status-label">
                                Estado del pago
                            </span>
                            <div className="payment-status-options">
                                <button
                                    type="button"
                                    aria-pressed={!datos.pagado}
                                    className={`payment-status-button pending ${!datos.pagado ? "active" : ""}`}
                                    onClick={() => cambiar("pagado", false)}
                                >
                                    <Icon name="clock" /> Pago pendiente
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={datos.pagado}
                                    className={`payment-status-button paid ${datos.pagado ? "active" : ""}`}
                                    onClick={() => cambiar("pagado", true)}
                                >
                                    <Icon name="checkCircle" /> Pagado
                                </button>
                            </div>
                            <small className="payment-status-help">
                                El pago es independiente del estado del trabajo.
                            </small>
                        </div>
                    </section>
                    <section className="form-section">
                        <h2><Icon name="note" /> Notas</h2>
                        <div className="form-group">
                            <label htmlFor="pedido-notas">
                                Notas generales
                            </label>
                            <textarea
                                id="pedido-notas"
                                rows="3"
                                value={datos.notas}
                                placeholder="Cualquier detalle importante..."
                                onChange={(e) =>
                                    cambiar("notas", e.target.value)
                                }
                            />
                        </div>
                    </section>
                </fieldset>
                <div className="form-actions">
                    <div className="form-total" aria-live="polite">
                        <span>
                            Total · {unidades}{" "}
                            {unidades === 1 ? "unidad" : "unidades"}
                        </span>
                        <strong>{formatearDinero(total)}</strong>
                    </div>
                    <button
                        type="button"
                        className="cancel-button"
                        disabled={guardando}
                        onClick={() => navegar(onBack)}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="save-button"
                        disabled={guardando}
                    >
                        {guardando
                            ? "Guardando…"
                            : pedido
                              ? "✓ Guardar cambios"
                              : "✓ Crear pedido"}
                    </button>
                </div>
            </form>
        </div>
    );
}
