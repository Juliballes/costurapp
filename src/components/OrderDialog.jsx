import { useEffect, useId, useRef } from "react";

export default function OrderDialog({
    titulo,
    onClose,
    ocupado = false,
    children,
}) {
    const dialogo = useRef(null);
    const id = useId();
    useEffect(() => {
        const nodo = dialogo.current;
        nodo.showModal();
        nodo.querySelector("h2")?.focus({ preventScroll: true });
        return () => nodo.close();
    }, []);
    return (
        <dialog
            ref={dialogo}
            className="orders-dialog"
            aria-labelledby={id}
            onCancel={(event) => {
                event.preventDefault();
                if (!ocupado) onClose();
            }}
            onClick={(event) => {
                if (event.target !== dialogo.current || ocupado) return;
                const rect = dialogo.current.getBoundingClientRect();
                if (
                    event.clientX < rect.left ||
                    event.clientX > rect.right ||
                    event.clientY < rect.top ||
                    event.clientY > rect.bottom
                )
                    onClose();
            }}
        >
            <h2 id={id} tabIndex="-1">
                {titulo}
            </h2>
            {children}
        </dialog>
    );
}
