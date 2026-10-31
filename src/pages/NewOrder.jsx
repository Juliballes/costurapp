import OrderForm from "../components/OrderForm";

export default function NewOrder({ onBack, onOrderCreated }) {
    return <OrderForm onBack={onBack} onSaved={onOrderCreated} />;
}
