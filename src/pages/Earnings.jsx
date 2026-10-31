import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import { formatearDinero as dinero } from "../lib/orderTotals";
import { inicioSemana, resumenSemanal, sumarDias } from "../lib/earnings";
import "./Earnings.css";

const fechaCorta = (fecha) =>
    new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
    });
const fechaCompleta = (fecha) =>
    new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

export default function Earnings({ pedidos = [] }) {
    const [semana, setSemana] = useState(() => inicioSemana());
    const [filtro, setFiltro] = useState("Todos");
    const resumen = useMemo(
        () => resumenSemanal(pedidos, semana),
        [pedidos, semana],
    );
    const domingo = sumarDias(semana, 6);
    const esActual = semana === inicioSemana();
    const visibles = resumen.filas.filter(
        ({ saldo }) =>
            filtro === "Todos" ||
            (filtro === "Con saldo" ? saldo > 0 : saldo === 0),
    );
    function cambiarSemana(fecha) {
        if (!fecha || Number.isNaN(new Date(`${fecha}T12:00:00`).getTime()))
            return;
        setSemana(inicioSemana(fecha));
        setFiltro("Todos");
    }
    return (
        <div className="earnings-page earnings-workspace">
            <header className="orders-header">
                <div>
                    <h1>Ganancias</h1>
                    <p>Las cuentas del taller, claras y en un solo lugar.</p>
                </div>
            </header>
            <section
                className="earnings-period"
                aria-label="Semana a consultar"
            >
                <div className="earnings-period-heading">
                    <span className="earnings-period-icon">
                        <Icon name="calendar" />
                    </span>
                    <div>
                        <span className="earnings-eyebrow">
                            {esActual ? "Esta semana" : "Semana seleccionada"}
                        </span>
                        <h2>
                            {fechaCorta(semana)} — {fechaCorta(domingo)}{" "}
                            <small>{domingo.slice(0, 4)}</small>
                        </h2>
                    </div>
                </div>
                <div className="earnings-week-controls">
                    <div className="earnings-week-arrows">
                        <button
                            type="button"
                            aria-label="Semana anterior"
                            onClick={() => cambiarSemana(sumarDias(semana, -7))}
                        >
                            ←
                        </button>
                        <button
                            type="button"
                            onClick={() => cambiarSemana(inicioSemana())}
                            disabled={esActual}
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            aria-label="Semana siguiente"
                            onClick={() => cambiarSemana(sumarDias(semana, 7))}
                        >
                            →
                        </button>
                    </div>
                    <div className="earnings-date-field">
                        <label htmlFor="earnings-week">Elegir una fecha</label>
                        <input
                            id="earnings-week"
                            type="date"
                            value={semana}
                            onChange={(event) =>
                                cambiarSemana(event.target.value)
                            }
                        />
                    </div>
                </div>
            </section>
            <section
                className="earnings-overview"
                aria-label="Resumen de la semana"
            >
                <div className="earnings-balance">
                    <span className="earnings-eyebrow">
                        <Icon name="wallet" /> Por cobrar
                    </span>
                    <strong>{dinero(resumen.saldo)}</strong>
                    <p>
                        {resumen.conSaldo
                            ? `${resumen.conSaldo} ${resumen.conSaldo === 1 ? "pedido tiene" : "pedidos tienen"} saldo pendiente`
                            : resumen.filas.length
                              ? "Todos los pedidos de esta semana están saldados"
                              : "Sin saldos para esta semana"}
                    </p>
                    <div className="earnings-progress-label">
                        <span>Valor de los trabajos cubierto</span>
                        <b>{resumen.porcentaje}%</b>
                    </div>
                    <progress
                        value={resumen.porcentaje}
                        max="100"
                        aria-label="Porcentaje del valor de los trabajos cubierto por pagos registrados"
                    />
                </div>
                <div className="earnings-metrics">
                    <div className="earnings-metric">
                        <span className="earnings-metric-icon">
                            <Icon name="thread" />
                        </span>
                        <div>
                            <span>Valor de los trabajos</span>
                            <strong>{dinero(resumen.total)}</strong>
                            <small>
                                Incluye todas las prendas y cantidades
                            </small>
                        </div>
                    </div>
                    <div className="earnings-metric">
                        <span className="earnings-metric-icon">
                            <Icon name="checkCircle" />
                        </span>
                        <div>
                            <span>Pagos registrados</span>
                            <strong>{dinero(resumen.pagos)}</strong>
                            <small>Señas y pedidos marcados como pagados</small>
                        </div>
                    </div>
                    <div className="earnings-metric">
                        <span className="earnings-metric-icon">
                            <Icon name="orders" />
                        </span>
                        <div>
                            <span>Pedidos de la semana</span>
                            <strong>{resumen.filas.length}</strong>
                            <small>
                                Activos y antiguos con entrega prevista
                            </small>
                        </div>
                    </div>
                </div>
            </section>
            <p className="earnings-context">
                <Icon name="note" size={17} /> Agrupado por fecha prevista de
                entrega, del {fechaCompleta(semana)} al {fechaCompleta(domingo)}
                . Los pagos son los registrados en esos pedidos, no los cobros
                realizados durante la semana. No incluye gastos.
            </p>
            <section
                className="earnings-ledger"
                aria-labelledby="earnings-detail-title"
            >
                <div className="earnings-ledger-heading">
                    <div>
                        <span className="earnings-eyebrow">
                            Pedido por pedido
                        </span>
                        <h2 id="earnings-detail-title">Detalle de la semana</h2>
                        <p>Primero aparecen los saldos más altos.</p>
                    </div>
                    <div
                        className="earnings-filters"
                        role="group"
                        aria-label="Filtrar pedidos por pago"
                    >
                        {[
                            ["Todos", resumen.filas.length],
                            ["Con saldo", resumen.conSaldo],
                            [
                                "Sin saldo",
                                resumen.filas.length - resumen.conSaldo,
                            ],
                        ].map(([nombre, cantidad]) => (
                            <button
                                key={nombre}
                                type="button"
                                aria-pressed={filtro === nombre}
                                onClick={() => setFiltro(nombre)}
                            >
                                {nombre} <span>{cantidad}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <p className="earnings-result-count" role="status">
                    {visibles.length}{" "}
                    {visibles.length === 1 ? "pedido" : "pedidos"}
                    {filtro !== "Todos" ? ` · ${filtro.toLowerCase()}` : ""}
                </p>
                {visibles.length ? (
                    <div className="earnings-rows">
                        {visibles.map(({ pedido, total, sena, saldo }) => (
                            <article
                                key={pedido.id}
                                className="earnings-row"
                                aria-label={`Cuenta de ${pedido.clientes?.nombre || "Sin cliente"}, pedido ${pedido.id}`}
                            >
                                <div className="earnings-customer">
                                    <span className="earnings-customer-icon">
                                        <Icon name="user" />
                                    </span>
                                    <div>
                                        <h3>
                                            {pedido.clientes?.nombre ||
                                                "Sin cliente"}
                                        </h3>
                                        <p>
                                            #{pedido.id} · Entrega{" "}
                                            {fechaCorta(pedido.fecha_entrega)}
                                        </p>
                                        <span className="earnings-order-state">
                                            {pedido.estado === "Listo"
                                                ? "Listo para retirar"
                                                : pedido.estado || "Sin estado"}
                                        </span>
                                    </div>
                                </div>
                                <dl className="earnings-amounts">
                                    <div>
                                        <dt>Valor del trabajo</dt>
                                        <dd>{dinero(total)}</dd>
                                    </div>
                                    <div>
                                        <dt>Pagos registrados</dt>
                                        <dd>{dinero(sena)}</dd>
                                    </div>
                                    <div
                                        className={
                                            saldo > 0
                                                ? "earnings-due"
                                                : "earnings-settled"
                                        }
                                    >
                                        <dt>
                                            {saldo > 0
                                                ? "Por cobrar"
                                                : "Saldado"}
                                        </dt>
                                        <dd>
                                            {saldo > 0 ? (
                                                dinero(saldo)
                                            ) : (
                                                <>
                                                    <Icon
                                                        name="check"
                                                        size={18}
                                                    />{" "}
                                                    {dinero(0)}
                                                </>
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="earnings-empty">
                        <Icon
                            name={
                                resumen.filas.length
                                    ? "checkCircle"
                                    : "calendar"
                            }
                            size={34}
                        />
                        <h3>
                            {resumen.filas.length
                                ? "No hay pedidos con este filtro"
                                : "Una semana sin pedidos previstos"}
                        </h3>
                        <p>
                            {resumen.filas.length
                                ? "Podés ver el detalle completo con Todos."
                                : "Elegí otra semana para consultar sus trabajos y saldos."}
                        </p>
                        {resumen.filas.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setFiltro("Todos")}
                            >
                                Ver todos
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
