
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { totalPedido, resumenPago, subtotalPrenda, formatearDinero } from "../lib/orderTotals";
import "./OrderForm.css";

function EditOrder(props) {
    return <EditOrderForm key={props.pedido?.id} {...props} />;
}

function EditOrderForm({ pedido, onBack, onSaved }) {
    // =====================================================
    // DATOS DEL PEDIDO
    // =====================================================

    const [tipoPrenda, setTipoPrenda] = useState(
        pedido?.tipo_prenda || ""
    );

    const [fechaEntrega, setFechaEntrega] = useState(
        pedido?.fecha_entrega || ""
    );

    const [descripcion, setDescripcion] = useState(
        pedido?.descripcion || ""
    );

    const [sena, setSena] = useState(
        pedido?.sena ?? ""
    );

    const [estado, setEstado] = useState(
        pedido?.estado || "En proceso"
    );

    const [prioridad, setPrioridad] = useState(
        pedido?.prioridad || "Normal"
    );

    const [notas, setNotas] = useState(
        pedido?.notas || ""
    );

    // =====================================================
    // PAGO
    // =====================================================

    const [pagado, setPagado] = useState(
        Boolean(pedido?.pagado)
    );

    // =====================================================
    // GUARDANDO
    // =====================================================

    const [guardando, setGuardando] = useState(false);

    const precioNumerico = totalPedido(pedido);
    const { sena: senaNumerica, saldo: saldoPendiente } = resumenPago({ ...pedido, sena, pagado });

    const cambiarEstadoPago = (nuevoEstado) => {
        setPagado(nuevoEstado === "pagado");
    };

    // =====================================================
    // GUARDAR CAMBIOS
    // =====================================================

    const guardarCambios = async (e) => {
        e.preventDefault();

        if (guardando) {
            return;
        }

        // =================================================
        // VALIDACIONES
        // =================================================

        if (!tipoPrenda) {
            alert(
                "Seleccioná el tipo de prenda."
            );
            return;
        }

        if (!fechaEntrega) {
            alert(
                "Seleccioná la fecha de entrega."
            );
            return;
        }

        if (precioNumerico < 0) {
            alert(
                "El precio no puede ser negativo."
            );
            return;
        }

        const senaFinal = pagado
            ? precioNumerico
            : senaNumerica;

        if (senaFinal < 0) {
            alert(
                "La seña no puede ser negativa."
            );
            return;
        }

        if (senaFinal > precioNumerico) {
            alert(
                "La seña no puede ser mayor al precio total."
            );
            return;
        }

        setGuardando(true);

        const {
            data,
            error,
        } = await supabase
            .from("pedidos")
            .update({
                tipo_prenda:
                    tipoPrenda,

                fecha_entrega:
                    fechaEntrega,

                descripcion:
                    descripcion.trim(),

                precio:
                    precioNumerico,

                sena:
                    senaFinal,

                estado:
                    estado,

                prioridad:
                    prioridad,

                notas:
                    notas.trim(),

                pagado:
                    pagado,
            })
            .eq(
                "id",
                pedido.id
            )
            .select(`
                id,
                tipo_prenda,
                descripcion,
                fecha_entrega,
                precio,
                sena,
                estado,
                prioridad,
                notas,
                pagado,
                clientes (
                    id,
                    nombre,
                    telefono
                ),
                pedido_prendas (
                    id,
                    tipo_prenda,
                    cantidad,
                    descripcion,
                    precio
                )
            `)
            .single();

        if (error) {
            console.error(
                "Error actualizando pedido:",
                error
            );

            alert(
                "No se pudo guardar el pedido.\n\n" +
                    error.message
            );

            setGuardando(false);
            return;
        }

        alert(
            pagado
                ? "¡Pedido actualizado y marcado como pagado! 💚"
                : "¡Pedido actualizado correctamente! 🧵❤️"
        );

        setGuardando(false);

        if (onSaved) {
            await onSaved(data);
            return;
        }

        if (onBack) {
            onBack();
        }
    };

    // =====================================================
    // CANCELAR
    // =====================================================

    const cancelar = () => {
        if (guardando) {
            return;
        }

        if (onBack) {
            onBack();
        }
    };

    // =====================================================
    // INTERFAZ
    // =====================================================

    return (
        <div className="new-order-page">

            {/* =================================================
                ENCABEZADO
            ================================================= */}

            <div className="page-header">

                <div>
                    <h1>
                        Editar pedido ✏️
                    </h1>

                    <p>
                        Modificá los datos del trabajo.
                    </p>
                </div>

                <button
                    type="button"
                    className="back-button"
                    onClick={cancelar}
                    disabled={guardando}
                >
                    ← Volver
                </button>

            </div>

            <form
                className="order-form"
                onSubmit={guardarCambios}
            >

                {/* =================================================
                    CLIENTE
                ================================================= */}

                <div className="form-section">

                    <h2>
                        👤 Datos del cliente
                    </h2>

                    <div className="form-grid">

                        <div className="form-group">

                            <label>
                                Nombre del cliente
                            </label>

                            <input
                                type="text"
                                value={
                                    pedido?.clientes?.nombre ||
                                    ""
                                }
                                disabled
                            />

                        </div>

                        <div className="form-group">

                            <label>
                                Teléfono
                            </label>

                            <input
                                type="tel"
                                value={
                                    pedido?.clientes?.telefono ||
                                    ""
                                }
                                disabled
                            />

                        </div>

                    </div>

                    <small className="form-help">
                        Los datos del cliente los vamos a
                        poder editar desde la sección Clientes.
                    </small>

                </div>

                {/* =================================================
                    DATOS PEDIDO
                ================================================= */}

                <div className="form-section">

                    <h2>
                        🧵 Datos del pedido
                    </h2>

                    <div className="form-grid">

                        <div className="form-group">

                            <label>
                                Tipo de prenda
                            </label>

                            <select
                                value={tipoPrenda}
                                onChange={(e) =>
                                    setTipoPrenda(
                                        e.target.value
                                    )
                                }
                                disabled={guardando}
                                required
                            >

                                <option value="">
                                    Seleccionar prenda
                                </option>

                                <option value="Vestido">
                                    👗 Vestido
                                </option>

                                <option value="Pantalón">
                                    👖 Pantalón
                                </option>

                                <option value="Blusa">
                                    👚 Blusa
                                </option>

                                <option value="Camisa">
                                    👔 Camisa
                                </option>

                                <option value="Saco">
                                    🧥 Saco
                                </option>

                                <option value="Falda">
                                    👗 Falda
                                </option>

                                <option value="Otro">
                                    🧵 Otro
                                </option>

                            </select>

                        </div>

                        <div className="form-group">

                            <label>
                                Fecha de entrega
                            </label>

                            <input
                                type="date"
                                value={fechaEntrega}
                                onChange={(e) =>
                                    setFechaEntrega(
                                        e.target.value
                                    )
                                }
                                disabled={guardando}
                                required
                            />

                        </div>

                    </div>

                    <div className="form-group">

                        <label>
                            Descripción del trabajo
                        </label>

                        <textarea
                            rows="4"
                            value={descripcion}
                            onChange={(e) =>
                                setDescripcion(
                                    e.target.value
                                )
                            }
                            placeholder="Ej: Ajustar cintura y acortar 5 cm..."
                            disabled={guardando}
                        />

                    </div>

                </div>

                {/* =================================================
                    INFORMACIÓN DE PAGO
                ================================================= */}

                <div className="form-section">

                    <h2>
                        💰 Información de pago
                    </h2>

                    {pedido.pedido_prendas?.length > 0 && (
                        <div className="payment-breakdown">
                            {pedido.pedido_prendas.map((prenda) => (
                                <div key={prenda.id}>
                                    <span>{prenda.tipo_prenda} · {prenda.cantidad} × {formatearDinero(prenda.precio)}</span>
                                    <strong>{formatearDinero(subtotalPrenda(prenda))}</strong>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TOTAL / SEÑA / SALDO */}

                    <div className="payment-summary">

                        <div className="payment-summary-item">

                            <span>
                                Total del pedido
                            </span>

                            <strong>
                                $
                                {precioNumerico.toLocaleString(
                                    "es-AR"
                                )}
                            </strong>

                        </div>

                        <div className="payment-summary-item">

                            <span>
                                Seña
                            </span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pagado ? precioNumerico : sena}
                                onChange={(e) => {
                                    const valor =
                                        e.target.value;

                                    setSena(valor);

                                    if (
                                        Number(valor) <
                                        precioNumerico
                                    ) {
                                        setPagado(false);
                                    }
                                }}
                                disabled={
                                    guardando ||
                                    pagado
                                }
                            />

                        </div>

                        <div className="payment-summary-item">

                            <span>
                                Saldo pendiente
                            </span>

                            <strong
                                className={
                                    saldoPendiente > 0
                                        ? "saldo-pendiente"
                                        : "saldo-pagado"
                                }
                            >
                                $
                                {saldoPendiente.toLocaleString(
                                    "es-AR"
                                )}
                            </strong>

                        </div>

                    </div>

                    {/* =================================================
                        ESTADO DEL PAGO
                    ================================================= */}

                    <div className="payment-status-container">

                        <span className="payment-status-label">
                            Estado del pago
                        </span>

                        <div className="payment-status-options">

                            <button
                                type="button"
                                className={
                                    pagado
                                        ? "payment-status-button pending"
                                        : "payment-status-button pending active"
                                }
                                onClick={() =>
                                    cambiarEstadoPago(
                                        "pendiente"
                                    )
                                }
                                disabled={guardando}
                            >
                                ⏳ Pago pendiente
                            </button>

                            <button
                                type="button"
                                className={
                                    pagado
                                        ? "payment-status-button paid active"
                                        : "payment-status-button paid"
                                }
                                onClick={() =>
                                    cambiarEstadoPago(
                                        "pagado"
                                    )
                                }
                                disabled={guardando}
                            >
                                ✅ Pagado
                            </button>

                        </div>

                        <small className="payment-status-help">
                            El pago es independiente del
                            estado del trabajo.
                        </small>

                    </div>

                </div>

                {/* =================================================
                    ESTADO DEL PEDIDO
                ================================================= */}

                <div className="form-section">

                    <h2>
                        📌 Estado del pedido
                    </h2>

                    <div className="form-grid">

                        <div className="form-group">

                            <label>
                                Estado
                            </label>

                            <select
                                value={estado}
                                onChange={(e) =>
                                    setEstado(
                                        e.target.value
                                    )
                                }
                                disabled={guardando}
                            >

                                <option value="En proceso">
                                    🟡 En proceso
                                </option>

                                <option value="Listo">
                                    🟢 Listo
                                </option>

                                <option value="Entregado">
                                    ⚪ Entregado
                                </option>

                            </select>

                        </div>

                        <div className="form-group">

                            <label>
                                Prioridad
                            </label>

                            <select
                                value={prioridad}
                                onChange={(e) =>
                                    setPrioridad(
                                        e.target.value
                                    )
                                }
                                disabled={guardando}
                            >

                                <option value="Normal">
                                    🟢 Normal
                                </option>

                                <option value="Urgente">
                                    🔴 Urgente
                                </option>

                            </select>

                        </div>

                    </div>

                    <div className="form-group">

                        <label>
                            Notas
                        </label>

                        <textarea
                            rows="3"
                            value={notas}
                            onChange={(e) =>
                                setNotas(
                                    e.target.value
                                )
                            }
                            placeholder="Cualquier detalle importante..."
                            disabled={guardando}
                        />

                    </div>

                </div>

                {/* =================================================
                    BOTONES
                ================================================= */}

                <div className="form-actions">

                    <button
                        type="button"
                        className="cancel-button"
                        onClick={cancelar}
                        disabled={guardando}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="save-button"
                        disabled={guardando}
                    >
                        {guardando
                            ? "Guardando..."
                            : "✓ Guardar cambios"}
                    </button>

                </div>

            </form>

        </div>
    );
}

export default EditOrder;

