import { useId, useState } from "react";
import Icon from "./Icon";
import OrderDialog from "./OrderDialog";
import { formatearDinero, resumenPago } from "../lib/orderTotals";

const estados = [
    {
        valor: "Pendiente",
        icono: "clock",
        texto: "Recibido, todavía sin empezar.",
    },
    {
        valor: "En proceso",
        icono: "thread",
        texto: "El trabajo está en marcha.",
    },
    {
        valor: "Listo",
        etiqueta: "Listo para retirar",
        icono: "checkCircle",
        texto: "Terminaste el trabajo. Podés avisarle al cliente.",
    },
    {
        valor: "Entregado",
        icono: "check",
        texto: "El cliente ya lo retiró. Pasará a Antiguos.",
    },
];

export default function OrderStatusDialog({
    pedido,
    ocupado,
    error,
    onSave,
    onClose,
}) {
    const [estado, setEstado] = useState(pedido.estado || "");
    const grupo = useId();
    return (
        <OrderDialog
            titulo="Cambiar estado"
            ocupado={ocupado}
            onClose={onClose}
        >
            <p>
                Pedido #{pedido.id} de{" "}
                <strong>{pedido.clientes?.nombre || "tu cliente"}</strong>.{" "}
                Elegí cómo va el trabajo.
            </p>
            <fieldset className="order-state-options" disabled={ocupado}>
                <legend>Estado del pedido</legend>
                {estados.map(({ valor, etiqueta, icono, texto }) => (
                    <label
                        key={valor}
                        className={estado === valor ? "is-selected" : ""}
                    >
                        <input
                            type="radio"
                            name={grupo}
                            value={valor}
                            checked={estado === valor}
                            onChange={() => setEstado(valor)}
                        />
                        <Icon name={icono} />
                        <span>
                            <strong>{etiqueta || valor}</strong>
                            <small>{texto}</small>
                        </span>
                        {pedido.estado === valor && <em>Actual</em>}
                    </label>
                ))}
            </fieldset>
            <p className="order-confirm-balance">
                {estado === "Entregado"
                    ? "Confirmá este estado cuando la prenda ya haya sido retirada. "
                    : pedido.estado === "Entregado"
                      ? "El pedido volverá a Activos. "
                      : ""}
                Saldo pendiente:{" "}
                <strong>{formatearDinero(resumenPago(pedido).saldo)}</strong>.
                Cambiar el estado no modifica los pagos.
            </p>
            {error && (
                <p className="field-error" role="alert">
                    {error}
                </p>
            )}
            <div className="orders-dialog-actions">
                <button
                    type="button"
                    className="organized-secondary"
                    disabled={ocupado}
                    onClick={onClose}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    className="organized-primary"
                    disabled={ocupado || !estado || estado === pedido.estado}
                    onClick={() => onSave(estado)}
                >
                    {ocupado
                        ? "Guardando…"
                        : estado === "Entregado"
                          ? "Confirmar entrega"
                          : "Guardar estado"}
                </button>
            </div>
        </OrderDialog>
    );
}
