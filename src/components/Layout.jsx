import "./Layout.css";
import "../pages/OrderForm.css";
import { useWorkshopSettings } from "../hooks/useWorkshopSettings";
import Icon from "./Icon";

const secciones = [
    { id: "dashboard", nombre: "Inicio", icono: "home" },
    { id: "orders", nombre: "Pedidos", icono: "orders" },
    { id: "calendar", nombre: "Calendario", icono: "calendar" },
    { id: "earnings", nombre: "Ganancias", icono: "wallet" },
    {
        id: "settings",
        nombre: "Configuración",
        corto: "Ajustes",
        icono: "settings",
    },
];

export default function Layout({
    page,
    setPage,
    children,
    errorCarga,
    onRetry,
}) {
    const configuracion = useWorkshopSettings();
    const actual =
        secciones.find((seccion) => seccion.id === page) || secciones[0];
    return (
        <div className="app-layout atelier-layout">
            <aside className="sidebar">
                <div className="logo">
                    <span className="logo-icon">
                        <Icon name="scissors" />
                    </span>
                    <div className="logo-text">
                        <h2>{configuracion.taller}</h2>
                        <span>Taller de costura</span>
                    </div>
                </div>
                <span className="nav-caption">TU TALLER</span>
                <nav className="sidebar-nav" aria-label="Navegación principal">
                    {secciones.map((seccion) => (
                        <button
                            key={seccion.id}
                            type="button"
                            className={`menu-button ${page === seccion.id ? "active" : ""}`}
                            aria-current={
                                page === seccion.id ? "page" : undefined
                            }
                            aria-label={seccion.nombre}
                            onClick={() => setPage(seccion.id)}
                        >
                            <span className="menu-icon">
                                <Icon name={seccion.icono} />
                            </span>
                            <span
                                className={
                                    seccion.corto
                                        ? "config-nav-full"
                                        : undefined
                                }
                            >
                                {seccion.nombre}
                            </span>
                            {seccion.corto && (
                                <span className="config-nav-short">
                                    {seccion.corto}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="atelier-signature">
                        <Icon name="thread" />
                        <p>
                            Hecho con dedicación.
                            <br />
                            <span>Organizado con cariño.</span>
                        </p>
                    </div>
                    <div className="sidebar-footer">
                        <span className="profile-initial">
                            {configuracion.remitente.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                            <strong>{configuracion.remitente}</strong>
                            <span>Tu taller, organizado</span>
                        </div>
                    </div>
                </div>
            </aside>
            <main className="main-content">
                <div className="workspace-topline">
                    <span>
                        TU ESPACIO <i>/</i> <strong>{actual.nombre}</strong>
                    </span>
                    <div className="workspace-user">
                        <span className="workspace-status-dot" />
                        Taller abierto a tus ideas
                        <Icon name="scissors" />
                    </div>
                </div>
                {errorCarga && (
                    <div className="connection-notice" role="alert">
                        <span>{errorCarga}</span>
                        <button type="button" onClick={onRetry}>
                            Reintentar
                        </button>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
