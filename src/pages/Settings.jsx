import Icon from "../components/Icon";
import { useState } from "react";
import {
    configuracionInicial,
    prepararMensaje,
    validarConfiguracion,
} from "../lib/workshop";
import {
    guardarConfiguracion,
    useWorkshopSettings,
} from "../hooks/useWorkshopSettings";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import "./OrderForm.css";

export default function Settings() {
    const actual = useWorkshopSettings();
    const [inicial, setInicial] = useState(actual);
    const [datos, setDatos] = useState(actual);
    const [errores, setErrores] = useState({});
    const [mensaje, setMensaje] = useState("");
    const [errorGuardado, setErrorGuardado] = useState("");
    const marcarGuardado = useUnsavedChanges(
        JSON.stringify(inicial) !== JSON.stringify(datos),
    );
    function cambiar(campo, valor) {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actual) => ({ ...actual, [campo]: undefined }));
        setMensaje("");
    }
    function guardar(event) {
        event.preventDefault();
        setMensaje("");
        setErrorGuardado("");
        const validacion = validarConfiguracion(datos);
        setErrores(validacion);
        if (Object.keys(validacion).length) return;
        try {
            const guardados = guardarConfiguracion(datos);
            marcarGuardado();
            setDatos(guardados);
            setInicial(guardados);
            setMensaje(
                "Configuración guardada. Los próximos avisos usarán este mensaje.",
            );
        } catch {
            setErrorGuardado(
                "No se pudo guardar en este navegador. Revisá que permita guardar datos e intentá de nuevo.",
            );
        }
    }
    return (
        <div className="new-order-page settings-page">
            <header className="page-header">
                <div>
                    <h1>Configuración</h1>
                    <p>Personalizá cómo se presenta tu taller.</p>
                </div>
            </header>
            <form className="order-form" onSubmit={guardar} noValidate>
                {mensaje && (
                    <div className="form-success-banner" role="status">
                        {mensaje}
                    </div>
                )}
                {errorGuardado && (
                    <div className="form-error-banner" role="alert">
                        {errorGuardado}
                    </div>
                )}
                <section className="form-section">
                    <h2><Icon name="thread" /> Tu taller</h2>
                    <div className="form-grid">
                        {[
                            ["taller", "Nombre del taller"],
                            ["remitente", "Nombre de quien saluda"],
                        ].map(([campo, label]) => (
                            <div className="form-group" key={campo}>
                                <label htmlFor={`config-${campo}`}>
                                    {label}
                                </label>
                                <input
                                    id={`config-${campo}`}
                                    value={datos[campo]}
                                    onChange={(e) =>
                                        cambiar(campo, e.target.value)
                                    }
                                    aria-invalid={Boolean(errores[campo])}
                                    aria-describedby={
                                        errores[campo]
                                            ? `error-config-${campo}`
                                            : undefined
                                    }
                                />
                                {errores[campo] && (
                                    <small
                                        className="field-error"
                                        id={`error-config-${campo}`}
                                    >
                                        {errores[campo]}
                                    </small>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
                <section className="form-section">
                    <h2><Icon name="message" /> Aviso de retiro</h2>
                    <div className="form-group">
                        <label htmlFor="config-plantilla">
                            Mensaje de WhatsApp
                        </label>
                        <textarea
                            id="config-plantilla"
                            rows="8"
                            value={datos.plantilla}
                            onChange={(e) =>
                                cambiar("plantilla", e.target.value)
                            }
                            aria-invalid={Boolean(errores.plantilla)}
                            aria-describedby="ayuda-plantilla error-plantilla"
                        />
                        <small className="section-help" id="ayuda-plantilla">
                            Usá {"{nombre}"}, {"{remitente}"} y {"{taller}"}{" "}
                            para completar los datos automáticamente. Los avisos se preparan sin emojis.
                        </small>
                        {errores.plantilla && (
                            <small className="field-error" id="error-plantilla">
                                {errores.plantilla}
                            </small>
                        )}
                    </div>
                    <div className="settings-preview">
                        <h3>Vista previa para Ana</h3>
                        <p>{prepararMensaje("Ana", datos)}</p>
                    </div>
                </section>
                <p className="section-help">
                    Esta configuración se guarda en este navegador. Si usás otro
                    dispositivo, configurala también allí.
                </p>
                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                            setDatos({ ...configuracionInicial });
                            setErrores({});
                            setMensaje("");
                        }}
                    >
                        Restablecer valores iniciales
                    </button>
                    <button type="submit" className="save-button">
                        Guardar configuración
                    </button>
                </div>
            </form>
        </div>
    );
}
