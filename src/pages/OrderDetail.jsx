import Icon, { GarmentIcon } from "../components/Icon";
import { useState } from "react";
import { resumenPago, subtotalPrenda } from "../lib/orderTotals";

import EditOrder from "./EditOrder";

import "./OrderDetail.css";

function OrderDetail({
    pedido,
    onBack,
    onSaved,
}) {
    const [editando, setEditando] =
        useState(false);

    const [pedidoActual, setPedidoActual] =
        useState(pedido);

    if (!pedidoActual) {
        return (
            <div className="order-detail-page">
                <div className="detail-topbar">
                    <button
                        className="detail-back-button"
                        onClick={onBack}
                    >
                        ← Volver a pedidos
                    </button>
                </div>

                <div className="detail-empty-card">
                    <div className="detail-empty-icon">
                        <Icon name="orders" />
                    </div>

                    <h2>
                        Pedido no encontrado
                    </h2>

                    <p>
                        No pudimos encontrar la información
                        de este pedido.
                    </p>
                </div>
            </div>
        );
    }

    if (editando) {
        return (
            <EditOrder
                pedido={pedidoActual}
                onBack={() =>
                    setEditando(false)
                }
                onSaved={async (
                    pedidoActualizado
                ) => {
                    setPedidoActual(
                        pedidoActualizado
                    );

                    setEditando(false);

                    if (onSaved) {
                        await onSaved(
                            pedidoActualizado
                        );
                    }
                }}
            />
        );
    }

    const cliente =
        pedidoActual.clientes;

    const prendas =
        pedidoActual.pedido_prendas || [];

    const { total: precio, sena, saldo } = resumenPago(pedidoActual);

    const formatearFecha = (
        fecha
    ) => {
        if (!fecha) {
            return "Sin fecha";
        }

        const partes =
            fecha.split("-");

        if (
            partes.length !== 3
        ) {
            return fecha;
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const formatearDinero = (
        valor
    ) => {
        return `$${Number(
            valor || 0
        ).toLocaleString(
            "es-AR"
        )}`;
    };

    const obtenerIcono = (tipo) => <GarmentIcon tipo={tipo} />;

    const obtenerTextoEstado = () => {
        if (
            pedidoActual.estado ===
            "Listo"
        ) {
            return "Listo";
        }

        if (
            pedidoActual.estado ===
            "Entregado"
        ) {
            return "Entregado";
        }

        if (
            pedidoActual.estado ===
            "Pendiente"
        ) {
            return "Pendiente";
        }

        return "En proceso";
    };

    const obtenerClaseEstado = () => {
        if (
            pedidoActual.estado ===
            "Listo"
        ) {
            return "detail-status-ready";
        }

        if (
            pedidoActual.estado ===
            "Entregado"
        ) {
            return "detail-status-delivered";
        }

        return "detail-status-process";
    };

    const totalUnidades =
        prendas.reduce(
            (total, prenda) =>
                total +
                (Number(
                    prenda.cantidad
                ) || 0),
            0
        );

    return (
        <div className="order-detail-page">

            {/* =================================================
                BARRA SUPERIOR
            ================================================= */}

            <div className="detail-topbar">

                <button
                    className="detail-back-button"
                    onClick={onBack}
                >
                    ← Volver a pedidos
                </button>

                <button
                    className="detail-edit-button"
                    onClick={() =>
                        setEditando(true)
                    }
                >
                    <Icon name="edit" /> Editar pedido
                </button>

            </div>

            {/* =================================================
                HERO DEL PEDIDO
            ================================================= */}

            <section className="detail-hero">

                <div className="detail-hero-left">

                    <div className="detail-hero-icon">
                        {obtenerIcono(
                            prendas[0]
                                ?.tipo_prenda ||
                            pedidoActual.tipo_prenda
                        )}
                    </div>

                    <div>

                        <div className="detail-eyebrow">
                            PEDIDO #{pedidoActual.id}
                        </div>

                        <h1>
                            Pedido de{" "}
                            {cliente?.nombre ||
                                "cliente"}
                        </h1>

                        <p>
                            {prendas.length > 0
                                ? `${prendas.length} ${
                                      prendas.length ===
                                      1
                                          ? "tipo de trabajo"
                                          : "tipos de trabajo"
                                  } · ${totalUnidades} ${
                                      totalUnidades ===
                                      1
                                          ? "prenda"
                                          : "prendas"
                                  }`
                                : "Trabajo registrado"}
                        </p>

                    </div>

                </div>

                <div
                    className={`detail-hero-status ${obtenerClaseEstado()}`}
                >
                    {obtenerTextoEstado()}
                </div>

            </section>

            {/* =================================================
                INFORMACIÓN RÁPIDA
            ================================================= */}

            <section className="detail-summary-grid">

                <div className="detail-summary-card">

                    <div className="detail-summary-icon">
                        <Icon name="user" />
                    </div>

                    <div>

                        <span>
                            Cliente
                        </span>

                        <strong>
                            {cliente?.nombre ||
                                "Sin cliente"}
                        </strong>

                        <small>
                            <Icon name="phone" />{" "}
                            {cliente?.telefono ||
                                "Sin teléfono"}
                        </small>

                    </div>

                </div>

                <div className="detail-summary-card">

                    <div className="detail-summary-icon">
                        <Icon name="calendar" />
                    </div>

                    <div>

                        <span>
                            Entrega
                        </span>

                        <strong>
                            {formatearFecha(
                                pedidoActual.fecha_entrega
                            )}
                        </strong>

                        <small>
                            Fecha programada
                        </small>

                    </div>

                </div>

                <div className="detail-summary-card">

                    <div className="detail-summary-icon">
                        <Icon name="wallet" />
                    </div>

                    <div>

                        <span>
                            Total
                        </span>

                        <strong>
                            {formatearDinero(
                                precio
                            )}
                        </strong>

                        <small
                            className={
                                saldo > 0
                                    ? "detail-pending-text"
                                    : "detail-paid-text"
                            }
                        >
                            {saldo > 0
                                ? `Saldo ${formatearDinero(
                                      saldo
                                  )}`
                                : "Pago completo"}
                        </small>

                    </div>

                </div>

                <div className="detail-summary-card">

                    <div className="detail-summary-icon">
                        {pedidoActual.prioridad ===
                        "Urgente"
                            ? <Icon name="alert" />
                            : <Icon name="checkCircle" />}
                    </div>

                    <div>

                        <span>
                            Prioridad
                        </span>

                        <strong>
                            {pedidoActual.prioridad ===
                            "Urgente"
                                ? "Urgente"
                                : "Normal"}
                        </strong>

                        <small>
                            Atención del pedido
                        </small>

                    </div>

                </div>

            </section>

            {/* =================================================
                CONTENIDO
            ================================================= */}

            <div className="detail-content-grid">

                {/* =============================================
                    TRABAJOS
                ============================================= */}

                <section className="detail-panel detail-panel-main">

                    <div className="detail-panel-header">

                        <div>

                            <h2>
                                <Icon name="thread" /> Trabajos del pedido
                            </h2>

                            <p>
                                Todo lo que hay que
                                realizar para esta clienta.
                            </p>

                        </div>

                        <div className="detail-count-badge">
                            {prendas.length > 0
                                ? `${prendas.length} ${
                                      prendas.length ===
                                      1
                                          ? "trabajo"
                                          : "trabajos"
                                  }`
                                : "1 trabajo"}
                        </div>

                    </div>

                    {prendas.length > 0 ? (

                        <div className="detail-garments">

                            {prendas.map(
                                (
                                    prenda,
                                    index
                                ) => (

                                    <article
                                        className="detail-garment-card"
                                        key={
                                            prenda.id
                                        }
                                    >

                                        <div className="detail-garment-number">
                                            {index +
                                                1}
                                        </div>

                                        <div className="detail-garment-icon">
                                            {obtenerIcono(
                                                prenda.tipo_prenda
                                            )}
                                        </div>

                                        <div className="detail-garment-body">

                                            <div className="detail-garment-heading">

                                                <div>

                                                    <h3>
                                                        {
                                                            prenda.tipo_prenda
                                                        }
                                                    </h3>

                                                    <span>
                                                        Cantidad{" "}
                                                        <strong>
                                                            {prenda.cantidad}
                                                        </strong>
                                                    </span>

                                                </div>

                                                <div className="detail-garment-price">

                                                    {formatearDinero(
                                                        subtotalPrenda(prenda)
                                                    )}
                                                    <small>{prenda.cantidad} × {formatearDinero(prenda.precio)} por unidad</small>

                                                </div>

                                            </div>

                                            <div className="detail-garment-description">

                                                <span>
                                                    <Icon name="note" /> Descripción
                                                </span>

                                                <p>
                                                    {prenda.descripcion ||
                                                        "Sin descripción"}
                                                </p>

                                            </div>

                                        </div>

                                    </article>

                                )
                            )}

                        </div>

                    ) : (

                        <div className="detail-old-order">

                            <div className="detail-old-order-icon">
                                {obtenerIcono(
                                    pedidoActual.tipo_prenda
                                )}
                            </div>

                            <div>

                                <h3>
                                    {pedidoActual.tipo_prenda ||
                                        "Pedido"}
                                </h3>

                                <p>
                                    {pedidoActual.descripcion ||
                                        "Sin descripción"}
                                </p>

                            </div>

                        </div>

                    )}

                </section>

                {/* =============================================
                    LATERAL
                ============================================= */}

                <aside className="detail-side-column">

                    {/* ESTADO */}

                    <section className="detail-panel">

                        <div className="detail-panel-header-simple">

                            <h2>
                                <Icon name="pin" /> Estado
                            </h2>

                        </div>

                        <div className="detail-status-box">

                            <span>
                                Estado actual
                            </span>

                            <strong
                                className={
                                    obtenerClaseEstado()
                                }
                            >
                                {obtenerTextoEstado()}
                            </strong>

                        </div>

                        <div className="detail-status-box">

                            <span>
                                Prioridad
                            </span>

                            <strong
                                className={
                                    pedidoActual.prioridad ===
                                    "Urgente"
                                        ? "detail-priority-urgent"
                                        : "detail-priority-normal"
                                }
                            >
                                {pedidoActual.prioridad ===
                                "Urgente"
                                    ? "Urgente"
                                    : "Normal"}
                            </strong>

                        </div>

                    </section>

                    {/* PAGO */}

                    <section className="detail-panel">

                        <div className="detail-panel-header-simple">

                            <h2>
                                <Icon name="wallet" /> Pago
                            </h2>

                        </div>

                        <div className="detail-money-list">

                            <div>

                                <span>
                                    Total
                                </span>

                                <strong>
                                    {formatearDinero(
                                        precio
                                    )}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    Seña
                                </span>

                                <strong>
                                    {formatearDinero(
                                        sena
                                    )}
                                </strong>

                            </div>

                            <div className="detail-money-total">

                                <span>
                                    Saldo pendiente
                                </span>

                                <strong
                                    className={
                                        saldo > 0
                                            ? "detail-pending-text"
                                            : "detail-paid-text"
                                    }
                                >
                                    {formatearDinero(
                                        saldo
                                    )}
                                </strong>

                            </div>

                        </div>

                    </section>

                </aside>

                {/* =============================================
                    NOTAS
                ============================================= */}

                <section className="detail-panel detail-panel-notes">

                    <div className="detail-panel-header-simple">

                        <h2>
                            <Icon name="note" /> Notas
                        </h2>

                    </div>

                    <div className="detail-notes-box">

                        {pedidoActual.notas ? (

                            <p>
                                {
                                    pedidoActual.notas
                                }
                            </p>

                        ) : (

                            <div className="detail-no-notes">

                                <span>
                                    <Icon name="note" />
                                </span>

                                <div>

                                    <strong>
                                        Sin notas
                                    </strong>

                                    <p>
                                        No hay ninguna
                                        nota adicional
                                        para este pedido.
                                    </p>

                                </div>

                            </div>

                        )}

                    </div>

                </section>

            </div>

            {/* =================================================
                PIE
            ================================================= */}

            <div className="detail-footer">

                <button
                    className="detail-back-button"
                    onClick={onBack}
                >
                    ← Volver a pedidos
                </button>

                <button
                    className="detail-edit-button"
                    onClick={() =>
                        setEditando(true)
                    }
                >
                    <Icon name="edit" /> Editar pedido
                </button>

            </div>

        </div>
    );
}

export default OrderDetail;