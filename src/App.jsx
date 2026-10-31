import Icon, { GarmentIcon } from "./components/Icon";
import { useEffect, useRef, useState } from "react";

import Calendar from "./pages/Calendar";
import NewOrder from "./pages/NewOrder";
import Orders from "./pages/Orders";
import Layout from "./components/Layout";

import { supabase } from "./lib/supabase";
import Earnings from "./pages/Earnings";
import Settings from "./pages/Settings";
import { navegar } from "./lib/navigation";
import { useWorkshopSettings } from "./hooks/useWorkshopSettings";
import { cargarTodosLosPedidos } from "./lib/orderRepository";

function App() {
    const configuracion = useWorkshopSettings();
    const [page, setPageActual] = useState("dashboard");
    const [versionNavegacion, setVersionNavegacion] = useState(0);
    const setPage = (pagina) => navegar(() => {
        setPageActual(pagina);
        setVersionNavegacion(version => version + 1);
    });
    const [errorCarga, setErrorCarga] = useState("");
    const ultimaCarga = useRef(0);

    const [pedidos, setPedidos] = useState([]);

    const [cargandoPedidos, setCargandoPedidos] =
        useState(true);

    // =====================================================
    // CARGAR PEDIDOS
    // =====================================================

    const cargarPedidos = () => {
        const numeroCarga = ++ultimaCarga.current;
        return cargarTodosLosPedidos(supabase)
            .then((data) => {
                if (numeroCarga !== ultimaCarga.current) return;
                setPedidos(data || []);
                setErrorCarga("");
            })
            .catch((error) => {
                if (numeroCarga !== ultimaCarga.current) return;
                console.error("Error cargando pedidos:", error);
                setErrorCarga("No pudimos actualizar los pedidos. Comprobá la conexión y reintentá. Si había datos cargados, seguimos mostrándolos.");
            })
            .finally(() => {
                if (numeroCarga === ultimaCarga.current) setCargandoPedidos(false);
            });
    };

    const actualizarPedidoLocal = (actualizado) => {
        setPedidos(actuales => actualizado.eliminado
            ? actuales.filter(pedido => pedido.id !== actualizado.id)
            : actuales.map(pedido => pedido.id === actualizado.id ? { ...pedido, ...actualizado } : pedido));
    };

    const reintentarCarga = () => {
        setCargandoPedidos(true);
        cargarPedidos();
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
            .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => cargarPedidos())
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

    const obtenerIcono = (tipo) => <GarmentIcon tipo={tipo} />;

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
            return "Urgente";
        }

        if (
            pedido.estado ===
            "Listo"
        ) {
            return "Listo";
        }

        if (
            pedido.estado ===
            "Entregado"
        ) {
            return "Entregado";
        }

        return "En proceso";
    };

    // =====================================================
    // NAVEGACIÓN
    // =====================================================

    if (page === "settings") {
        return <Layout page={page} setPage={setPage} errorCarga={errorCarga} onRetry={reintentarCarga}><Settings key={versionNavegacion} /></Layout>;
    }

    if (errorCarga && pedidos.length === 0 && page !== "new-order") {
        return <Layout page={page} setPage={setPage} errorCarga={errorCarga} onRetry={reintentarCarga}><section className="connection-empty"><h1>No se pudieron cargar los pedidos</h1><p>Reintentá la carga para ver tus trabajos. No se borró ningún pedido.</p></section></Layout>;
    }

    if (cargandoPedidos && !errorCarga && pedidos.length === 0 && page !== "new-order") {
        return <Layout page={page} setPage={setPage} errorCarga={errorCarga} onRetry={reintentarCarga}><p role="status">Cargando pedidos…</p></Layout>;
    }

    if (page === "new-order") {
        return (
            <Layout errorCarga={errorCarga} onRetry={reintentarCarga}
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

    if (page === "orders" || page.startsWith("orders-")) {
        const entradas = {
            "orders-late": { fecha: "Atrasados" },
            "orders-today": { fecha: "Hoy" },
            "orders-ready": { estado: "Listo" },
            "orders-work": { estado: "En proceso" },
            "orders-urgent": { prioridad: "Urgente" },
        };
        const entrada = entradas[page] || {};
        return (
            <Layout errorCarga={errorCarga} onRetry={reintentarCarga} page="orders" setPage={setPage}>
                <Orders key={`${page}-${versionNavegacion}`} pedidos={pedidos}
                    onBack={() => setPage("dashboard")} onNewOrder={() => setPage("new-order")}
                    onRefresh={cargarPedidos} onOrderChanged={actualizarPedidoLocal}
                    filtroInicial={entrada.fecha || "Todos"} estadoInicial={entrada.estado || "Todos"} prioridadInicial={entrada.prioridad || "Todos"} />
            </Layout>
        );
    }

    if (page === "calendar") {
        return (
            <Layout errorCarga={errorCarga} onRetry={reintentarCarga}
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
            <Layout errorCarga={errorCarga} onRetry={reintentarCarga} page="earnings" setPage={setPage}>
                <Earnings pedidos={pedidos} />
            </Layout>
        );
    }


    // =====================================================
    // DASHBOARD
    // =====================================================

    return (
        <Layout errorCarga={errorCarga} onRetry={reintentarCarga}
            page="dashboard"
            setPage={setPage}
        >
            <div className="dashboard-page">

                {/* =========================================
                    HEADER
                ========================================= */}

                <header className="dashboard-welcome">
                    <div className="welcome-copy">
                        <span className="dashboard-eyebrow">HOLA, {configuracion.remitente.toUpperCase()}</span>
                        <h1>Tu taller, al día.</h1>
                        <p>Organizá los trabajos de hoy y prepará las próximas entregas.</p>
                    </div>
                    <div className="welcome-actions">
                        <div className="dashboard-date"><Icon name="calendar"/><div><span>Hoy en tu taller</span><strong>{hoy.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</strong></div></div>
                        <button type="button" className="dashboard-new-order-button" onClick={() => setPage("new-order")}><Icon name="plus"/>Nuevo pedido</button>
                    </div>
                    <div className="hero-stitch" aria-hidden="true"><Icon name="scissors"/></div>
                </header>

                {/* =========================================
                    RESUMEN RÁPIDO
                ========================================= */}

                <section className="dashboard-stats">

                    <button
                        type="button"
                        className="dashboard-stat-card urgent"
                        onClick={() =>
                            setPage("orders-urgent")
                        }
                    >

                        <div className="dashboard-stat-icon">
                            <Icon name="alert" />
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
                            <Icon name="calendar" />
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
                            setPage("orders-work")
                        }
                    >

                        <div className="dashboard-stat-icon">
                            <Icon name="thread" />
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
                            setPage("orders-ready")
                        }
                    >

                        <div className="dashboard-stat-icon">
                            <Icon name="checkCircle" />
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

                            <div className={`dashboard-section-icon ${pedidosAtrasados.length > 0 ? "late" : "ready"}`}>
                                <Icon name={pedidosAtrasados.length > 0 ? "alert" : "checkCircle"} />
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
                                                    <Icon name="clock" />{" "}
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
                                <Icon name="checkCircle" />
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
                                    <Icon name="calendar" />
                                </div>

                                <div>

                                    <h2>
                                        Entregas de hoy
                                    </h2>

                                    <p>
                                        Los pedidos que tenés que entregar hoy.
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
                                    <Icon name="flower" />
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
                            <Icon name="bell" />
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
                                    ? "Un vistazo a tus pendientes"
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
                                        <Icon name="alert" />{" "}
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
                                                "orders-urgent"
                                            )
                                        }
                                    >
                                        <Icon name="alert" />{" "}
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
                                                "orders-ready"
                                            )
                                        }
                                    >
                                        <Icon name="checkCircle" />{" "}
                                        <strong>
                                            {listos}
                                        </strong>{" "}
                                        {listos === 1 ? "listo para retirar" : "listos para retirar"}
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
                                <Icon name="thread" />
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
                                <Icon name="thread" />
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



            </div>
        </Layout>
    );
}

export default App;