import { useState } from "react";
import { enlaceWhatsapp, mensajeRetiro } from "../lib/whatsapp";
import Icon from "./Icon";

export default function WhatsAppMessage({ pedido, configuracion }) {
    const inicial = mensajeRetiro(pedido.clientes?.nombre, configuracion);
    return (
        <MessageEditor
            key={`${pedido.id}-${inicial}`}
            pedido={pedido}
            inicial={inicial}
        />
    );
}

function MessageEditor({ pedido, inicial }) {
    const [texto, setTexto] = useState(inicial);
    const enlace = enlaceWhatsapp(pedido, undefined, texto);
    const id = `mensaje-retiro-${pedido.id}`;

    return (
        <>
            <div className="whatsapp-preview">
                <label htmlFor={id}>Mensaje para tu cliente</label>
                <textarea
                    id={id}
                    rows="7"
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    aria-describedby={`${id}-ayuda`}
                />
                <p className="message-edit-help" id={`${id}-ayuda`}>
                    Podés editar el mensaje antes de abrir WhatsApp. Los cambios
                    se usan solo para este aviso.
                </p>
            </div>
            {enlace ? (
                <a
                    className="whatsapp-button"
                    href={enlace}
                    target="_blank"
                    rel="noreferrer"
                >
                    <Icon name="message" /> Avisar por WhatsApp
                </a>
            ) : texto.trim() ? (
                <div className="no-phone-message">
                    <Icon name="phone" />
                    <p>
                        Este cliente no tiene un teléfono válido. Corregilo
                        desde Editar pedido para poder avisarle.
                    </p>
                </div>
            ) : (
                <>
                    <p className="field-error" role="status">
                        Escribí el mensaje antes de abrir WhatsApp.
                    </p>
                    <button type="button" className="whatsapp-button" disabled>
                        <Icon name="message" /> Avisar por WhatsApp
                    </button>
                </>
            )}
        </>
    );
}
