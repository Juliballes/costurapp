const trazos = {
    home: (
        <>
            <path d="m3 10 9-7 9 7" />
            <path d="M5 9v12h5v-7h4v7h5V9" />
        </>
    ),
    orders: (
        <>
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h3" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M7 3v4M17 3v4M3 10h18M7 14h2M13 14h2M7 18h2" />
        </>
    ),
    wallet: (
        <>
            <path d="M20 8H5a2 2 0 0 1 0-4h13v4M4 8v11a2 2 0 0 0 2 2h14V8" />
            <path d="M20 12h-5v5h5" />
            <path d="M16.5 14.5h.1" />
        </>
    ),
    settings: (
        <>
            <path
                d="m9 3 1-1h4l1 3 3 2 3 1v4l-3 1-2 3-1 3h-4l-1-3-3-2-3-1V9l3-1z"
                transform="translate(0 1)"
            />
            <circle cx="12" cy="11" r="3" />
        </>
    ),
    scissors: (
        <>
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="m8 8 13 13M8 16 21 3M12 12l-1 1" />
        </>
    ),
    thread: (
        <>
            <rect x="7" y="4" width="10" height="16" rx="2" />
            <path d="M5 4h14M5 20h14M7 8h10M7 12h10M7 16h10M17 16h2a3 3 0 0 1 0 6h-3" />
        </>
    ),
    shirt: (
        <>
            <path d="m8 3-5 3-2 5 5 2 1-3v11h10V10l1 3 5-2-2-5-5-3a4 4 0 0 1-8 0z" />
        </>
    ),
    dress: (
        <>
            <path d="M9 3v5l-5 13h16L15 8V3M9 3a3 3 0 0 0 6 0M9 10h6" />
        </>
    ),
    pants: (
        <>
            <path d="M6 3h12l2 18h-6l-2-11-2 11H4L6 3zM6 7h12M12 3v4" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    checkCircle: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    alert: (
        <>
            <path d="m12 3 10 18H2L12 3zM12 9v5M12 17h.01" />
        </>
    ),
    search: (
        <>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="7" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
    ),
    phone: (
        <path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2C10 21 3 14 3 5c0-1 1-2 2-2z" />
    ),
    message: (
        <>
            <path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-6 2 2-6a9 9 0 1 1 17-4z" />
            <path d="M8 10h8M8 14h5" />
        </>
    ),
    edit: (
        <>
            <path d="m16 3 5 5-12 12-6 1 1-6L16 3zM13 6l5 5" />
        </>
    ),
    trash: (
        <>
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        </>
    ),
    eye: (
        <>
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    note: (
        <>
            <path d="M5 3h10l4 4v14H5V3zM15 3v5h4M9 12h6M9 16h6" />
        </>
    ),
    bell: (
        <>
            <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3zM10 21h4" />
        </>
    ),
    flower: (
        <>
            <path d="M12 12C3 12 4 3 9 5c2-6 8-2 6 2 6-2 8 5 3 6 5 4-1 9-4 4-3 7-9 2-6-2-6 1-7-6-1-6" />
            <circle cx="12" cy="12" r="2" />
        </>
    ),
    pin: (
        <>
            <path d="m9 3 8 2-2 6 3 4-1 1-6-1-6 6 3-8-2-3 1-1 2-6z" />
        </>
    ),
};

export default function Icon({ name = "thread", className = "", ...props }) {
    return (
        <svg
            className={`ui-icon ${className}`}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {trazos[name] || trazos.thread}
        </svg>
    );
}

export function GarmentIcon({ tipo }) {
    return (
        <Icon
            name={
                tipo === "Pantalón"
                    ? "pants"
                    : ["Vestido", "Falda"].includes(tipo)
                      ? "dress"
                      : ["Blusa", "Camisa", "Saco"].includes(tipo)
                        ? "shirt"
                        : "thread"
            }
        />
    );
}
