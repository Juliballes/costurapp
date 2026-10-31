// Formato internacional para comparar clientes y abrir WhatsApp.
export function normalizarTelefono(valor) {
    const texto = String(valor ?? "").trim();
    let numero = texto.replace(/\D/g, "");
    if (numero.startsWith("00")) numero = numero.slice(2);
    const internacional = texto.startsWith("+") || texto.startsWith("00");
    if (internacional && !numero.startsWith("54")) {
        return /^[1-9]\d{7,14}$/.test(numero) ? numero : null;
    }
    if (numero.startsWith("54") && numero.length >= 12)
        numero = numero.slice(2);
    if (numero.length === 11 && numero.startsWith("9"))
        numero = numero.slice(1);
    if (numero.startsWith("0")) numero = numero.slice(1);
    // En Argentina el 15 se escribe después de la característica (2 a 4 dígitos).
    if (numero.length === 12) {
        for (const largo of [2, 3, 4]) {
            if (numero.slice(largo, largo + 2) === "15") {
                numero = numero.slice(0, largo) + numero.slice(largo + 2);
                break;
            }
        }
    }
    return /^[1-3]\d{9}$/.test(numero) && !numero.startsWith("15")
        ? `549${numero}`
        : null;
}
