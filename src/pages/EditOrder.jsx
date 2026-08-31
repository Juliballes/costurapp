import { useState } from "react";
import { supabase } from "../lib/supabase";

function EditOrder({ pedido, onBack, onSaved }) {
  const [tipoPrenda, setTipoPrenda] = useState(
    pedido?.tipo_prenda || ""
  );

  const [fechaEntrega, setFechaEntrega] = useState(
    pedido?.fecha_entrega || ""
  );

  const [descripcion, setDescripcion] = useState(
    pedido?.descripcion || ""
  );

  const [precio, setPrecio] = useState(
    pedido?.precio || ""
  );

  const [sena, setSena] = useState(
    pedido?.sena || ""
  );

  const [estado, setEstado] = useState(
    pedido?.estado || "En proceso"
  );

  const [prioridad, setPrioridad] = useState(
    pedido?.prioridad || "Normal"
  );

  const [notas, setNotas] = useState(
    pedido?.notas || ""
  );

  const [guardando, setGuardando] = useState(false);

  const guardarCambios = async (e) => {
    e.preventDefault();

    setGuardando(true);

    const { data, error } = await supabase
      .from("pedidos")
      .update({
        tipo_prenda: tipoPrenda,
        fecha_entrega: fechaEntrega,
        descripcion: descripcion,
        precio: Number(precio) || 0,
        sena: Number(sena) || 0,
        estado: estado,
        prioridad: prioridad,
        notas: notas,
      })
      .eq("id", pedido.id)
      .select(`
        id,
        tipo_prenda,
        descripcion,
        fecha_entrega,
        precio,
        sena,
        estado,
        prioridad,
        notas,
        clientes (
          nombre,
          telefono
        )
      `)
      .single();

    if (error) {
      console.error("Error actualizando pedido:", error);

      alert(
        "No se pudo guardar el pedido.\n\n" +
        error.message
      );

      setGuardando(false);
      return;
    }

    alert("¡Pedido actualizado correctamente! 🧵❤️");

    setGuardando(false);

    if (onSaved) {
      onSaved(data);
    }
    if (onBack) {
  onBack();
}
  };

  return (
    <div className="new-order-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <div className="page-header">

        <div>

          <h1>
            Editar pedido ✏️
          </h1>

          <p>
            Modificá los datos del trabajo.
          </p>

        </div>

        <button
          className="back-button"
          onClick={onBack}
          disabled={guardando}
        >
          ← Volver
        </button>

      </div>

      <form
        className="order-form"
        onSubmit={guardarCambios}
      >

        {/* =========================
            CLIENTE
        ========================= */}

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
                value={
                  pedido?.clientes?.nombre || ""
                }
                disabled
              />

            </div>

            <div className="form-group">

              <label>
                Teléfono
              </label>

              <input
                type="tel"
                value={
                  pedido?.clientes?.telefono || ""
                }
                disabled
              />

            </div>

          </div>

          <small className="form-help">
            Los datos del cliente los vamos a poder
            editar desde la sección Clientes.
          </small>

        </div>

        {/* =========================
            PEDIDO
        ========================= */}

        <div className="form-section">

          <h2>
            🧵 Datos del pedido
          </h2>

          <div className="form-grid">

            <div className="form-group">

              <label>
                Tipo de prenda
              </label>

              <select
                value={tipoPrenda}
                onChange={(e) =>
                  setTipoPrenda(e.target.value)
                }
                required
              >

                <option value="">
                  Seleccionar prenda
                </option>

                <option value="Vestido">
                  Vestido
                </option>

                <option value="Pantalón">
                  Pantalón
                </option>

                <option value="Blusa">
                  Blusa
                </option>

                <option value="Camisa">
                  Camisa
                </option>

                <option value="Saco">
                  Saco
                </option>

                <option value="Falda">
                  Falda
                </option>

                <option value="Otro">
                  Otro
                </option>

              </select>

            </div>

            <div className="form-group">

              <label>
                Fecha de entrega
              </label>

              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) =>
                  setFechaEntrega(e.target.value)
                }
                required
              />

            </div>

          </div>

          <div className="form-group">

            <label>
              Descripción del trabajo
            </label>

            <textarea
              rows="4"
              value={descripcion}
              onChange={(e) =>
                setDescripcion(e.target.value)
              }
              placeholder="Ej: Ajustar cintura y acortar 5 cm..."
            />

          </div>

        </div>

        {/* =========================
            PAGO
        ========================= */}

        <div className="form-section">

          <h2>
            💰 Información de pago
          </h2>

          <div className="form-grid">

            <div className="form-group">

              <label>
                Precio total
              </label>

              <input
                type="number"
                min="0"
                value={precio}
                onChange={(e) =>
                  setPrecio(e.target.value)
                }
              />

            </div>

            <div className="form-group">

              <label>
                Seña
              </label>

              <input
                type="number"
                min="0"
                value={sena}
                onChange={(e) =>
                  setSena(e.target.value)
                }
              />

            </div>

          </div>

          <div className="payment-preview">

            <span>
              Saldo pendiente:
            </span>

            <strong>
              $
              {(
                (Number(precio) || 0) -
                (Number(sena) || 0)
              ).toLocaleString("es-AR")}
            </strong>

          </div>

        </div>

        {/* =========================
            ESTADO
        ========================= */}

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
                  setEstado(e.target.value)
                }
              >

                <option value="En proceso">
                  En proceso
                </option>

                <option value="Listo">
                  Listo
                </option>

                <option value="Entregado">
                  Entregado
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
                  setPrioridad(e.target.value)
                }
              >

                <option value="Normal">
                  Normal
                </option>

                <option value="Urgente">
                  Urgente
                </option>

              </select>

            </div>

          </div>

          <div className="form-group">

            <label>
              Notas
            </label>

            <textarea
              rows="3"
              value={notas}
              onChange={(e) =>
                setNotas(e.target.value)
              }
              placeholder="Cualquier detalle importante..."
            />

          </div>

        </div>

        {/* =========================
            BOTONES
        ========================= */}

        <div className="form-actions">

          <button
            type="button"
            className="cancel-button"
            onClick={onBack}
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="save-button"
            disabled={guardando}
          >

            {guardando
              ? "Guardando..."
              : "✓ Guardar cambios"}

          </button>

        </div>

      </form>

    </div>
  );
}

export default EditOrder;