import Icon, { GarmentIcon } from "../components/Icon";
import { useState } from "react";
import { resumenPago, subtotalPrenda } from "../lib/orderTotals";
import { mensajeRetiro, enlaceWhatsapp } from "../lib/whatsapp";
import { coincideBusqueda } from "../lib/orderDraft";
import { useWorkshopSettings } from "../hooks/useWorkshopSettings";

import EditOrder from "./EditOrder";
import OrderDetail from "./OrderDetail";

import { supabase } from "../lib/supabase";

import "./Orders.css";

function Orders({
    pedidos = [],
    onBack,
    onNewOrder,
    onRefresh,
    filtroInicial = "Todos",
}) {
    const configuracion = useWorkshopSettings();
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] =
        useState("Todos");
    const [filtroFecha, setFiltroFecha] =
    useState(filtroInicial);

    const [pedidoSeleccionado, setPedidoSeleccionado] =
        useState(null);

    const [pedidoDetalle, setPedidoDetalle] =
        useState(null);

    const [pedidoListo, setPedidoListo] =
        useState(null);

    const [pedidoAEliminar, setPedidoAEliminar] =
        useState(null);

    const [eliminandoPedidoId, setEliminandoPedidoId] =
        useState(null);

    const [actualizandoPedidoId, setActualizandoPedidoId] =
        useState(null);

    // =====================================================
    // REFRESCAR APP
    // =====================================================

    const refrescarApp = async () => {
        if (onRefresh) {
            await onRefresh();
        }
    };

    // =====================================================
    // ICONOS
    // =====================================================

    const obtenerIcono = (tipo) => <GarmentIcon tipo={tipo} />;

    // =====================================================
    // FECHA
    // =====================================================

    const formatearFecha = (fecha) => {
        if (!fecha) {
            return "Sin fecha";
        }

        const partes = fecha.split("-");

        if (partes.length !== 3) {
            return fecha;
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    // =====================================================
    // DINERO
    // =====================================================

    const formatearDinero = (valor) => {
        return `$${Number(
            valor || 0
        ).toLocaleString("es-AR")}`;
    };

    // =====================================================
    // ESTADO
    // =====================================================

    const obtenerClaseEstado = (estado) => {
        if (estado === "Listo") {
            return "status-ready";
        }

        if (estado === "Entregado") {
            return "status-delivered";
        }

        return "status-process";
    };

    const obtenerTextoEstado = (estado) => {
        if (estado === "Listo") {
            return "Listo";
        }

        if (estado === "Entregado") {
            return "Entregado";
        }

        if (estado === "Pendiente") {
            return "Pendiente";
        }

        return "En proceso";
    };

    // =====================================================
    // MARCAR COMO LISTO
    // =====================================================

    const marcarComoListo = async (pedido) => {
        if (actualizandoPedidoId !== null) {
            return;
        }

        setActualizandoPedidoId(pedido.id);

        const { error } = await supabase
            .from("pedidos")
            .update({
                estado: "Listo",
            })
            .eq("id", pedido.id);

        if (error) {
            console.error(
                "Error marcando pedido como listo:",
                error
            );

            alert(
                "No se pudo marcar el pedido como listo.\n\n" +
                    error.message
            );

            setActualizandoPedidoId(null);
            return;
        }

        const pedidoActualizado = {
            ...pedido,
            estado: "Listo",
        };

        setActualizandoPedidoId(null);

        setPedidoListo(pedidoActualizado);

        await refrescarApp();
    };

    // =====================================================
    // WHATSAPP
    // =====================================================

    const crearEnlaceWhatsapp = pedido => enlaceWhatsapp(pedido, configuracion);

    // =====================================================
    // ELIMINAR
    // =====================================================

    const abrirModalEliminar = (pedido) => {
        setPedidoAEliminar(pedido);
    };

    const cerrarEliminar = () => {
        if (eliminandoPedidoId !== null) {
            return;
        }

        setPedidoAEliminar(null);
    };

    const eliminarPedido = async () => {
        if (!pedidoAEliminar) {
            return;
        }

        const id = pedidoAEliminar.id;

        setEliminandoPedidoId(id);

        const { error } = await supabase
            .from("pedidos")
            .delete()
            .eq("id", id);

        if (error) {
            console.error(
                "Error eliminando pedido:",
                error
            );

            alert(
                "No se pudo eliminar el pedido.\n\n" +
                    error.message
            );

            setEliminandoPedidoId(null);
            return;
        }

        setPedidoAEliminar(null);
        setEliminandoPedidoId(null);

        if (
            pedidoDetalle?.id === id
        ) {
            setPedidoDetalle(null);
        }

        if (
            pedidoSeleccionado?.id === id
        ) {
            setPedidoSeleccionado(null);
        }

        await refrescarApp();
    };

    // =====================================================
    // FILTROS
    // =====================================================

    const pedidosFiltrados =
    pedidos.filter((pedido) => {

        const coincideTexto = coincideBusqueda(pedido, busqueda);

        const coincideEstado =
            filtroEstado === "Todos" ||
            pedido.estado === filtroEstado;

        // =============================
        // FILTRO POR FECHA
        // =============================

        const hoy = new Date();

        hoy.setHours(0, 0, 0, 0);

        const fechaPedido =
            pedido.fecha_entrega
                ? new Date(
                    `${pedido.fecha_entrega}T00:00:00`
                )
                : null;

        let coincideFecha = true;

        if (filtroFecha === "Hoy") {

            coincideFecha =
                fechaPedido !== null &&
                fechaPedido.getTime() ===
                    hoy.getTime();

        }

        if (filtroFecha === "Mañana") {

            const manana =
                new Date(hoy);

            manana.setDate(
                manana.getDate() + 1
            );

            coincideFecha =
                fechaPedido !== null &&
                fechaPedido.getTime() ===
                    manana.getTime();

        }

        if (filtroFecha === "Esta semana") {

            const inicioSemana =
                new Date(hoy);

            const diaSemana =
                inicioSemana.getDay();

            const diferencia =
                diaSemana === 0
                    ? 6
                    : diaSemana - 1;

            inicioSemana.setDate(
                inicioSemana.getDate() -
                    diferencia
            );

            inicioSemana.setHours(
                0,
                0,
                0,
                0
            );

            const finSemana =
                new Date(
                    inicioSemana
                );

            finSemana.setDate(
                finSemana.getDate() + 6
            );

            finSemana.setHours(
                23,
                59,
                59,
                999
            );

            coincideFecha =
                fechaPedido !== null &&
                fechaPedido >= inicioSemana &&
                fechaPedido <= finSemana;

        }

       if (
    filtroFecha === "Atrasados" ||
    filtroFecha === "Vencidos"
) {
    coincideFecha =
        fechaPedido !== null &&
        fechaPedido < hoy &&
        pedido.estado !== "Entregado";
}

        return (
            coincideTexto &&
            coincideEstado &&
            coincideFecha
        );
    });
        

    // =====================================================
    // EDICIÓN
    // =====================================================

    if (pedidoSeleccionado) {
        return (
            <EditOrder
                pedido={
                    pedidoSeleccionado
                }

                onBack={async () => {
                    setPedidoSeleccionado(
                        null
                    );

                    await refrescarApp();
                }}

                onSaved={async () => {
                    setPedidoSeleccionado(
                        null
                    );

                    await refrescarApp();
                }}
            />
        );
    }

    // =====================================================
    // DETALLE
    // =====================================================

    if (pedidoDetalle) {
        return (
            <OrderDetail
                pedido={pedidoDetalle}

                onBack={() => {
                    setPedidoDetalle(null);
                }}

                onSaved={async (pedidoActualizado) => {
                    setPedidoDetalle(
                        pedidoActualizado
                    );

                    await refrescarApp();
                }}
            />
        );
    }

    // =====================================================
    // PANTALLA
    // =====================================================

    return (
        <div className="orders-page">

            {/* HEADER */}

            <div className="orders-header">

                <div>
                    <h1>
                        Pedidos
                    </h1>

                    <p>
                        Acá podés ver y administrar todos
                        los pedidos.
                    </p>
                </div>

                <div className="orders-header-actions">

                    <button
                        className="back-button"
                        onClick={onBack}
                    >
                        ← Inicio
                    </button>

                    <button
                        className="new-order-button"
                        onClick={onNewOrder}
                    >
                        <Icon name="plus" /> Nuevo pedido
                    </button>

                </div>

            </div>

            {/* FILTROS */}

            <div className="orders-toolbar">
                <div className="date-filters">

    <button
        type="button"
        className={
            filtroFecha === "Todos"
                ? "date-filter-button active"
                : "date-filter-button"
        }
        onClick={() =>
            setFiltroFecha("Todos")
        }
    >
        <Icon name="orders" /> Todos
    </button>

    <button
        type="button"
        className={
            filtroFecha === "Hoy"
                ? "date-filter-button active"
                : "date-filter-button"
        }
        onClick={() =>
            setFiltroFecha("Hoy")
        }
    >
        <Icon name="calendar" /> Hoy
    </button>

    <button
        type="button"
        className={
            filtroFecha === "Mañana"
                ? "date-filter-button active"
                : "date-filter-button"
        }
        onClick={() =>
            setFiltroFecha("Mañana")
        }
    >
        Mañana
    </button>

    <button
        type="button"
        className={
            filtroFecha === "Esta semana"
                ? "date-filter-button active"
                : "date-filter-button"
        }
        onClick={() =>
            setFiltroFecha("Esta semana")
        }
    >
        Esta semana
    </button>

    <button
        type="button"
        className={
            filtroFecha === "Vencidos"
                ? "date-filter-button overdue"
                : "date-filter-button"
        }
        onClick={() =>
            setFiltroFecha("Vencidos")
        }
    >
        <Icon name="alert" /> Atrasados
    </button>

</div>

                <div className="search-box">

                    <span>
                        <Icon name="search" />
                    </span>

                    <input
                        type="text"
                        placeholder="Buscar por cliente, teléfono, prenda o descripción..."
                        value={busqueda}
                        onChange={(e) =>
                            setBusqueda(
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="status-filter">

                    <label>
                        Estado
                    </label>

                    <select
                        value={filtroEstado}
                        onChange={(e) =>
                            setFiltroEstado(
                                e.target.value
                            )
                        }
                    >
                        <option value="Todos">
                            Todos
                        </option>

                        <option value="En proceso">
                            En proceso
                        </option>

                        <option value="Pendiente">
                            Pendiente
                        </option>

                        <option value="Listo">
                            Listo
                        </option>

                        <option value="Entregado">
                            Entregado
                        </option>
                    </select>

                </div>

            </div>

            {/* CONTADOR */}

            <div className="orders-count">

                <strong>
                    {pedidosFiltrados.length}
                </strong>

                <span>
                    {pedidosFiltrados.length === 1
                        ? " pedido encontrado"
                        : " pedidos encontrados"}
                </span>

            </div>

            {/* LISTA */}

            {pedidosFiltrados.length === 0 ? (

                <div className="orders-empty">

                    <div className="empty-icon">
                        <Icon name="orders" />
                    </div>

                    <h2>
                        No encontramos pedidos
                    </h2>

                    <p>
                        Probá cambiando el filtro
                        o creando un nuevo pedido.
                    </p>

                    <button
                        className="new-order-button"
                        onClick={onNewOrder}
                    >
                        <Icon name="plus" /> Crear pedido
                    </button>

                </div>

            ) : (

                <div className="orders-list">

                    {pedidosFiltrados.map(
                        (pedido) => {

                            const { total: precio, saldo } = resumenPago(pedido);

                            const actualizando =
                                actualizandoPedidoId ===
                                pedido.id;

                            const cantidadTrabajos =
                                pedido.pedido_prendas
                                    ?.length || 0;

                            return (

                                <div
                                    className="order-card-new"
                                    key={pedido.id}
                                >

                                    {/* ICONO */}

                                    <div className="order-card-icon">

                                        {obtenerIcono(
                                            pedido.pedido_prendas?.[0]
                                                ?.tipo_prenda ||
                                                pedido.tipo_prenda
                                        )}

                                    </div>

                                    {/* INFORMACIÓN */}

                                    <div className="order-main-info">

                                        <div className="order-title-row">

                                            <h2>
                                                {pedido.clientes?.nombre ||
                                                    "Sin cliente"}
                                            </h2>

                                            {pedido.prioridad ===
                                                "Urgente" && (

                                                <span className="priority-badge">
                                                    <Icon name="alert" /> Urgente
                                                </span>

                                            )}

                                        </div>

                                        <p className="order-client">

                                            {cantidadTrabajos > 1
                                                ? `${cantidadTrabajos} tipos de trabajo`
                                                : "1 trabajo"}

                                        </p>

                                        <div className="order-garments-preview">

                                            {cantidadTrabajos >
                                            0 ? (

                                                pedido.pedido_prendas
                                                    .map(
                                                        (
                                                            prenda
                                                        ) => (

                                                            <div
                                                                key={
                                                                    prenda.id
                                                                }
                                                                className="order-garment-row"
                                                            >

                                                                <span className="order-garment-icon">

                                                                    {obtenerIcono(
                                                                        prenda.tipo_prenda
                                                                    )}

                                                                </span>

                                                                <div>

                                                                    <strong>

                                                                        {
                                                                            prenda.tipo_prenda
                                                                        }

                                                                        {" × "}

                                                                        {
                                                                            prenda.cantidad
                                                                        }
                                                                        <small className="order-line-subtotal"> · {formatearDinero(subtotalPrenda(prenda))}</small>
                                                                    </strong>

                                                                    <span>

                                                                        {prenda.descripcion ||
                                                                            "Sin descripción"}

                                                                    </span>

                                                                </div>

                                                            </div>

                                                        )
                                                    )

                                            ) : (

                                                <div className="order-garment-row">

                                                    <span className="order-garment-icon">

                                                        {obtenerIcono(
                                                            pedido.tipo_prenda
                                                        )}

                                                    </span>

                                                    <div>

                                                        <strong>
                                                            {pedido.tipo_prenda ||
                                                                "Pedido"}
                                                        </strong>

                                                        <span>
                                                            {pedido.descripcion ||
                                                                "Sin descripción"}
                                                        </span>

                                                    </div>

                                                </div>

                                            )}

                                        </div>

                                    </div>

                                    {/* FECHA */}

                                    <div className="order-info-block">

                                        <span>
                                            <Icon name="calendar" /> Entrega
                                        </span>

                                        <strong>
                                            {formatearFecha(
                                                pedido.fecha_entrega
                                            )}
                                        </strong>

                                    </div>

                                    {/* PAGO */}

                                    <div className="order-payment">

                                        <div>

                                            <span>
                                                <Icon name="wallet" /> Total
                                            </span>

                                            <strong>
                                                {formatearDinero(
                                                    precio
                                                )}
                                            </strong>

                                        </div>

                                        <div>

                                            <span>
                                                <Icon name="wallet" /> Saldo
                                            </span>

                                            <strong
                                                className={
                                                    saldo > 0
                                                        ? "saldo-pendiente"
                                                        : "saldo-pagado"
                                                }
                                            >
                                                {formatearDinero(
                                                    saldo
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                    {/* ESTADO */}

                                    <div
                                        className={`order-status-badge ${obtenerClaseEstado(
                                            pedido.estado
                                        )}`}
                                    >
                                        {obtenerTextoEstado(
                                            pedido.estado
                                        )}
                                    </div>

                                    {/* ACCIONES */}

                                    <div className="order-actions">

                                        {pedido.estado !==
                                            "Listo" &&
                                            pedido.estado !==
                                                "Entregado" && (

                                                <button
                                                    type="button"
                                                    className="ready-order-button"
                                                    onClick={() =>
                                                        marcarComoListo(
                                                            pedido
                                                        )
                                                    }
                                                    disabled={
                                                        actualizando
                                                    }
                                                >
                                                    {actualizando
                                                        ? "Guardando..."
                                                        : "✓ Marcar como listo"}
                                                </button>

                                            )}

                                        {pedido.estado === "Listo" && <button type="button" className="whatsapp-order-button" aria-label="Avisar por WhatsApp" onClick={() => setPedidoListo(pedido)}><Icon name="message" /> Avisar</button>}

                                        <button
                                            type="button"
                                            className="view-order-button"
                                            onClick={() =>
                                                setPedidoDetalle(
                                                    pedido
                                                )
                                            }
                                        >
                                            <Icon name="eye" /> Ver pedido
                                        </button>

                                        <button
                                            type="button"
                                            className="edit-order-button"
                                            onClick={() =>
                                                setPedidoSeleccionado(
                                                    pedido
                                                )
                                            }
                                            disabled={
                                                actualizando
                                            }
                                        >
                                            <Icon name="edit" /> Editar
                                        </button>

                                        <button
                                            type="button"
                                            className="delete-order-button"
                                            onClick={() =>
                                                abrirModalEliminar(
                                                    pedido
                                                )
                                            }
                                            disabled={
                                                actualizando
                                            }
                                        >
                                            <Icon name="trash" /> Eliminar
                                        </button>

                                    </div>

                                </div>
                            );
                        }
                    )}

                </div>

            )}

            {/* =================================================
                MODAL PEDIDO LISTO
            ================================================= */}

            {pedidoListo && (

                <div
                    className="status-modal-backdrop"
                    onClick={() =>
                        setPedidoListo(null)
                    }
                >

                    <section
                        className="status-modal ready-modal"
                        aria-label="Aviso de retiro"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="status-modal-icon">
                            <Icon name="checkCircle" />
                        </div>

                        <h2>
                            ¡Pedido listo!
                        </h2>

                        <p>
                            El pedido de{" "}
                            <strong>
                                {pedidoListo.clientes?.nombre ||
                                    "tu cliente"}
                            </strong>{" "}
                            ya está listo para retirar.
                        </p>

                        <div className="whatsapp-preview">
                            <span>Mensaje para tu cliente</span>
                            <p>{mensajeRetiro(pedidoListo.clientes?.nombre, configuracion)}</p>
                        </div>

                        {crearEnlaceWhatsapp(
                            pedidoListo
                        ) ? (

                            <a
                                className="whatsapp-button"
                                href={crearEnlaceWhatsapp(
                                    pedidoListo
                                )}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Icon name="message" /> Avisar por WhatsApp
                            </a>

                        ) : (

                            <div className="no-phone-message">

                                <span>
                                    <Icon name="phone" />
                                </span>

                                <p>
                                    Este cliente no tiene un teléfono válido. Corregilo desde Editar pedido para poder avisarle.
                                </p>

                            </div>

                        )}

                        <button
                            type="button"
                            className="modal-close-button"
                            onClick={() =>
                                setPedidoListo(null)
                            }
                        >
                            Ahora no
                        </button>

                    </section>

                </div>
            )}

            {/* =================================================
                MODAL ELIMINAR
            ================================================= */}

            {pedidoAEliminar && (

                <div
                    className="status-modal-backdrop"
                    onClick={cerrarEliminar}
                >

                    <section
                        className="status-modal delete-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="delete-modal-icon">
                            <Icon name="trash" />
                        </div>

                        <h2>
                            ¿Eliminar pedido?
                        </h2>

                        <p>
                            Vas a eliminar el pedido de{" "}
                            <strong>
                                {pedidoAEliminar.clientes?.nombre ||
                                    "este cliente"}
                            </strong>
                            .
                        </p>

                        <span className="delete-warning">
                            Esta acción no se puede deshacer.
                        </span>

                        <div className="delete-modal-actions">

                            <button
                                type="button"
                                className="delete-cancel-button"
                                onClick={
                                    cerrarEliminar
                                }
                                disabled={
                                    eliminandoPedidoId !==
                                    null
                                }
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-button"
                                onClick={
                                    eliminarPedido
                                }
                                disabled={
                                    eliminandoPedidoId ===
                                    pedidoAEliminar.id
                                }
                            >
                                {eliminandoPedidoId ===
                                pedidoAEliminar.id
                                    ? "Eliminando..."
                                    : "Sí, eliminar"}
                            </button>

                        </div>

                    </section>

                </div>

            )}

        </div>
    );
}

export default Orders;