import Icon, { GarmentIcon } from "./Icon";
import {
    formatearDinero,
    resumenPago,
    subtotalPrenda,
} from "../lib/orderTotals";
import { coincideFecha, esAntiguo } from "../lib/orderOrganization";

export default function OrganizedOrderCard({
    pedido,
    ocupado,
    onView,
    onEdit,
    onReady,
    onDeliver,
    onReactivate,
    onWhatsapp,
    onDelete,
}) {
    const antiguo = esAntiguo(pedido);
    const { total, saldo } = resumenPago(pedido);
    const prendas = pedido.pedido_prendas?.length
        ? pedido.pedido_prendas
        : [
              {
                  tipo_prenda: pedido.tipo_prenda || "Trabajo",
                  cantidad: 1,
                  descripcion: pedido.descripcion,
                  precio: total,
              },
          ];
    const fecha = pedido.fecha_entrega
        ? pedido.fecha_entrega.split("-").reverse().join("/")
        : "Sin fecha";
    const atraso = coincideFecha(pedido, "Atrasados");
    return (
        <article
            className={`organized-order-card ${antiguo ? "is-archived" : ""}`}
            aria-label={`Pedido ${pedido.id} de ${pedido.clientes?.nombre || "Sin cliente"}`}
        >
            <header className="organized-card-header">
                <div className="organized-client">
                    <span className="organized-garment-icon">
                        <GarmentIcon tipo={prendas[0].tipo_prenda} />
                    </span>
                    <div>
                        <span className="organized-order-number">
                            PEDIDO #{pedido.id}
                        </span>
                        <h2>{pedido.clientes?.nombre || "Sin cliente"}</h2>
                    </div>
                </div>
                <div className="organized-badges">
                    <span
                        className={`organized-status ${antiguo ? "delivered" : pedido.estado === "Listo" ? "ready" : "working"}`}
                    >
                        {pedido.estado === "Listo"
                            ? "Listo para retirar"
                            : pedido.estado || "En proceso"}
                    </span>
                    {!antiguo && pedido.prioridad === "Urgente" && (
                        <span className="organized-urgent">
                            <Icon name="alert" />
                            Urgente
                        </span>
                    )}
                    {atraso && (
                        <span className="organized-overdue">
                            Entrega atrasada
                        </span>
                    )}
                </div>
            </header>
            <div className="organized-card-body">
                <div className="organized-work-list">
                    <ul>
                        {prendas.slice(0, 3).map((p, i) => (
                            <li key={p.id ?? i}>
                                <div>
                                    <strong>
                                        {p.tipo_prenda}{" "}
                                        <span>× {p.cantidad ?? 1}</span>
                                    </strong>
                                    {p.descripcion && (
                                        <p title={p.descripcion}>
                                            {p.descripcion}
                                        </p>
                                    )}
                                </div>
                                <span>
                                    {formatearDinero(subtotalPrenda(p))}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {prendas.length > 3 && (
                        <button
                            type="button"
                            className="organized-more-work"
                            onClick={() => onView(pedido)}
                        >
                            Ver los {prendas.length} trabajos
                        </button>
                    )}
                </div>
                <dl className="organized-facts">
                    <div>
                        <dt>
                            <Icon name="calendar" />
                            Entrega prevista
                        </dt>
                        <dd>{fecha}</dd>
                    </div>
                    <div>
                        <dt>Total del pedido</dt>
                        <dd>{formatearDinero(total)}</dd>
                    </div>
                    <div>
                        <dt>Saldo pendiente</dt>
                        <dd
                            className={saldo > 0 ? "has-balance" : "no-balance"}
                        >
                            {formatearDinero(saldo)}
                        </dd>
                        {saldo === 0 && <small>Sin saldo pendiente</small>}
                    </div>
                </dl>
            </div>
            <footer className="organized-card-footer">
                <div className="organized-workflow">
                    {antiguo ? (
                        <button
                            type="button"
                            className="organized-secondary"
                            disabled={ocupado}
                            onClick={() => onReactivate(pedido)}
                        >
                            <Icon name="thread" />
                            Reactivar
                        </button>
                    ) : pedido.estado === "Listo" ? (
                        <>
                            <button
                                type="button"
                                className="organized-primary"
                                disabled={ocupado}
                                onClick={() => onDeliver(pedido)}
                            >
                                <Icon name="check" />
                                Marcar entregado
                            </button>
                            <button
                                type="button"
                                className="organized-secondary"
                                aria-label="Avisar por WhatsApp"
                                disabled={ocupado}
                                onClick={() => onWhatsapp(pedido)}
                            >
                                <Icon name="message" />
                                Avisar
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="organized-primary"
                            disabled={ocupado}
                            onClick={() => onReady(pedido)}
                        >
                            <Icon name="checkCircle" />
                            Marcar listo
                        </button>
                    )}
                </div>
                <div className="organized-secondary-actions">
                    <button
                        type="button"
                        className="organized-secondary"
                        disabled={ocupado}
                        onClick={() => onView(pedido)}
                    >
                        <Icon name="eye" />
                        Ver pedido
                    </button>
                    <button
                        type="button"
                        className="organized-secondary"
                        disabled={ocupado}
                        onClick={() => onEdit(pedido)}
                    >
                        <Icon name="edit" />
                        Editar
                    </button>
                    <details className="organized-more-actions">
                        <summary
                            aria-label={`Más opciones del pedido ${pedido.id}`}
                        >
                            Más <span aria-hidden="true">⋯</span>
                        </summary>
                        <button
                            type="button"
                            disabled={ocupado}
                            onClick={(event) => {
                                event.currentTarget.closest("details").open =
                                    false;
                                onDelete(pedido);
                            }}
                        >
                            <Icon name="trash" />
                            Eliminar pedido
                        </button>
                    </details>
                </div>
            </footer>
        </article>
    );
}
