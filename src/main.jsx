import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import WorkOrderProvider from "./components/WorkOrderProvider.jsx";
import "./atelier.css";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <WorkOrderProvider>
            <App />
        </WorkOrderProvider>
    </StrictMode>,
);
