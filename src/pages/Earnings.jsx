import Icon from "../components/Icon";

import { useMemo, useState } from "react";
import { resumenPago } from "../lib/orderTotals";

function Earnings({ pedidos = [] }) {
    // Calcula el lunes de la semana actual.
    const [semanaSeleccionada, setSemanaSeleccionada] = useState(() => {
        const hoy = new Date();
        const dia = hoy.getDay();
        const lunes = new Date(hoy);

        lunes.setDate(hoy.getDate() + (dia === 0 ? -6 : 1 - dia));

        return `${lunes.getFullYear()}-${String(
            lunes.getMonth() + 1
        ).padStart(2, "0")}-${String(lunes.getDate()).padStart(2, "0")}`;
    });

    // Convierte una fecha a YYYY-MM-DD usando la fecha local.
    const fechaLocal = (fecha) =>
        `${fecha.getFullYear()}-${String(
            fecha.getMonth() + 1
        ).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

    // Suma días sin problemas de zona horaria.
    const sumarDias = (fecha, dias) => {
        const resultado = new Date(`${fecha}T12:00:00`);
        resultado.setDate(resultado.getDate() + dias);
        return fechaLocal(resultado);
    };

    // La semana comienza el lunes y termina el domingo.
    const domingo = sumarDias(semanaSeleccionada, 6);

    // Formatea los importes como pesos argentinos.
    const dinero = (valor) =>
        Number(valor || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 2,
        });

    // Calcula los totales de los pedidos que se entregan esa semana.
    const resumen = useMemo(() => {
        const deLaSemana = pedidos.filter((pedido) => {
            return (
                pedido.fecha_entrega &&
                pedido.fecha_entrega >= semanaSeleccionada &&
                pedido.fecha_entrega <= domingo
            );
        });

        const totalTrabajos = deLaSemana.reduce(
            (suma, pedido) => suma + resumenPago(pedido).total,
            0
        );

        const senas = deLaSemana.reduce(
            (suma, pedido) => suma + resumenPago(pedido).sena,
            0
        );

        const pendientes = deLaSemana.filter((pedido) => {
            return resumenPago(pedido).saldo > 0;
        });

        const saldoPendiente = deLaSemana.reduce((suma, pedido) => {
            const { saldo } = resumenPago(pedido);

            return suma + saldo;
        }, 0);

        return {
            deLaSemana,
            totalTrabajos,
            senas,
            pendientes,
            saldoPendiente,
        };
    }, [pedidos, semanaSeleccionada, domingo]);

    // Al elegir una fecha, ajusta automáticamente al lunes de esa semana.
    const cambiarSemana = (evento) => {
        if (!evento.target.value) return;

        const fecha = new Date(`${evento.target.value}T12:00:00`);

        if (Number.isNaN(fecha.getTime())) return;

        const dia = fecha.getDay();

        fecha.setDate(fecha.getDate() + (dia === 0 ? -6 : 1 - dia));

        setSemanaSeleccionada(fechaLocal(fecha));
    };

    return (
        <div className="earnings-page">
            <header className="orders-header">
                <div>
                    <h1>Ganancias</h1>
                    <p>
                        Consultá cuánto tenés previsto cobrar por los pedidos
                        de cada semana.
                    </p>
                </div>
            </header>

            {/* Resumen del dinero que falta cobrar */}
            <section className="weekly-collection-card">
                <div className="weekly-collection-icon" aria-hidden="true">
                    <Icon name="wallet" />
                </div>

                <div className="weekly-collection-info">
                    <span>Saldo pendiente de los pedidos de esta semana</span>

                    <strong>{dinero(resumen.saldoPendiente)}</strong>

                    <small>
                        {resumen.pendientes.length}{" "}
                        {resumen.pendientes.length === 1
                            ? "pedido con saldo pendiente"
                            : "pedidos con saldo pendiente"}
                    </small>

                    <small>
                        Del {semanaSeleccionada.split("-").reverse().join("/")}
                        {" al "}
                        {domingo.split("-").reverse().join("/")}
                    </small>
                </div>
            </section>

            {/* Indicadores de la semana */}
            <section className="dashboard-stats">
                <div className="dashboard-stat-card process">
                    <div className="dashboard-stat-icon" aria-hidden="true">
                        <Icon name="thread" />
                    </div>

                    <div>
                        <span>Valor de los trabajos</span>
                        <strong>{dinero(resumen.totalTrabajos)}</strong>
                        <small>Precio total de los pedidos</small>
                    </div>
                </div>

                <div className="dashboard-stat-card ready">
                    <div className="dashboard-stat-icon" aria-hidden="true">
                        <Icon name="wallet" />
                    </div>

                    <div>
                        <span>Señas registradas</span>
                        <strong>{dinero(resumen.senas)}</strong>
                        <small>Adelantos de esos pedidos</small>
                    </div>
                </div>
            </section>

            {/* Selector de semana */}
            <section className="dashboard-panel">
                <div className="dashboard-panel-header">
                    <div>
                        <h2>Elegir semana</h2>
                        <p>
                            Seleccioná cualquier día para consultar esa semana.
                            La fecha se ajustará automáticamente al lunes.
                        </p>
                    </div>
                </div>

                <div className="earnings-date-selector">
                    <label htmlFor="earnings-week">
                        Semana a consultar
                    </label>

                    <input
                        id="earnings-week"
                        type="date"
                        value={semanaSeleccionada}
                        onChange={cambiarSemana}
                    />
                </div>
            </section>

            {/* Detalle de los pedidos */}
            <section className="dashboard-panel">
                <div className="dashboard-panel-header">
                    <div>
                        <h2>Pedidos de la semana</h2>
                        <p>
                            {resumen.deLaSemana.length}{" "}
                            {resumen.deLaSemana.length === 1
                                ? "pedido con fecha de entrega"
                                : "pedidos con fecha de entrega"}{" "}
                            dentro de este período.
                        </p>
                    </div>
                </div>

                {resumen.deLaSemana.length === 0 ? (
                    <div className="orders-empty">
                        <div className="empty-icon" aria-hidden="true">
                            <Icon name="orders" />
                        </div>

                        <h2>No hay pedidos esta semana</h2>

                        <p>
                            Cuando tengas pedidos con fecha de entrega en esta
                            semana, aparecerán acá.
                        </p>
                    </div>
                ) : (
                    <div className="orders-list">
                        {resumen.deLaSemana.map((pedido) => {
                            const { total: precio, sena, saldo } = resumenPago(pedido);

                            return (
                                <div
                                    className="order-card-new"
                                    key={pedido.id}
                                >
                                    <div className="order-main-info">
                                        <h2>
                                            {pedido.tipo_prenda || "Pedido"}
                                        </h2>

                                        <p className="order-client">
                                            {pedido.clientes?.nombre ||
                                                "Sin cliente"}
                                        </p>

                                        <p className="order-description">
                                            Entrega:{" "}
                                            {pedido.fecha_entrega
                                                .split("-")
                                                .reverse()
                                                .join("/")}
                                        </p>
                                    </div>

                                    <div className="order-payment">
                                        <div>
                                            <span>Total del trabajo</span>
                                            <strong>{dinero(precio)}</strong>
                                        </div>

                                        <div>
                                            <span>Seña</span>
                                            <strong>{dinero(sena)}</strong>
                                        </div>

                                        <div>
                                            <span>Falta cobrar</span>
                                            <strong
                                                className={
                                                    saldo > 0
                                                        ? "saldo-pendiente"
                                                        : "saldo-pagado"
                                                }
                                            >
                                                {dinero(saldo)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

export default Earnings;
