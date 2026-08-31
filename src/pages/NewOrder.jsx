
import { useState } from "react";
import { supabase } from "../lib/supabase";

function NewOrder({ onBack, onOrderCreated }) {
    // =====================================================
    // CLIENTE
    // =====================================================

    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");

    // =====================================================
    // PEDIDO GENERAL
    // =====================================================

    const [fechaEntrega, setFechaEntrega] = useState("");
    const [estado, setEstado] = useState("En proceso");
    const [prioridad, setPrioridad] = useState("Normal");
    const [notas, setNotas] = useState("");

    // =====================================================
    // PRENDAS
    // =====================================================

    const [prendas, setPrendas] = useState([
        {
            id: Date.now(),
            tipoPrenda: "",
            cantidad: 1,
            descripcion: "",
            precio: "",
        },
    ]);

    // =====================================================
    // PAGO
    // =====================================================

    const [sena, setSena] = useState("");
    const [pagado, setPagado] = useState(false);

    // =====================================================
    // GUARDANDO
    // =====================================================

    const [guardando, setGuardando] = useState(false);

    // =====================================================
    // ICONOS
    // =====================================================

    const obtenerIcono = (tipo) => {
        switch (tipo) {
            case "Vestido":
                return "👗";
            case "Pantalón":
                return "👖";
            case "Blusa":
                return "👚";
            case "Camisa":
                return "👔";
            case "Saco":
                return "🧥";
            case "Falda":
                return "👗";
            default:
                return "🧵";
        }
    };

    // =====================================================
    // MODIFICAR PRENDA
    // =====================================================

    const actualizarPrenda = (id, campo, valor) => {
        setPrendas((actuales) =>
            actuales.map((prenda) =>
                prenda.id === id
                    ? {
                          ...prenda,
                          [campo]: valor,
                      }
                    : prenda
            )
        );
    };

    // =====================================================
    // AGREGAR PRENDA
    // =====================================================

    const agregarPrenda = () => {
        setPrendas((actuales) => [
            ...actuales,
            {
                id: Date.now() + Math.random(),
                tipoPrenda: "",
                cantidad: 1,
                descripcion: "",
                precio: "",
            },
        ]);
    };

    // =====================================================
    // ELIMINAR PRENDA
    // =====================================================

    const eliminarPrenda = (id) => {
        if (prendas.length === 1) {
            return;
        }

        setPrendas((actuales) =>
            actuales.filter((prenda) => prenda.id !== id)
        );
    };

    // =====================================================
    // CAMBIAR CANTIDAD
    // =====================================================

    const cambiarCantidad = (id, cantidad) => {
        const nuevaCantidad = Math.max(
            1,
            Number(cantidad) || 1
        );

        actualizarPrenda(
            id,
            "cantidad",
            nuevaCantidad
        );
    };

    // =====================================================
    // TOTAL DEL PEDIDO
    // =====================================================

    const precioTotal = prendas.reduce(
        (total, prenda) => {
            const precioUnitario =
                Number(prenda.precio) || 0;

            const cantidad =
                Number(prenda.cantidad) || 1;

            return (
                total +
                precioUnitario * cantidad
            );
        },
        0
    );

    // =====================================================
    // SEÑA
    // =====================================================

    const senaNumerica = Number(sena) || 0;

    // =====================================================
    // SALDO
    // =====================================================

    const saldoPendiente = pagado
        ? 0
        : Math.max(
              0,
              precioTotal - senaNumerica
          );

    // =====================================================
    // MARCAR PAGADO
    // =====================================================

    const cambiarEstadoPago = (nuevoEstado) => {
        if (nuevoEstado === "pagado") {
            setPagado(true);
            setSena(String(precioTotal));
        } else {
            setPagado(false);

            setSena((valorActual) => {
                const valor =
                    Number(valorActual) || 0;

                return valor > precioTotal
                    ? String(precioTotal)
                    : valorActual;
            });
        }
    };

    // =====================================================
    // CUANDO CAMBIA EL TOTAL
    // =====================================================

    const manejarCambioPrecio = (
        id,
        valor
    ) => {
        actualizarPrenda(
            id,
            "precio",
            valor
        );

        if (pagado) {
            const nuevoPrecioTotal =
                prendas.reduce(
                    (total, prenda) => {
                        const precioActual =
                            prenda.id === id
                                ? Number(valor) ||
                                  0
                                : Number(
                                      prenda.precio
                                  ) || 0;

                        const cantidad =
                            Number(
                                prenda.cantidad
                            ) || 1;

                        return (
                            total +
                            precioActual *
                                cantidad
                        );
                    },
                    0
                );

            setSena(
                String(
                    nuevoPrecioTotal
                )
            );
        }
    };

    // =====================================================
    // CREAR PEDIDO
    // =====================================================

    const crearPedido = async (e) => {
        e.preventDefault();

        if (guardando) {
            return;
        }

        // =================================================
        // VALIDACIONES
        // =================================================

        if (!nombre.trim()) {
            alert(
                "Por favor ingresá el nombre del cliente."
            );
            return;
        }

        if (!telefono.trim()) {
            alert(
                "Por favor ingresá el teléfono del cliente."
            );
            return;
        }

        if (!fechaEntrega) {
            alert(
                "Por favor seleccioná la fecha de entrega."
            );
            return;
        }

        if (prendas.length === 0) {
            alert(
                "Agregá al menos una prenda."
            );
            return;
        }

        const algunaSinTipo =
            prendas.some(
                (prenda) =>
                    !prenda.tipoPrenda
            );

        if (algunaSinTipo) {
            alert(
                "Seleccioná el tipo de prenda en todos los trabajos."
            );
            return;
        }

        const algunPrecioInvalido =
            prendas.some(
                (prenda) =>
                    Number(prenda.precio) < 0
            );

        if (algunPrecioInvalido) {
            alert(
                "Verificá los precios de las prendas."
            );
            return;
        }

        const senaFinal = pagado
            ? precioTotal
            : senaNumerica;

        if (senaFinal < 0) {
            alert(
                "La seña no puede ser negativa."
            );
            return;
        }

        if (senaFinal > precioTotal) {
            alert(
                "La seña no puede ser mayor al precio total."
            );
            return;
        }

        setGuardando(true);

        try {
            // =============================================
            // 1. BUSCAR CLIENTE
            // =============================================

            const telefonoLimpio =
                telefono.trim();

            const {
                data: clienteExistente,
                error: errorBusqueda,
            } = await supabase
                .from("clientes")
                .select(
                    "id, nombre, telefono"
                )
                .eq(
                    "telefono",
                    telefonoLimpio
                )
                .maybeSingle();

            if (errorBusqueda) {
                throw new Error(
                    "No se pudo buscar el cliente: " +
                        errorBusqueda.message
                );
            }

            let clienteId;

            // =============================================
            // 2. USAR CLIENTE EXISTENTE
            // =============================================

            if (clienteExistente) {
                clienteId =
                    clienteExistente.id;
            } else {
                // =========================================
                // 3. CREAR CLIENTE
                // =========================================

                const {
                    data: nuevoCliente,
                    error: errorCliente,
                } = await supabase
                    .from("clientes")
                    .insert([
                        {
                            nombre:
                                nombre.trim(),
                            telefono:
                                telefonoLimpio,
                        },
                    ])
                    .select("id")
                    .single();

                if (errorCliente) {
                    throw new Error(
                        "No se pudo crear el cliente: " +
                            errorCliente.message
                    );
                }

                if (!nuevoCliente) {
                    throw new Error(
                        "No se pudo obtener el cliente creado."
                    );
                }

                clienteId =
                    nuevoCliente.id;
            }

            // =============================================
            // 4. CREAR PEDIDO GENERAL
            // =============================================

            const primeraPrenda =
                prendas[0];

            const descripcionGeneral =
                prendas.length === 1
                    ? primeraPrenda.descripcion.trim()
                    : `Pedido con ${prendas.length} tipos de trabajo.`;

            const {
                data: nuevoPedido,
                error: errorPedido,
            } = await supabase
                .from("pedidos")
                .insert([
                    {
                        cliente_id:
                            clienteId,

                        tipo_prenda:
                            primeraPrenda.tipoPrenda,

                        fecha_entrega:
                            fechaEntrega,

                        descripcion:
                            descripcionGeneral,

                        precio:
                            precioTotal,

                        sena:
                            senaFinal,

                        estado:
                            estado,

                        prioridad:
                            prioridad,

                        notas:
                            notas.trim(),

                        pagado:
                            pagado,
                    },
                ])
                .select()
                .single();

            if (errorPedido) {
                throw new Error(
                    "No se pudo crear el pedido: " +
                        errorPedido.message
                );
            }

            if (!nuevoPedido) {
                throw new Error(
                    "No se pudo obtener el pedido creado."
                );
            }

            // =============================================
            // 5. CREAR PRENDAS
            // =============================================

            const prendasParaGuardar =
                prendas.map((prenda) => ({
                    pedido_id:
                        nuevoPedido.id,

                    tipo_prenda:
                        prenda.tipoPrenda,

                    cantidad:
                        Number(
                            prenda.cantidad
                        ) || 1,

                    descripcion:
                        prenda.descripcion.trim(),

                    precio:
                        Number(
                            prenda.precio
                        ) || 0,
                }));

            const {
                error: errorPrendas,
            } = await supabase
                .from("pedido_prendas")
                .insert(
                    prendasParaGuardar
                );

            if (errorPrendas) {
                await supabase
                    .from("pedidos")
                    .delete()
                    .eq(
                        "id",
                        nuevoPedido.id
                    );

                throw new Error(
                    "No se pudieron guardar las prendas: " +
                        errorPrendas.message
                );
            }

            // =============================================
            // 6. ÉXITO
            // =============================================

            alert(
                pagado
                    ? "¡Pedido creado y marcado como pagado! 🧵💚"
                    : "¡Pedido creado correctamente! 🧵❤️"
            );

            // Limpiar

            setNombre("");
            setTelefono("");
            setFechaEntrega("");
            setEstado("En proceso");
            setPrioridad("Normal");
            setNotas("");
            setSena("");
            setPagado(false);

            setPrendas([
                {
                    id:
                        Date.now() +
                        Math.random(),
                    tipoPrenda: "",
                    cantidad: 1,
                    descripcion: "",
                    precio: "",
                },
            ]);

            if (onOrderCreated) {
                await onOrderCreated();
            } else if (onBack) {
                onBack();
            }
        } catch (error) {
            console.error(
                "Error creando pedido:",
                error
            );

            alert(
                "No se pudo crear el pedido.\n\n" +
                    error.message
            );
        } finally {
            setGuardando(false);
        }
    };

    // =====================================================
    // CANCELAR
    // =====================================================

    const cancelar = () => {
        if (guardando) {
            return;
        }

        onBack();
    };

    // =====================================================
    // INTERFAZ
    // =====================================================

    return (
        <div className="new-order-page">
            {/* =============================================
                ENCABEZADO
            ============================================= */}

            <div className="page-header">
                <div>
                    <h1>
                        Nuevo pedido 🧵
                    </h1>

                    <p>
                        Cargá todos los trabajos
                        de una misma clienta.
                    </p>
                </div>

                <button
                    className="back-button"
                    onClick={cancelar}
                    disabled={guardando}
                >
                    ← Volver
                </button>
            </div>

            <form
                className="order-form"
                onSubmit={crearPedido}
            >
                {/* =========================================
                    CLIENTE
                ========================================= */}

                <div className="form-section">
                    <h2>
                        👤 Datos del cliente
                    </h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>
                                Nombre del cliente
                            </label>

                            <input
                                type="text"
                                placeholder="Ej: Susana González"
                                value={nombre}
                                onChange={(e) =>
                                    setNombre(
                                        e.target
                                            .value
                                    )
                                }
                                disabled={
                                    guardando
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                Teléfono
                            </label>

                            <input
                                type="tel"
                                placeholder="Ej: 11 1234-5678"
                                value={telefono}
                                onChange={(e) =>
                                    setTelefono(
                                        e.target
                                            .value
                                    )
                                }
                                disabled={
                                    guardando
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* =========================================
                    TRABAJOS
                ========================================= */}

                <div className="form-section">
                    <div
                        className="section-header"
                        style={{
                            marginBottom:
                                "20px",
                        }}
                    >
                        <div>
                            <h2>
                                🧵 Trabajos del pedido
                            </h2>

                            <p>
                                Podés agregar varias
                                prendas para la misma
                                clienta.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="new-order-button"
                            onClick={
                                agregarPrenda
                            }
                            disabled={
                                guardando
                            }
                        >
                            ＋ Agregar prenda
                        </button>
                    </div>

                    <div
                        style={{
                            display:
                                "flex",
                            flexDirection:
                                "column",
                            gap: "16px",
                        }}
                    >
                        {prendas.map(
                            (
                                prenda,
                                index
                            ) => (
                                <div
                                    key={
                                        prenda.id
                                    }
                                    className="garment-card"
                                >
                                    {/* CABECERA */}

                                    <div className="garment-header">
                                        <div className="garment-title">
                                            <span className="garment-icon">
                                                {obtenerIcono(
                                                    prenda.tipoPrenda
                                                )}
                                            </span>

                                            <div>
                                                <strong>
                                                    Trabajo{" "}
                                                    {index +
                                                        1}
                                                </strong>

                                                <small>
                                                    Prenda del pedido
                                                </small>
                                            </div>
                                        </div>

                                        {prendas.length >
                                            1 && (
                                            <button
                                                type="button"
                                                className="remove-garment-button"
                                                onClick={() =>
                                                    eliminarPrenda(
                                                        prenda.id
                                                    )
                                                }
                                                disabled={
                                                    guardando
                                                }
                                                title="Eliminar prenda"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>

                                    {/* CAMPOS */}

                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>
                                                Tipo de prenda
                                            </label>

                                            <select
                                                value={
                                                    prenda.tipoPrenda
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    actualizarPrenda(
                                                        prenda.id,
                                                        "tipoPrenda",
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                disabled={
                                                    guardando
                                                }
                                                required
                                            >
                                                <option value="">
                                                    Seleccionar
                                                    prenda
                                                </option>

                                                <option value="Vestido">
                                                    👗 Vestido
                                                </option>

                                                <option value="Pantalón">
                                                    👖 Pantalón
                                                </option>

                                                <option value="Blusa">
                                                    👚 Blusa
                                                </option>

                                                <option value="Camisa">
                                                    👔 Camisa
                                                </option>

                                                <option value="Saco">
                                                    🧥 Saco
                                                </option>

                                                <option value="Falda">
                                                    👗 Falda
                                                </option>

                                                <option value="Otro">
                                                    🧵 Otro
                                                </option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                Cantidad
                                            </label>

                                            <div className="quantity-control">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        cambiarCantidad(
                                                            prenda.id,
                                                            prenda.cantidad -
                                                                1
                                                        )
                                                    }
                                                    disabled={
                                                        guardando ||
                                                        prenda.cantidad <=
                                                            1
                                                    }
                                                >
                                                    −
                                                </button>

                                                <span>
                                                    {
                                                        prenda.cantidad
                                                    }
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        cambiarCantidad(
                                                            prenda.id,
                                                            prenda.cantidad +
                                                                1
                                                        )
                                                    }
                                                    disabled={
                                                        guardando
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>
                                                Descripción del trabajo
                                            </label>

                                            <textarea
                                                rows="3"
                                                placeholder="Ej: Ajustar cintura..."
                                                value={
                                                    prenda.descripcion
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    actualizarPrenda(
                                                        prenda.id,
                                                        "descripcion",
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                disabled={
                                                    guardando
                                                }
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                Precio por unidad
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="$ 0"
                                                value={
                                                    prenda.precio
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    manejarCambioPrecio(
                                                        prenda.id,
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                disabled={
                                                    guardando
                                                }
                                            />

                                            <small className="form-help">
                                                Total de esta
                                                prenda:{" "}
                                                <strong>
                                                    $
                                                    {(
                                                        (Number(
                                                            prenda.precio
                                                        ) ||
                                                            0) *
                                                        (Number(
                                                            prenda.cantidad
                                                        ) ||
                                                            1)
                                                    ).toLocaleString(
                                                        "es-AR"
                                                    )}
                                                </strong>
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* =========================================
                    FECHA
                ========================================= */}

                <div className="form-section">
                    <h2>
                        📅 Entrega
                    </h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>
                                Fecha de entrega
                            </label>

                            <input
                                type="date"
                                value={
                                    fechaEntrega
                                }
                                onChange={(e) =>
                                    setFechaEntrega(
                                        e.target
                                            .value
                                    )
                                }
                                disabled={
                                    guardando
                                }
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* =========================================
                    PAGO
                ========================================= */}

                <div className="form-section">
                    <h2>
                        💰 Información de pago
                    </h2>

                    <div className="payment-summary">
                        <div className="payment-summary-item">
                            <span>
                                Total del pedido
                            </span>

                            <strong>
                                $
                                {precioTotal.toLocaleString(
                                    "es-AR"
                                )}
                            </strong>
                        </div>

                        <div className="payment-summary-item">
                            <span>
                                Seña
                            </span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="$ 0"
                                value={sena}
                                onChange={(e) => {
                                    const valor =
                                        e.target
                                            .value;

                                    setSena(valor);

                                    if (
                                        Number(
                                            valor
                                        ) <
                                            precioTotal
                                    ) {
                                        setPagado(
                                            false
                                        );
                                    }
                                }}
                                disabled={
                                    guardando ||
                                    pagado
                                }
                            />
                        </div>

                        <div className="payment-summary-item">
                            <span>
                                Saldo pendiente
                            </span>

                            <strong
                                className={
                                    saldoPendiente >
                                    0
                                        ? "saldo-pendiente"
                                        : "saldo-pagado"
                                }
                            >
                                $
                                {saldoPendiente.toLocaleString(
                                    "es-AR"
                                )}
                            </strong>
                        </div>
                    </div>

                    {/* ESTADO DE PAGO */}

                    <div className="payment-status-container">
                        <span className="payment-status-label">
                            Estado del pago
                        </span>

                        <div className="payment-status-options">
                            <button
                                type="button"
                                className={
                                    !pagado
                                        ? "payment-status-button pending active"
                                        : "payment-status-button pending"
                                }
                                onClick={() =>
                                    cambiarEstadoPago(
                                        "pendiente"
                                    )
                                }
                                disabled={
                                    guardando
                                }
                            >
                                ⏳ Pago pendiente
                            </button>

                            <button
                                type="button"
                                className={
                                    pagado
                                        ? "payment-status-button paid active"
                                        : "payment-status-button paid"
                                }
                                onClick={() =>
                                    cambiarEstadoPago(
                                        "pagado"
                                    )
                                }
                                disabled={
                                    guardando
                                }
                            >
                                ✅ Pagado
                            </button>
                        </div>

                        <small className="payment-status-help">
                            El estado del pago es
                            independiente del estado
                            del trabajo.
                        </small>
                    </div>
                </div>

                {/* =========================================
                    ESTADO
                ========================================= */}

                <div className="form-section">
                    <h2>
                        📌 Estado del pedido
                    </h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>
                                Estado
                            </label>

                            <select
                                value={estado}
                                onChange={(e) =>
                                    setEstado(
                                        e.target
                                            .value
                                    )
                                }
                                disabled={
                                    guardando
                                }
                            >
                                <option value="En proceso">
                                    🟡 En proceso
                                </option>

                                <option value="Listo">
                                    🟢 Listo
                                </option>

                                <option value="Entregado">
                                    ⚪ Entregado
                                </option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                Prioridad
                            </label>

                            <select
                                value={prioridad}
                                onChange={(e) =>
                                    setPrioridad(
                                        e.target
                                            .value
                                    )
                                }
                                disabled={
                                    guardando
                                }
                            >
                                <option value="Normal">
                                    🟢 Normal
                                </option>

                                <option value="Urgente">
                                    🔴 Urgente
                                </option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>
                            Notas generales
                        </label>

                        <textarea
                            rows="3"
                            placeholder="Cualquier detalle importante..."
                            value={notas}
                            onChange={(e) =>
                                setNotas(
                                    e.target
                                        .value
                                )
                            }
                            disabled={
                                guardando
                            }
                        />
                    </div>
                </div>

                {/* =========================================
                    BOTONES
                ========================================= */}

                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-button"
                        onClick={cancelar}
                        disabled={
                            guardando
                        }
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="save-button"
                        disabled={
                            guardando
                        }
                    >
                        {guardando
                            ? "Guardando..."
                            : "✓ Crear pedido"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default NewOrder;
