import "./Layout.css";
import { useWorkshopSettings } from "../hooks/useWorkshopSettings";
import "../pages/OrderForm.css";

function Layout({ page, setPage, children, errorCarga, onRetry }) {
    const configuracion = useWorkshopSettings();
    return (
        <div className="app-layout">

            {/* =========================
                MENÚ LATERAL
            ========================= */}
            <aside className="sidebar">

                {/* LOGO */}
                <div className="logo">
                    <span className="logo-icon">🧵</span>

                    <div className="logo-text">
                        <h2>CosturApp</h2>
                        <span>{configuracion.taller} · Taller de costura</span>
                    </div>
                </div>

                {/* NAVEGACIÓN */}
                <nav className="sidebar-nav">

                    <button
                        className={`menu-button ${
                            page === "dashboard" ? "active" : ""
                        }`}
                        onClick={() => setPage("dashboard")}
                    >
                        <span className="menu-icon">🏠</span>
                        <span>Inicio</span>
                    </button>

                    <button
                        className={`menu-button ${
                            page === "orders" ? "active" : ""
                        }`}
                        onClick={() => setPage("orders")}
                    >
                        <span className="menu-icon">📋</span>
                        <span>Pedidos</span>
                    </button>

                    <button
                        className={`menu-button ${
                            page === "calendar" ? "active" : ""
                        }`}
                        onClick={() => setPage("calendar")}
                    >
                        <span className="menu-icon">📅</span>
                        <span>Calendario</span>
                    </button>
                    
                    <button
                        className={`menu-button ${page === "earnings" ? "active" : ""}`}
                        onClick={() => setPage("earnings")}
                    >
                        <span className="menu-icon">💰</span>
                        <span>Ganancias</span>
                    </button>


                    <button
                        className={`menu-button ${
                            page === "settings" ? "active" : ""
                        }`}
                        aria-label="⚙️ Configuración"
                        onClick={() => setPage("settings")}
                    >
                        <span className="menu-icon">⚙️</span>
                        <span className="config-nav-full">Configuración</span>
                        <span className="config-nav-short">Ajustes</span>
                    </button>

                </nav>

                {/* PARTE INFERIOR */}
                <div className="sidebar-bottom">

                    <div className="sidebar-footer">
                        <div className="footer-icon">
                            🧵
                        </div>

                        <div>
                            <strong>CosturApp</strong>
                            <span>Tu taller, organizado</span>
                        </div>
                    </div>

                </div>

            </aside>

            {/* =========================
                CONTENIDO
            ========================= */}
            <main className="main-content">
                {errorCarga && <div className="connection-notice" role="alert"><span>{errorCarga}</span><button type="button" onClick={onRetry}>Reintentar</button></div>}
                {children}
            </main>

        </div>
    );
}

export default Layout;