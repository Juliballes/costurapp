import { useEffect, useRef } from "react";

export function useUnsavedChanges(hayCambios, guardando = false) {
    const liberado = useRef(false);
    useEffect(() => {
        if (hayCambios) liberado.current = false;
    }, [hayCambios]);
    useEffect(() => {
        const antesDeSalir = (event) => {
            if (liberado.current) return;
            if (
                guardando ||
                (hayCambios &&
                    !window.confirm(
                        "Tenés cambios sin guardar. ¿Querés salir y descartarlos?",
                    ))
            )
                event.preventDefault();
        };
        const antesDeCerrar = (event) => {
            if (!liberado.current && (hayCambios || guardando)) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("costurapp:navegar", antesDeSalir);
        window.addEventListener("beforeunload", antesDeCerrar);
        return () => {
            window.removeEventListener("costurapp:navegar", antesDeSalir);
            window.removeEventListener("beforeunload", antesDeCerrar);
        };
    }, [hayCambios, guardando]);
    return () => {
        liberado.current = true;
    };
}
