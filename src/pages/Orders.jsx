import { useRef, useState } from "react";
import Icon from "../components/Icon";
import OrganizedOrderCard from "../components/OrganizedOrderCard";
import OrderDialog from "../components/OrderDialog";
import WhatsAppMessage from "../components/WhatsAppMessage";
import EditOrder from "./EditOrder";
import OrderDetail from "./OrderDetail";
import { supabase } from "../lib/supabase";
import { seleccionPedido } from "../lib/orderRepository";
import {
    esAntiguo,
    organizarPedidos,
    resumenOrganizacion,
} from "../lib/orderOrganization";
import { formatearDinero, resumenPago } from "../lib/orderTotals";
import { useWorkshopSettings } from "../hooks/useWorkshopSettings";
import "./Orders.css";
import "./OrdersOrganization.css";

const porPagina = 10;
const filtrosIniciales = (solapa = "Activos") => ({
    busqueda: "",
    estado: "Todos",
    fecha: "Todos",
    pago: "Todos",
    prioridad: "Todos",
    orden: solapa === "Antiguos" ? "Recientes" : "Atención",
});

export default function Orders({
    pedidos = [],
    onBack,
    onNewOrder,
    onRefresh,
    onOrderChanged,
    filtroInicial = "Todos",
    estadoInicial = "Todos",
    prioridadInicial = "Todos",
}) {
    const configuracion = useWorkshopSettings();
    const [solapa, setSolapa] = useState("Activos");
    const [filtros, setFiltros] = useState(() => ({
        ...filtrosIniciales(),
        fecha: filtroInicial === "Vencidos" ? "Atrasados" : filtroInicial,
        estado: estadoInicial,
        prioridad: prioridadInicial,
    }));
    const [pagina, setPagina] = useState(1);
    const [mostrarFiltros, setMostrarFiltros] = useState(
        estadoInicial !== "Todos" || prioridadInicial !== "Todos",
    );
    const [editando, setEditando] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [aviso, setAviso] = useState(null);
    const [confirmacion, setConfirmacion] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [errorAccion, setErrorAccion] = useState("");
    const [resultado, setResultado] = useState(null);
    const enviando = useRef(false);
    const pestanas = useRef(null);
    const resumen = resumenOrganizacion(pedidos);
    const actuales = solapa === "Antiguos" ? resumen.antiguos : resumen.activos;
    const encontrados = organizarPedidos(pedidos, { ...filtros, solapa });
    const paginas = Math.max(1, Math.ceil(encontrados.length / porPagina));
    const paginaVisible = Math.min(pagina, paginas);
    const visibles = encontrados.slice(
        (paginaVisible - 1) * porPagina,
        paginaVisible * porPagina,
    );
    const hayFiltros =
        filtros.busqueda.trim() ||
        filtros.estado !== "Todos" ||
        filtros.fecha !== "Todos" ||
        filtros.pago !== "Todos" ||
        filtros.prioridad !== "Todos";

    function filtrar(campo, valor) {
        setFiltros((actual) => ({ ...actual, [campo]: valor }));
        setPagina(1);
    }
    function cambiarSolapa(siguiente) {
        setSolapa(siguiente);
        setFiltros((actual) => ({
            ...filtrosIniciales(siguiente),
            busqueda: actual.busqueda,
        }));
        setPagina(1);
        setResultado(null);
        setErrorAccion("");
    }
    function limpiar() {
        setFiltros(filtrosIniciales(solapa));
        setPagina(1);
    }
    function abrirConfirmacion(tipo, pedido) {
        setErrorAccion("");
        setConfirmacion({ tipo, pedido });
    }
    async function refrescar() {
        try {
            await onRefresh?.();
        } catch {
            setErrorAccion(
                "El cambio se guardó, pero no pudimos actualizar la lista. Reintentá la carga.",
            );
        }
    }
    async function actualizarEstado(pedido, estado) {
        if (enviando.current) return;
        enviando.current = true;
        setOcupado(true);
        setErrorAccion("");
        try {
            // Solo cambia el trabajo: entregar no cobra ni modifica la seña.
            const { data, error } = await supabase
                .from("pedidos")
                .update({ estado })
                .eq("id", pedido.id)
                .select(seleccionPedido)
                .single();
            if (error) throw error;
            onOrderChanged?.(data);
            setConfirmacion(null);
            setResultado({
                texto:
                    estado === "Entregado"
                        ? `El pedido de ${data.clientes?.nombre || "tu cliente"} pasó a Antiguos.`
                        : estado === "En proceso"
                          ? "El pedido volvió a Activos."
                          : "Pedido listo para retirar.",
                solapa:
                    estado === "Entregado"
                        ? "Antiguos"
                        : estado === "En proceso"
                          ? "Activos"
                          : null,
            });
            if (estado === "Listo") setAviso(data);
            await refrescar();
        } catch (error) {
            console.error("Error cambiando estado:", error);
            setErrorAccion(
                "No pudimos confirmar el cambio de estado. Revisá el pedido y reintentá la carga antes de volver a intentar.",
            );
        } finally {
            enviando.current = false;
            setOcupado(false);
        }
    }
    async function eliminar() {
        if (enviando.current || !confirmacion) return;
        enviando.current = true;
        setOcupado(true);
        setErrorAccion("");
        try {
            const { error } = await supabase
                .from("pedidos")
                .delete()
                .eq("id", confirmacion.pedido.id)
                .select("id")
                .single();
            if (error) throw error;
            onOrderChanged?.({ id: confirmacion.pedido.id, eliminado: true });
            setConfirmacion(null);
            setResultado({ texto: "Pedido eliminado." });
            await refrescar();
        } catch (error) {
            console.error("Error eliminando pedido:", error);
            setErrorAccion("No se pudo eliminar el pedido. Intentá de nuevo.");
        } finally {
            enviando.current = false;
            setOcupado(false);
        }
    }
    async function guardarEdicion(pedido, mantenerDetalle = false) {
        onOrderChanged?.(pedido);
        setEditando(null);
        const destino = esAntiguo(pedido) ? "Antiguos" : "Activos";
        if (destino !== solapa) {
            setSolapa(destino);
            setFiltros(filtrosIniciales(destino));
            setPagina(1);
        }
        if (mantenerDetalle) setDetalle(pedido);
        setResultado({ texto: "Pedido actualizado." });
        await refrescar();
    }

    if (editando)
        return (
            <EditOrder
                pedido={editando}
                onBack={() => setEditando(null)}
                onSaved={(pedido) => guardarEdicion(pedido)}
            />
        );
    if (detalle)
        return (
            <OrderDetail
                pedido={detalle}
                onBack={() => setDetalle(null)}
                onSaved={(pedido) => guardarEdicion(pedido, true)}
            />
        );

    return (
        <div className="orders-page organized-orders">
            <header className="orders-header">
                <div>
                    <h1>Pedidos</h1>
                    <p>
                        El trabajo de cada día y el historial de tu taller, en
                        su lugar.
                    </p>
                </div>
                <div className="orders-header-actions">
                    <button
                        type="button"
                        className="back-button"
                        onClick={onBack}
                    >
                        ← Inicio
                    </button>
                    <button
                        type="button"
                        className="new-order-button"
                        onClick={onNewOrder}
                    >
                        <Icon name="plus" />
                        Nuevo pedido
                    </button>
                </div>
            </header>
            <div
                className="orders-scope-tabs"
                role="tablist"
                aria-label="Organización de pedidos"
                ref={pestanas}
                onKeyDown={(event) => {
                    if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                            event.key,
                        )
                    )
                        return;
                    event.preventDefault();
                    const siguiente =
                        event.key === "Home"
                            ? "Activos"
                            : event.key === "End"
                              ? "Antiguos"
                              : solapa === "Activos"
                                ? "Antiguos"
                                : "Activos";
                    cambiarSolapa(siguiente);
                    pestanas.current
                        .querySelector(`#solapa-${siguiente}`)
                        ?.focus();
                }}
            >
                {["Activos", "Antiguos"].map((nombre) => (
                    <button
                        key={nombre}
                        id={`solapa-${nombre}`}
                        type="button"
                        role="tab"
                        aria-selected={solapa === nombre}
                        aria-controls="panel-pedidos"
                        tabIndex={solapa === nombre ? 0 : -1}
                        onClick={() => cambiarSolapa(nombre)}
                    >
                        <Icon
                            name={nombre === "Activos" ? "thread" : "orders"}
                        />
                        {nombre}
                        <span>
                            {nombre === "Activos"
                                ? resumen.activos.length
                                : resumen.antiguos.length}
                        </span>
                    </button>
                ))}
            </div>
            <section
                id="panel-pedidos"
                role="tabpanel"
                aria-labelledby={`solapa-${solapa}`}
            >
                <p className="orders-scope-description">
                    {solapa === "Activos"
                        ? "Pendientes, en proceso y listos para retirar. Al entregar una prenda, el pedido pasa a Antiguos."
                        : "Pedidos ya entregados. Podés consultarlos, corregirlos o reactivarlos sin perder su información."}
                </p>
                <div className="orders-overview">
                    {solapa === "Activos" ? (
                        <>
                            <div>
                                <Icon name="thread" />
                                <span>
                                    En trabajo
                                    <strong>{resumen.enTrabajo}</strong>
                                </span>
                            </div>
                            <div>
                                <Icon name="checkCircle" />
                                <span>
                                    Listos para retirar
                                    <strong>{resumen.listos}</strong>
                                </span>
                            </div>
                            <div>
                                <Icon name="wallet" />
                                <span>
                                    Por cobrar
                                    <strong>
                                        {formatearDinero(resumen.saldoActivos)}
                                    </strong>
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <Icon name="orders" />
                                <span>
                                    Pedidos entregados
                                    <strong>{resumen.antiguos.length}</strong>
                                </span>
                            </div>
                            <div>
                                <Icon name="wallet" />
                                <span>
                                    Saldo de los antiguos
                                    <strong>
                                        {formatearDinero(resumen.saldoAntiguos)}
                                    </strong>
                                </span>
                            </div>
                        </>
                    )}
                </div>
                {resultado && (
                    <div className="orders-result" role="status">
                        <span>{resultado.texto}</span>
                        {resultado.solapa && resultado.solapa !== solapa && (
                            <button
                                type="button"
                                onClick={() => cambiarSolapa(resultado.solapa)}
                            >
                                Ver en {resultado.solapa} →
                            </button>
                        )}
                    </div>
                )}
                {errorAccion && !confirmacion && (
                    <p className="form-error-banner" role="alert">
                        {errorAccion}
                    </p>
                )}
                <div className="organized-filters">
                    <div className="organized-search">
                        <Icon name="search" />
                        <label
                            className="visually-hidden"
                            htmlFor="buscar-pedidos"
                        >
                            Buscar pedidos
                        </label>
                        <input
                            id="buscar-pedidos"
                            type="search"
                            placeholder="Cliente, teléfono, prenda o descripción"
                            value={filtros.busqueda}
                            onChange={(event) =>
                                filtrar("busqueda", event.target.value)
                            }
                        />
                    </div>
                    <button
                        type="button"
                        className="toggle-organized-filters"
                        aria-controls="filtros-pedidos"
                        aria-expanded={mostrarFiltros}
                        onClick={() => setMostrarFiltros((actual) => !actual)}
                    >
                        <Icon name="settings" />
                        Filtros y orden
                        {[
                            filtros.estado,
                            filtros.prioridad,
                            filtros.pago,
                        ].filter((valor) => valor !== "Todos").length > 0 && (
                            <span>
                                {
                                    [
                                        filtros.estado,
                                        filtros.prioridad,
                                        filtros.pago,
                                    ].filter((valor) => valor !== "Todos")
                                        .length
                                }
                            </span>
                        )}
                    </button>
                    <div
                        id="filtros-pedidos"
                        className={`organized-selects ${mostrarFiltros ? "is-expanded" : "is-collapsed"} ${solapa === "Antiguos" ? "archive-filters" : ""}`}
                    >
                        {solapa === "Activos" && (
                            <>
                                <div className="organized-filter-field">
                                    <label htmlFor="ordenes-estado">
                                        Estado
                                    </label>
                                    <select
                                        id="ordenes-estado"
                                        value={filtros.estado}
                                        onChange={(event) =>
                                            filtrar(
                                                "estado",
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="Todos">
                                            Todos los estados
                                        </option>
                                        <option>En trabajo</option>
                                        <option>Pendiente</option>
                                        <option>En proceso</option>
                                        <option value="Listo">
                                            Listos para retirar
                                        </option>
                                    </select>
                                </div>
                                <div className="organized-filter-field">
                                    <label htmlFor="ordenes-prioridad">
                                        Prioridad
                                    </label>
                                    <select
                                        id="ordenes-prioridad"
                                        value={filtros.prioridad}
                                        onChange={(event) =>
                                            filtrar(
                                                "prioridad",
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="Todos">Todas</option>
                                        <option>Urgente</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div className="organized-filter-field">
                            <label htmlFor="ordenes-pago">Pago</label>
                            <select
                                id="ordenes-pago"
                                value={filtros.pago}
                                onChange={(event) =>
                                    filtrar("pago", event.target.value)
                                }
                            >
                                <option value="Todos">Todos</option>
                                <option value="Con saldo">
                                    Con saldo pendiente
                                </option>
                                <option value="Sin saldo">
                                    Sin saldo pendiente
                                </option>
                            </select>
                        </div>
                        <div className="organized-filter-field">
                            <label htmlFor="ordenes-orden">Ordenar por</label>
                            <select
                                id="ordenes-orden"
                                value={filtros.orden}
                                onChange={(event) =>
                                    filtrar("orden", event.target.value)
                                }
                            >
                                {solapa === "Activos" ? (
                                    <>
                                        <option value="Atención">
                                            Prioridad de atención
                                        </option>
                                        <option value="Fecha">
                                            Fecha prevista: próxima
                                        </option>
                                    </>
                                ) : (
                                    <option value="Recientes">
                                        Fecha prevista: reciente
                                    </option>
                                )}
                                <option value="Cliente">Cliente: A–Z</option>
                            </select>
                        </div>
                    </div>
                    <div
                        className="organized-date-filters"
                        role="group"
                        aria-label="Fecha de entrega prevista"
                    >
                        {[
                            "Todos",
                            "Hoy",
                            "Mañana",
                            "Esta semana",
                            ...(solapa === "Activos" ? ["Atrasados"] : []),
                        ].map((fecha) => (
                            <button
                                key={fecha}
                                type="button"
                                aria-pressed={filtros.fecha === fecha}
                                onClick={() => filtrar("fecha", fecha)}
                            >
                                {fecha === "Todos" ? "Cualquier fecha" : fecha}
                            </button>
                        ))}
                        {hayFiltros && (
                            <button
                                type="button"
                                className="clear-order-filters"
                                onClick={limpiar}
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
                <div className="organized-results-heading">
                    <p role="status">
                        {encontrados.length} de {actuales.length}{" "}
                        {solapa.toLowerCase()}
                        {hayFiltros ? " coinciden con la búsqueda" : ""}
                    </p>
                    <span>
                        {filtros.orden === "Cliente"
                            ? "Por nombre del cliente, de A a Z."
                            : filtros.orden === "Fecha"
                              ? "Por fecha de entrega prevista: próximas primero."
                              : solapa === "Activos"
                                ? "Primero, lo que necesita tu atención."
                                : "Por fecha de entrega prevista: recientes primero."}
                    </span>
                </div>
                {encontrados.length ? (
                    <>
                        <div className="orders-list organized-orders-list">
                            {visibles.map((pedido) => (
                                <OrganizedOrderCard
                                    key={pedido.id}
                                    pedido={pedido}
                                    ocupado={ocupado}
                                    onView={setDetalle}
                                    onEdit={setEditando}
                                    onReady={(pedido) =>
                                        actualizarEstado(pedido, "Listo")
                                    }
                                    onDeliver={(pedido) =>
                                        abrirConfirmacion("entregar", pedido)
                                    }
                                    onReactivate={(pedido) =>
                                        abrirConfirmacion("reactivar", pedido)
                                    }
                                    onWhatsapp={setAviso}
                                    onDelete={(pedido) =>
                                        abrirConfirmacion("eliminar", pedido)
                                    }
                                />
                            ))}
                        </div>
                        {paginas > 1 && (
                            <nav
                                className="orders-pagination"
                                aria-label="Páginas de pedidos"
                            >
                                <button
                                    type="button"
                                    disabled={paginaVisible === 1}
                                    onClick={() => setPagina(paginaVisible - 1)}
                                >
                                    ← Anterior
                                </button>
                                <span>
                                    Página {paginaVisible} de {paginas}
                                </span>
                                <button
                                    type="button"
                                    disabled={paginaVisible === paginas}
                                    onClick={() => setPagina(paginaVisible + 1)}
                                >
                                    Siguiente →
                                </button>
                            </nav>
                        )}
                    </>
                ) : (
                    <div className="organized-empty">
                        <Icon
                            name={
                                solapa === "Antiguos" ? "orders" : "checkCircle"
                            }
                        />
                        <h2>
                            {hayFiltros
                                ? "No hay coincidencias"
                                : solapa === "Antiguos"
                                  ? "Todavía no hay pedidos antiguos"
                                  : "No hay pedidos activos"}
                        </h2>
                        <p>
                            {hayFiltros
                                ? "Probá otra búsqueda o limpiá los filtros."
                                : solapa === "Antiguos"
                                  ? "Los pedidos aparecerán acá cuando los marques como entregados."
                                  : "Los pedidos nuevos aparecerán acá para que puedas seguirlos hasta la entrega."}
                        </p>
                        {hayFiltros ? (
                            <button
                                type="button"
                                className="organized-secondary"
                                onClick={limpiar}
                            >
                                Limpiar filtros
                            </button>
                        ) : (
                            solapa === "Activos" && (
                                <button
                                    type="button"
                                    className="new-order-button"
                                    onClick={onNewOrder}
                                >
                                    <Icon name="plus" />
                                    Crear pedido
                                </button>
                            )
                        )}
                    </div>
                )}
            </section>
            {aviso && (
                <OrderDialog
                    titulo="Aviso de retiro"
                    onClose={() => setAviso(null)}
                >
                    <p>
                        El pedido de{" "}
                        <strong>
                            {aviso.clientes?.nombre || "tu cliente"}
                        </strong>{" "}
                        está listo para retirar.
                    </p>
                    <WhatsAppMessage
                        pedido={aviso}
                        configuracion={configuracion}
                    />
                    <button
                        type="button"
                        className="modal-close-button"
                        onClick={() => setAviso(null)}
                    >
                        Ahora no
                    </button>
                </OrderDialog>
            )}
            {confirmacion && (
                <OrderDialog
                    titulo={
                        confirmacion.tipo === "eliminar"
                            ? "¿Eliminar pedido?"
                            : confirmacion.tipo === "entregar"
                              ? "¿La prenda ya fue retirada?"
                              : "¿Reactivar este pedido?"
                    }
                    ocupado={ocupado}
                    onClose={() => {
                        if (!ocupado) {
                            setConfirmacion(null);
                            setErrorAccion("");
                        }
                    }}
                >
                    <p>
                        Pedido de{" "}
                        <strong>
                            {confirmacion.pedido.clientes?.nombre ||
                                "tu cliente"}
                        </strong>
                        .
                    </p>
                    <p>
                        {confirmacion.tipo === "eliminar"
                            ? "Se eliminará definitivamente. Para conservar un trabajo resuelto, usá Marcar entregado."
                            : confirmacion.tipo === "entregar"
                              ? "Pasará a la solapa Antiguos para conservarlo en el historial."
                              : "Volverá a Activos con estado En proceso."}
                    </p>
                    {confirmacion.tipo !== "eliminar" && (
                        <p className="order-confirm-balance">
                            Saldo pendiente:{" "}
                            <strong>
                                {formatearDinero(
                                    resumenPago(confirmacion.pedido).saldo,
                                )}
                            </strong>
                            . Esta acción no cambia los pagos.
                        </p>
                    )}
                    {errorAccion && (
                        <p className="field-error" role="alert">
                            {errorAccion}
                        </p>
                    )}
                    <div className="orders-dialog-actions">
                        <button
                            type="button"
                            className="organized-secondary"
                            disabled={ocupado}
                            onClick={() => {
                                setConfirmacion(null);
                                setErrorAccion("");
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={
                                confirmacion.tipo === "eliminar"
                                    ? "organized-danger"
                                    : "organized-primary"
                            }
                            disabled={ocupado}
                            onClick={() =>
                                confirmacion.tipo === "eliminar"
                                    ? eliminar()
                                    : actualizarEstado(
                                          confirmacion.pedido,
                                          confirmacion.tipo === "entregar"
                                              ? "Entregado"
                                              : "En proceso",
                                      )
                            }
                        >
                            {ocupado
                                ? "Guardando…"
                                : confirmacion.tipo === "eliminar"
                                  ? "Sí, eliminar"
                                  : confirmacion.tipo === "entregar"
                                    ? "Confirmar entrega"
                                    : "Reactivar pedido"}
                        </button>
                    </div>
                </OrderDialog>
            )}
        </div>
    );
}
