import { useState } from "react";
import { WorkOrderContext } from "../context/WorkOrderContext";

export default function WorkOrderProvider({ children }) {
    const [boleta, setBoleta] = useState(null);
    function abrirBoleta(pedido) {
        // Una instantánea del guardado confirmado: los refrescos no cambian un documento abierto.
        setBoleta({ pedido: structuredClone(pedido), emision: new Date() });
    }
    return (
        <WorkOrderContext.Provider
            value={{ boleta, abrirBoleta, cerrarBoleta: () => setBoleta(null) }}
        >
            {children}
        </WorkOrderContext.Provider>
    );
}
