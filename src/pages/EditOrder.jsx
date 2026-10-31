import OrderForm from "../components/OrderForm";

export default function EditOrder({ pedido, onBack, onSaved }) {
    return (
        <OrderForm
            key={pedido.id}
            pedido={pedido}
            onBack={onBack}
            onSaved={onSaved}
        />
    );
}
