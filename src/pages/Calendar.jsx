import Icon, { GarmentIcon } from "../components/Icon";

import { useMemo, useState } from "react";
import "./Calendar.css";

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const diasSemana = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

function Calendar({ pedidos = [], onBack, onEditOrder }) {
  const hoy = new Date();

  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // =========================================
  // NAVEGACIÓN ENTRE MESES
  // =========================================

  const cambiarMes = (cantidad) => {
    const nuevaFecha = new Date(anio, mes + cantidad, 1);

    setMes(nuevaFecha.getMonth());
    setAnio(nuevaFecha.getFullYear());
    setDiaSeleccionado(null);
  };

  const volverHoy = () => {
    setMes(hoy.getMonth());
    setAnio(hoy.getFullYear());
    setDiaSeleccionado(null);
  };

  // =========================================
  // DÍAS DEL MES
  // =========================================

  const diasDelMes = useMemo(() => {
    const primerDia = new Date(anio, mes, 1);

    // JavaScript:
    // Domingo = 0
    // Lunes = 1
    //
    // Lo convertimos para que:
    // Lunes = 0
    // Domingo = 6

    const primerDiaSemana = (primerDia.getDay() + 6) % 7;

    const cantidadDias = new Date(
      anio,
      mes + 1,
      0
    ).getDate();

    const dias = [];

    // Espacios antes del primer día
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }

    // Días del mes
    for (let dia = 1; dia <= cantidadDias; dia++) {
      dias.push(dia);
    }

    return dias;
  }, [mes, anio]);

  // =========================================
  // CONSTRUIR FECHA
  // =========================================

  const obtenerFecha = (dia) => {
    if (!dia) return null;

    return `${anio}-${String(mes + 1).padStart(
      2,
      "0"
    )}-${String(dia).padStart(2, "0")}`;
  };

  // =========================================
  // PEDIDOS DE UN DÍA
  // =========================================

  const obtenerPedidosDelDia = (dia) => {
    const fecha = obtenerFecha(dia);

    if (!fecha) return [];

    return pedidos.filter(
      (pedido) => pedido.fecha_entrega === fecha
    );
  };

  // =========================================
  // ¿ES HOY?
  // =========================================

  const esHoy = (dia) => {
    if (!dia) return false;

    return (
      dia === hoy.getDate() &&
      mes === hoy.getMonth() &&
      anio === hoy.getFullYear()
    );
  };

  // =========================================
  // SELECCIONAR DÍA
  // =========================================

  const seleccionarDia = (dia) => {
    if (!dia) return;

    setDiaSeleccionado(dia);
  };

  // =========================================
  // PEDIDOS DEL PANEL LATERAL
  // =========================================

  const pedidosSeleccionados = diaSeleccionado
    ? obtenerPedidosDelDia(diaSeleccionado)
    : [];

  // =========================================
  // ICONO SEGÚN PRENDA
  // =========================================

  const obtenerIconoPrenda = (tipoPrenda) => <GarmentIcon tipo={tipoPrenda} />;

  // =========================================
  // CLASE DEL ESTADO
  // =========================================

  const obtenerClaseEstado = (estado) => {
    if (!estado) return "";

    return estado
      .toLowerCase()
      .replaceAll(" ", "-");
  };

  return (
    <div className="calendar-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="calendar-header">

        <div className="calendar-header-left">

          {onBack && (
            <button
              className="calendar-back-button"
              onClick={onBack}
              title="Volver"
            >
              ←
            </button>
          )}

          <div>

            <div className="calendar-title-row">

              <span className="calendar-title-icon">
                <Icon name="calendar" />
              </span>

              <h1>Calendario</h1>

            </div>

            <p>
              Organizá tus entregas y trabajos
            </p>

          </div>

        </div>

        <button
          className="today-button"
          onClick={volverHoy}
        >
          Hoy
        </button>

      </header>

      {/* =====================================
          CONTENIDO
      ===================================== */}

      <main className="calendar-content">

        {/* ===================================
            CALENDARIO PRINCIPAL
        =================================== */}

        <section
          className={`calendar-main ${
            diaSeleccionado
              ? "with-sidebar"
              : ""
          }`}
        >

          {/* =================================
              BARRA DEL MES
          ================================= */}

          <div className="month-toolbar">

            <div className="month-navigation">

              <button
                className="month-arrow"
                onClick={() => cambiarMes(-1)}
                aria-label="Mes anterior"
              >
                ‹
              </button>

              <h2>
                {meses[mes]} {anio}
              </h2>

              <button
                className="month-arrow"
                onClick={() => cambiarMes(1)}
                aria-label="Mes siguiente"
              >
                ›
              </button>

            </div>

            <div className="calendar-legend">

              <span>
                <i className="legend-dot neutral"></i>
                Sin pedidos
              </span>

              <span>
                <i className="legend-dot pending"></i>
                Con pedidos
              </span>

              <span>
                <i className="legend-dot urgent"></i>
                Urgente
              </span>

            </div>

          </div>

          {/* =================================
              CALENDARIO
          ================================= */}

          <div className="calendar-card">

            {/* DÍAS DE LA SEMANA */}

            <div className="week-header">

              {diasSemana.map((dia) => (
                <div
                  key={dia}
                  className="week-day"
                >
                  {dia}
                </div>
              ))}

            </div>

            {/* DÍAS */}

            <div className="calendar-grid">

              {diasDelMes.map((dia, index) => {

                const pedidosDia =
                  obtenerPedidosDelDia(dia);

                const tieneUrgente =
                  pedidosDia.some(
                    (pedido) =>
                      pedido.prioridad ===
                      "Urgente"
                  );

                return (
                  <button
                    key={`${dia}-${index}`}
                    className={`
                      calendar-day
                      ${!dia ? "empty-day" : ""}
                      ${esHoy(dia) ? "today" : ""}
                      ${
                        diaSeleccionado === dia
                          ? "selected"
                          : ""
                      }
                      ${
                        tieneUrgente
                          ? "has-urgent"
                          : ""
                      }
                    `}
                    onClick={() =>
                      seleccionarDia(dia)
                    }
                    disabled={!dia}
                  >

                    {dia && (
                      <>

                        {/* NÚMERO DEL DÍA */}

                        <div className="day-number">

                          <span>
                            {dia}
                          </span>

                          {esHoy(dia) && (
                            <small>
                              Hoy
                            </small>
                          )}

                        </div>

                        {/* PEDIDOS */}

                        <div className="day-orders">

                          {pedidosDia.length > 0 ? (
                            <>

                              {pedidosDia
                                .slice(0, 3)
                                .map((pedido) => {

                                  const urgente =
                                    pedido.prioridad ===
                                    "Urgente";

                                  return (
                                    <div
                                      key={pedido.id}
                                      className={`
                                        mini-order
                                        ${
                                          urgente
                                            ? "urgent"
                                            : ""
                                        }
                                      `}
                                    >

                                      <span className="mini-order-dot"></span>

                                      <span className="mini-order-name">

                                        {obtenerIconoPrenda(
                                          pedido.tipo_prenda
                                        )}

                                        {" "}

                                        {pedido.tipo_prenda ||
                                          "Pedido"}

                                      </span>

                                    </div>
                                  );
                                })}

                              {pedidosDia.length > 3 && (
                                <span className="more-orders">
                                  +{pedidosDia.length - 3} más
                                </span>
                              )}

                            </>
                          ) : (
                            <span className="empty-day-text">
                              Sin pedidos
                            </span>
                          )}

                        </div>

                        {/* CANTIDAD */}

                        {pedidosDia.length > 0 && (
                          <div
                            className={`
                              order-count
                              ${
                                tieneUrgente
                                  ? "urgent"
                                  : ""
                              }
                            `}
                          >
                            {pedidosDia.length}
                          </div>
                        )}

                      </>
                    )}

                  </button>
                );
              })}

            </div>

          </div>

        </section>

        {/* ===================================
            PANEL LATERAL
        =================================== */}

        {diaSeleccionado && (

          <aside className="calendar-sidebar">

            {/* HEADER PANEL */}

            <div className="sidebar-header">

              <div>

                <span className="sidebar-date-label">
                  {meses[mes]}
                </span>

                <h3>
                  {diaSeleccionado} de{" "}
                  {meses[mes]}
                </h3>

              </div>

              <button
                className="close-sidebar"
                onClick={() =>
                  setDiaSeleccionado(null)
                }
                aria-label="Cerrar"
              >
                ×
              </button>

            </div>

            {/* CONTENIDO PANEL */}

            <div className="sidebar-content">

              {pedidosSeleccionados.length === 0 ? (

                <div className="no-orders">

                  <div className="no-orders-icon">
                    <Icon name="orders" />
                  </div>

                  <h4>
                    No hay pedidos
                  </h4>

                  <p>
                    No hay entregas programadas
                    para este día.
                  </p>

                </div>

              ) : (

                <>

                  {/* RESUMEN */}

                  <div className="sidebar-summary">

                    <strong>
                      {pedidosSeleccionados.length}
                    </strong>

                    <span>
                      {pedidosSeleccionados.length === 1
                        ? "pedido"
                        : "pedidos"}
                    </span>

                  </div>

                  {/* PEDIDOS */}

                  <div className="sidebar-orders">

                    {pedidosSeleccionados.map(
                      (pedido) => {

                        const urgente =
                          pedido.prioridad ===
                          "Urgente";

                        return (
                          <div
                            className={`
                              order-card
                              ${
                                urgente
                                  ? "urgent-card"
                                  : ""
                              }
                            `}
                            key={pedido.id}
                          >

                            {/* PARTE SUPERIOR */}

                            <div className="order-card-top">

                              <span className="order-type">

                                {obtenerIconoPrenda(
                                  pedido.tipo_prenda
                                )}

                                {" "}

                                {pedido.tipo_prenda ||
                                  "Pedido"}

                              </span>

                              {urgente && (
                                <span className="urgent-badge">
                                  Urgente
                                </span>
                              )}

                            </div>

                            {/* CLIENTE */}

                            <h4>
                              {pedido.clientes?.nombre ||
                                "Sin cliente"}
                            </h4>

                            {/* DESCRIPCIÓN */}

                            {pedido.descripcion && (
                              <p className="calendar-order-description">
                                {pedido.descripcion}
                              </p>
                            )}

                            {/* ESTADO */}

                            <span
                              className={`
                                status-badge
                                status-${obtenerClaseEstado(
                                  pedido.estado
                                )}
                              `}
                            >
                              {pedido.estado ===
                              "Entregado"
                                ? "Entregado"
                                : pedido.estado ===
                                  "Listo"
                                ? "Listo"
                                : pedido.estado ===
                                  "En proceso"
                                ? "En proceso"
                                : pedido.estado ||
                                  "Pendiente"}
                            </span>

                            {/* FECHA */}

                            <div className="calendar-order-date">
                              <span>
                                Entrega
                              </span>

                              <strong>
                                {pedido.fecha_entrega ||
                                  "Sin fecha"}
                              </strong>
                            </div>

                            {/* EDITAR */}

                            <button
                              className="edit-order-button"
                              onClick={() => {
                                if (onEditOrder) {
                                  onEditOrder(pedido);
                                } else {
                                  console.log(
                                    "Editar pedido:",
                                    pedido
                                  );
                                }
                              }}
                            >
                              <Icon name="edit" /> Editar pedido
                            </button>

                          </div>
                        );
                      }
                    )}

                  </div>

                </>
              )}

            </div>

          </aside>
        )}

      </main>

    </div>
  );
}

export default Calendar;
