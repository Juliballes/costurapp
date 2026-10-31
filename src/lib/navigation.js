let navegando = false;

export function navegar(accion) {
    if (navegando) return accion();
    if (
        !window.dispatchEvent(
            new Event("costurapp:navegar", { cancelable: true }),
        )
    )
        return;
    navegando = true;
    try {
        return accion();
    } finally {
        navegando = false;
    }
}
