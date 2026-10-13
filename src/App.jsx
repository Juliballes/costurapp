import { useEffect, useState } from "react";

import Calendar from "./pages/Calendar";
import NewOrder from "./pages/NewOrder";
import Orders from "./pages/Orders";
import Layout from "./components/Layout";

import { supabase } from "./lib/supabase";
import Earnings from "./pages/Earnings";

function App() {
    const [page, setPage] = useState("dashboard");

    const [pedidos, setPedidos] = useState([]);

    const [cargandoPedidos, setCargandoPedidos] =
        useState(true);

    // =====================================================
    // CARGAR PEDIDOS
    // =====================================================

    const cargarPedidos = async () => {
        setCargandoPedidos(true);

        const { data, error } = await supabase
            .from("pedidos")
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
            .order("fecha_entrega", {
                ascending: true,
            });

        if (error) {
            console.error(
                "Error cargando pedidos:",
                error
            );

            setPedidos([]);
            setCargandoPedidos(false);
            return;
        }

        setPedidos(data || []);
        setCargandoPedidos(false);
    };

    // =====================================================
    // CARGAR AL INICIAR
    // =====================================================

    useEffect(() => {
        cargarPedidos();
    }, []);

    // =====================================================
    // REALTIME
    // =====================================================

    useEffect(() => {
        const canal = supabase
            .channel("pedidos-tiempo-real")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "pedidos",
                },
                () => {
                    cargarPedidos();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "pedido_prendas",
                },
                () => {
                    cargarPedidos();
                }
            )
            .subscribe((status) => {
                console.log(
                    "📡 Realtime:",
                    status
                );
            });

        return () => {
            supabase.removeChannel(canal);
        };
    }, []);

    // =====================================================
    // FECHA ACTUAL
    // =====================================================

    const hoy = new Date();

    const hoyString =
        hoy.getFullYear() +
        "-" +
        String(
            hoy.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            hoy.getDate()
        ).padStart(2, "0");

    // =====================================================
    // ESTADÍSTICAS
    // =====================================================

    const urgentes = pedidos.filter(
        (pedido) =>
            pedido.prioridad === "Urgente" &&
            pedido.estado !== "Entregado"
    ).length;

    const enProceso = pedidos.filter(
        (pedido) =>
            pedido.estado === "En proceso"
    ).length;

    const listos = pedidos.filter(
        (pedido) =>
            pedido.estado === "Listo"
    ).length;

    const entregasHoy = pedidos.filter(
        (pedido) =>
            pedido.fecha_entrega === hoyString &&
            pedido.estado !== "Entregado"
    ).length;

    // =====================================================
    // PEDIDOS ATRASADOS
    // =====================================================

    const pedidosAtrasados = pedidos.filter(
        (pedido) => {
            if (!pedido.fecha_entrega) {
                return false;
            }

            if (
                pedido.estado ===
                "Entregado"
            ) {
                return false;
            }

            return (
                pedido.fecha_entrega <
                hoyString
            );
        }
    );

    // =====================================================
    // PEDIDOS DE HOY
    // =====================================================

    const pedidosDeHoy = pedidos.filter(
        (pedido) =>
            pedido.fecha_entrega ===
                hoyString &&
            pedido.estado !==
                "Entregado"
    );

    // =====================================================
    // PRÓXIMOS PEDIDOS
    // =====================================================

    const proximosPedidos = pedidos.filter(
        (pedido) =>
            pedido.fecha_entrega >
                hoyString &&
            pedido.estado !==
                "Entregado"
    );

    // =====================================================
    // FORMATEAR FECHA
    // =====================================================

    const formatearFecha = (fecha) => {
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

    // =====================================================
    // ICONO PRENDA
    // =====================================================

    const obtenerIcono = (tipo) => {
        switch (tipo) {
            case "Vestido":
                return "👗";

            case "Pantalón":
                return "👖";

            case "Blusa":
                return "👚";

            case "Camisa":
                return "👔";

            case "Saco":
                return "🧥";

            case "Falda":
                return "👗";

            default:
                return "🧵";
        }
    };

    // =====================================================
    // PRENDAS DE UN PEDIDO
    // =====================================================

    const obtenerTextoPrendas = (pedido) => {
        if (
            pedido.pedido_prendas &&
            pedido.pedido_prendas.length > 0
        ) {
            return pedido.pedido_prendas
                .map(
                    (prenda) =>
                        `${prenda.tipo_prenda} × ${prenda.cantidad}`
                )
                .join(" · ");
        }

        return (
            pedido.tipo_prenda ||
            "Pedido"
        );
    };

    // =====================================================
    // ESTADO VISUAL
    // =====================================================

    const obtenerEstadoTexto = (pedido) => {
        if (
            pedido.prioridad ===
            "Urgente"
        ) {
            return "🔴 Urgente";
        }

        if (
            pedido.estado ===
            "Listo"
        ) {
            return "🟢 Listo";
        }

        if (
            pedido.estado ===
            "Entregado"
        ) {
            return "⚪ Entregado";
        }

        return "🟡 En proceso";
    };

    // =====================================================
    // NAVEGACIÓN
    // =====================================================

    if (page === "new-order") {
        return (
            <Layout
                page="orders"
                setPage={setPage}
            >
                <NewOrder
                    onBack={() =>
                        setPage("orders")
                    }
                    onOrderCreated={async () => {
                        await cargarPedidos();
                        setPage("orders");
                    }}
                />
            </Layout>
        );
    }

    if (
        page === "orders-late"
    ) {
        return (
            <Layout
                page="orders"
                setPage={setPage}
            >
                <Orders
                    pedidos={pedidos}
                    onBack={() =>
                        setPage(
                            "dashboard"
                        )
                    }
                    onNewOrder={() =>
                        setPage(
                            "new-order"
                        )
                    }
                    onRefresh={
                        cargarPedidos
                    }
                    filtroInicial="Atrasados"
                />
            </Layout>
        );
    }

    if (
        page === "orders-today"
    ) {
        return (
            <Layout
                page="orders"
                setPage={setPage}
            >
                <Orders
                    pedidos={pedidos}
                    onBack={() =>
                        setPage(
                            "dashboard"
                        )
                    }
                    onNewOrder={() =>
                        setPage(
                            "new-order"
                        )
                    }
                    onRefresh={
                        cargarPedidos
                    }
                    filtroInicial="Hoy"
                />
            </Layout>
        );
    }

    if (page === "orders") {
        return (
            <Layout
                page="orders"
                setPage={setPage}
            >
                <Orders
                    pedidos={pedidos}
                    onBack={() =>
                        setPage(
                            "dashboard"
                        )
                    }
                    onNewOrder={() =>
                        setPage(
                            "new-order"
                        )
                    }
                    onRefresh={
                        cargarPedidos
                    }
                />
            </Layout>
        );
    }

    if (page === "calendar") {
        return (
            <Layout
                page="calendar"
                setPage={setPage}
            >
                <Calendar
                    pedidos={pedidos}
                    onBack={() =>
                        setPage(
                            "dashboard"
                        )
                    }
                    onEditOrder={() =>
                        setPage("orders")
                    }
                />
            </Layout>
        );
    }
    
    if (page === "earnings") {
        return (
            <Layout page="earnings" setPage={setPage}>
                <Earnings pedidos={pedidos} />
            </Layout>
        );
    }


    // =====================================================
    // DASHBOARD
    // =====================================================

    return (
        <Layout
            page="dashboard"
            setPage={setPage}
        >
            <div className="dashboard-page">

                {/* =========================================
                    HEADER
                ========================================= */}

                <header className="dashboard-welcome">

                    <div>
                        <span className="dashboard-eyebrow">
                            COSTURAPP
                        </span>

                        <h1>
                            Buenos días, mamá 🌸
                        </h1>

                        <p>
                            Acá tenés lo más importante
                            de tu taller.
                        </p>
                    </div>

                    <div className="dashboard-date">

                        <span>
                            📅 Hoy
                        </span>

                        <strong>
                            {hoy.toLocaleDateString(
                                "es-AR",
                                {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                }
                            )}
                        </strong>

                    </div>

                </header>

                {/* =========================================
                    RESUMEN RÁPIDO
                ========================================= */}

                <section className="dashboard-stats">

                    <button
                        type="button"
                        className="dashboard-stat-card urgent"
                        onClick={() =>
                            setPage("orders")
                        }
                    >

                        <div className="dashboard-stat-icon">
                            🔴
                        </div>

                        <div>

                            <span>
                                Urgentes
                            </span>

                            <strong>
                                {urgentes}
                            </strong>

                            <small>
                                Necesitan atención
                            </small>

                        </div>

                    </button>

                    <button
                        type="button"
                        className="dashboard-stat-card today"
                        onClick={() =>
                            setPage(
                                "orders-today"
                            )
                        }
                    >

                        <div className="dashboard-stat-icon">
                            📅
                        </div>

                        <div>

                            <span>
                                Entregas hoy
                            </span>

                            <strong>
                                {entregasHoy}
                            </strong>

                            <small>
                                Para entregar hoy
                            </small>

                        </div>

                    </button>

                    <button
                        type="button"
                        className="dashboard-stat-card process"
                        onClick={() =>
                            setPage("orders")
                        }
                    >

                        <div className="dashboard-stat-icon">
                            🧵
                        </div>

                        <div>

                            <span>
                                En proceso
                            </span>

                            <strong>
                                {enProceso}
                            </strong>

                            <small>
                                Trabajos activos
                            </small>

                        </div>

                    </button>

                    <button
                        type="button"
                        className="dashboard-stat-card ready"
                        onClick={() =>
                            setPage("orders")
                        }
                    >

                        <div className="dashboard-stat-icon">
                            ✅
                        </div>

                        <div>

                            <span>
                                Listos
                            </span>

                            <strong>
                                {listos}
                            </strong>

                            <small>
                                Esperando retirar
                            </small>

                        </div>

                    </button>

                </section>

                {/* =========================================
                    ATRASADOS
                ========================================= */}

                <section className="dashboard-panel late-panel">

                    <div className="dashboard-panel-header">

                        <div className="dashboard-section-title">

                            <div className="dashboard-section-icon late">
                                🔴
                            </div>

                            <div>

                                <h2>
                                    {pedidosAtrasados.length >
                                    0
                                        ? "Pedidos atrasados"
                                        : "Todo al día"}
                                </h2>

                                <p>
                                    {pedidosAtrasados.length >
                                    0
                                        ? `Tenés ${pedidosAtrasados.length} ${
                                              pedidosAtrasados.length ===
                                              1
                                                  ? "pedido que necesita"
                                                  : "pedidos que necesitan"
                                          } atención.`
                                        : "No tenés pedidos atrasados."}
                                </p>

                            </div>

                        </div>

                        {pedidosAtrasados.length >
                            0 && (

                            <button
                                type="button"
                                className="dashboard-link-button"
                                onClick={() =>
                                    setPage(
                                        "orders-late"
                                    )
                                }
                            >
                                Ver todos →
                            </button>

                        )}

                    </div>

                    {pedidosAtrasados.length >
                    0 ? (

                        <div className="dashboard-order-list">

                            {pedidosAtrasados
                                .slice(0, 3)
                                .map(
                                    (pedido) => {

                                        const fecha =
                                            new Date(
                                                `${pedido.fecha_entrega}T00:00:00`
                                            );

                                        const diferencia =
                                            Math.floor(
                                                (
                                                    hoy -
                                                    fecha
                                                ) /
                                                    (
                                                        1000 *
                                                        60 *
                                                        60 *
                                                        24
                                                    )
                                            );

                                        return (

                                            <button
                                                type="button"
                                                key={
                                                    pedido.id
                                                }
                                                className="dashboard-order-row late"
                                                onClick={() =>
                                                    setPage(
                                                        "orders-late"
                                                    )
                                                }
                                            >

                                                <div className="dashboard-order-icon">
                                                    {obtenerIcono(
                                                        pedido
                                                            .pedido_prendas?.[0]
                                                            ?.tipo_prenda ||
                                                            pedido.tipo_prenda
                                                    )}
                                                </div>

                                                <div className="dashboard-order-main">

                                                    <strong>
                                                        {pedido.clientes?.nombre ||
                                                            "Sin cliente"}
                                                    </strong>

                                                    <span>
                                                        {obtenerTextoPrendas(
                                                            pedido
                                                        )}
                                                    </span>

                                                </div>

                                                <div className="dashboard-order-date">

                                                    <span>
                                                        Debía entregarse
                                                    </span>

                                                    <strong>
                                                        {formatearFecha(
                                                            pedido.fecha_entrega
                                                        )}
                                                    </strong>

                                                </div>

                                                <div className="dashboard-overdue-badge">
                                                    ⏰{" "}
                                                    {diferencia ===
                                                    1
                                                        ? "1 día"
                                                        : `${diferencia} días`}
                                                </div>

                                            </button>

                                        );
                                    }
                                )}

                        </div>

                    ) : (

                        <div className="dashboard-empty-state">
                            <span>
                                ✅
                            </span>

                            <div>
                                <strong>
                                    No hay pedidos atrasados
                                </strong>

                                <p>
                                    Vas al día con las entregas.
                                </p>
                            </div>
                        </div>

                    )}

                </section>

                {/* =========================================
                    HOY + PARA RECORDAR
                ========================================= */}

                <div className="dashboard-two-column">

                    {/* ENTREGAS DE HOY */}

                    <section className="dashboard-panel today-panel">

                        <div className="dashboard-panel-header">

                            <div className="dashboard-section-title">

                                <div className="dashboard-section-icon today">
                                    📅
                                </div>

                                <div>

                                    <h2>
                                        Entregas de hoy
                                    </h2>

                                    <p>
                                        Lo que tu mamá tiene que entregar hoy.
                                    </p>

                                </div>

                            </div>

                            {pedidosDeHoy.length >
                                0 && (

                                <button
                                    type="button"
                                    className="dashboard-link-button"
                                    onClick={() =>
                                        setPage(
                                            "orders-today"
                                        )
                                    }
                                >
                                    Ver todos →
                                </button>

                            )}

                        </div>

                        {pedidosDeHoy.length >
                        0 ? (

                            <div className="dashboard-today-list">

                                {pedidosDeHoy
                                    .slice(0, 4)
                                    .map(
                                        (
                                            pedido
                                        ) => (

                                            <button
                                                type="button"
                                                key={
                                                    pedido.id
                                                }
                                                className="today-order-card"
                                                onClick={() =>
                                                    setPage(
                                                        "orders-today"
                                                    )
                                                }
                                            >

                                                <div className="today-order-icon">
                                                    {obtenerIcono(
                                                        pedido
                                                            .pedido_prendas?.[0]
                                                            ?.tipo_prenda ||
                                                            pedido.tipo_prenda
                                                    )}
                                                </div>

                                                <div className="today-order-main">

                                                    <strong>
                                                        {pedido.clientes?.nombre ||
                                                            "Sin cliente"}
                                                    </strong>

                                                    <span>
                                                        {obtenerTextoPrendas(
                                                            pedido
                                                        )}
                                                    </span>

                                                </div>

                                                <div
                                                    className={`today-order-status ${
                                                        pedido.prioridad ===
                                                        "Urgente"
                                                            ? "urgent"
                                                            : pedido.estado ===
                                                              "Listo"
                                                            ? "ready"
                                                            : "process"
                                                    }`}
                                                >
                                                    {obtenerEstadoTexto(
                                                        pedido
                                                    )}
                                                </div>

                                            </button>

                                        )
                                    )}

                            </div>

                        ) : (

                            <div className="dashboard-empty-state">
                                <span>
                                    🌸
                                </span>

                                <div>
                                    <strong>
                                        No hay entregas para hoy
                                    </strong>

                                    <p>
                                        Por hoy está todo tranquilo.
                                    </p>
                                </div>
                            </div>

                        )}

                    </section>

                    {/* PARA RECORDAR */}

                    <section
                        className={`reminder-card ${
                            urgentes > 0 ||
                            listos > 0 ||
                            pedidosAtrasados.length >
                                0
                                ? "has-reminders"
                                : ""
                        }`}
                    >

                        <div className="reminder-bell">
                            🔔
                        </div>

                        <div className="reminder-card-content">

                            <span className="reminder-label">
                                PARA RECORDAR
                            </span>

                            <h2>
                                {urgentes > 0 ||
                                listos > 0 ||
                                pedidosAtrasados.length >
                                    0
                                    ? "Hay cosas para mirar"
                                    : "Todo al día"}
                            </h2>

                            <p>
                                {urgentes > 0 ||
                                listos > 0 ||
                                pedidosAtrasados.length >
                                    0
                                    ? "Tenés algunos pedidos que merecen atención."
                                    : "No tenés nada pendiente por revisar."}
                            </p>

                            <div className="reminder-items">

                                {pedidosAtrasados.length >
                                    0 && (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                "orders-late"
                                            )
                                        }
                                    >
                                        🔴{" "}
                                        <strong>
                                            {pedidosAtrasados.length}
                                        </strong>{" "}
                                        atrasados
                                    </button>

                                )}

                                {urgentes >
                                    0 && (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                "orders"
                                            )
                                        }
                                    >
                                        ⚠️{" "}
                                        <strong>
                                            {urgentes}
                                        </strong>{" "}
                                        urgentes
                                    </button>

                                )}

                                {listos >
                                    0 && (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                "orders"
                                            )
                                        }
                                    >
                                        ✅{" "}
                                        <strong>
                                            {listos}
                                        </strong>{" "}
                                        listos para retirar
                                    </button>

                                )}

                            </div>

                        </div>

                    </section>

                </div>

                {/* =========================================
                    PRÓXIMOS PEDIDOS
                ========================================= */}

                <section className="dashboard-panel upcoming-panel">

                    <div className="dashboard-panel-header">

                        <div className="dashboard-section-title">

                            <div className="dashboard-section-icon upcoming">
                                🧵
                            </div>

                            <div>

                                <h2>
                                    Próximos pedidos
                                </h2>

                                <p>
                                    Los trabajos que vienen después.
                                </p>

                            </div>

                        </div>

                        <button
                            type="button"
                            className="dashboard-link-button"
                            onClick={() =>
                                setPage("orders")
                            }
                        >
                            Ver pedidos →
                        </button>

                    </div>

                    {proximosPedidos.length >
                    0 ? (

                        <div className="upcoming-list">

                            {proximosPedidos
                                .slice(0, 5)
                                .map(
                                    (
                                        pedido
                                    ) => (

                                        <button
                                            type="button"
                                            key={
                                                pedido.id
                                            }
                                            className="upcoming-row"
                                            onClick={() =>
                                                setPage(
                                                    "orders"
                                                )
                                            }
                                        >

                                            <div className="upcoming-icon">

                                                {obtenerIcono(
                                                    pedido
                                                        .pedido_prendas?.[0]
                                                        ?.tipo_prenda ||
                                                        pedido.tipo_prenda
                                                )}

                                            </div>

                                            <div className="upcoming-main">

                                                <strong>
                                                    {pedido.clientes?.nombre ||
                                                        "Sin cliente"}
                                                </strong>

                                                <span>
                                                    {obtenerTextoPrendas(
                                                        pedido
                                                    )}
                                                </span>

                                            </div>

                                            <div className="upcoming-date">

                                                <span>
                                                    Entrega
                                                </span>

                                                <strong>
                                                    {formatearFecha(
                                                        pedido.fecha_entrega
                                                    )}
                                                </strong>

                                            </div>

                                            <span
                                                className={
                                                    pedido.prioridad ===
                                                    "Urgente"
                                                        ? "upcoming-status urgent"
                                                        : pedido.estado ===
                                                          "Listo"
                                                        ? "upcoming-status ready"
                                                        : "upcoming-status process"
                                                }
                                            >
                                                {obtenerEstadoTexto(
                                                    pedido
                                                )}
                                            </span>

                                        </button>

                                    )
                                )}

                        </div>

                    ) : (

                        <div className="dashboard-empty-state">
                            <span>
                                🧵
                            </span>

                            <div>
                                <strong>
                                    No hay pedidos próximos
                                </strong>

                                <p>
                                    Cuando agregues nuevos trabajos aparecerán acá.
                                </p>
                            </div>
                        </div>

                    )}

                </section>

                {/* =========================================
                    NUEVO PEDIDO
                ========================================= */}

                <div className="dashboard-bottom-action">

                    <button
                        type="button"
                        className="dashboard-new-order-button"
                        onClick={() =>
                            setPage(
                                "new-order"
                            )
                        }
                    >
                        ＋ Nuevo pedido
                    </button>

                </div>

            </div>
        </Layout>
    );
}

export default App;