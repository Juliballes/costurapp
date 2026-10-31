import { normalizarTelefono } from "./phone.js";
import { validarBorrador } from "./orderDraft.js";
import { totalPrendas } from "./orderTotals.js";

export const seleccionPedido =
    "id,tipo_prenda,descripcion,fecha_entrega,precio,sena,estado,prioridad,notas,pagado,clientes(id,nombre,telefono),pedido_prendas(id,tipo_prenda,cantidad,descripcion,precio)";

// El historial no debe hacer que desaparezcan activos al alcanzar el límite de una consulta.
export async function cargarTodosLosPedidos(db) {
    const pedidos = [];
    for (let inicio = 0; ; inicio += 500) {
        const { data, error } = await db
            .from("pedidos")
            .select(seleccionPedido)
            .order("fecha_entrega", { ascending: true })
            .order("id", { ascending: true })
            .range(inicio, inicio + 499);
        if (error) throw error;
        pedidos.push(...data);
        if (data.length < 500) return pedidos;
    }
}

export class ErrorFormulario extends Error {
    constructor(message, campo) {
        super(message);
        this.campo = campo;
    }
}

async function comprobar(consulta, mensaje) {
    const { data, error } = await consulta;
    if (error) throw new Error(mensaje, { cause: error });
    return data;
}

export async function buscarClientesPorTelefono(db, telefono) {
    const numero = normalizarTelefono(telefono);
    if (!numero) return [];
    const coincidencias = [];
    // Revisar también formatos anteriores; no depende del límite de 1000 filas de Supabase.
    for (let inicio = 0; ; inicio += 500) {
        const clientes = await comprobar(
            db
                .from("clientes")
                .select("id,nombre,telefono")
                .order("id")
                .range(inicio, inicio + 499),
            "No se pudo comprobar el teléfono del cliente. Intentá de nuevo.",
        );
        coincidencias.push(
            ...clientes.filter(
                (cliente) => normalizarTelefono(cliente.telefono) === numero,
            ),
        );
        if (clientes.length < 500) return coincidencias;
    }
}

const datosPrenda = (prenda) => ({
    tipo_prenda: prenda.tipo_prenda.trim(),
    cantidad: Number(prenda.cantidad),
    descripcion: (prenda.descripcion || "").trim(),
    precio: Number(prenda.precio),
});
const datosCabecera = (pedido) =>
    Object.fromEntries(
        [
            "tipo_prenda",
            "descripcion",
            "fecha_entrega",
            "precio",
            "sena",
            "estado",
            "prioridad",
            "notas",
            "pagado",
        ].map((campo) => [
            campo,
            pedido[campo] ?? (campo === "pagado" ? false : null),
        ]),
    );
const mismoNombre = (a, b) =>
    a.trim().replace(/\s+/g, " ").toLocaleLowerCase() ===
    b.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export async function guardarPedido(db, borrador, original = null) {
    const errores = validarBorrador(borrador);
    const campoInvalido = Object.keys(errores)[0];
    if (campoInvalido)
        throw new ErrorFormulario(errores[campoInvalido], campoInvalido);
    const revertir = [];
    let escrito = false;
    try {
        const telefono = normalizarTelefono(borrador.telefono);
        if (!telefono)
            throw new ErrorFormulario(
                "Revisá el teléfono del cliente.",
                "telefono",
            );
        const coincidencias = await buscarClientesPorTelefono(db, telefono);
        const otroCliente = coincidencias.find(
            (c) => c.id !== original?.clientes?.id,
        );
        if (original?.clientes?.id && otroCliente)
            throw new ErrorFormulario(
                `Ese teléfono ya corresponde a ${otroCliente.nombre}. Corregilo para no duplicar clientes.`,
                "telefono",
            );
        if (!original?.clientes?.id && coincidencias.length > 1)
            throw new ErrorFormulario(
                "Hay varios clientes con ese teléfono. Revisá los registros existentes antes de crear otro pedido.",
                "telefono",
            );
        let cliente = original?.clientes || coincidencias[0];
        if (
            !original &&
            cliente &&
            !mismoNombre(cliente.nombre, borrador.nombre)
        )
            throw new ErrorFormulario(
                `Ese teléfono corresponde a ${cliente.nombre}. Usá ese nombre o corregí el teléfono.`,
                "telefono",
            );
        const nuevosDatosCliente = { nombre: borrador.nombre.trim(), telefono };
        if (!cliente) {
            cliente = await comprobar(
                db
                    .from("clientes")
                    .insert(nuevosDatosCliente)
                    .select("id,nombre,telefono")
                    .single(),
                "No se pudo guardar el cliente.",
            );
            // Si falla el pedido, el cliente queda disponible para el próximo intento.
        } else if (
            cliente.nombre !== nuevosDatosCliente.nombre ||
            cliente.telefono !== telefono
        ) {
            const anterior = {
                nombre: cliente.nombre,
                telefono: cliente.telefono,
            };
            const id = cliente.id;
            cliente = await comprobar(
                db
                    .from("clientes")
                    .update(nuevosDatosCliente)
                    .eq("id", id)
                    .select("id,nombre,telefono")
                    .single(),
                "No se pudieron guardar los datos del cliente.",
            );
            escrito = true;
            revertir.push(() =>
                comprobar(
                    db.from("clientes").update(anterior).eq("id", id),
                    "No se pudo restaurar el cliente.",
                ),
            );
        }

        const total = totalPrendas(borrador.prendas);
        const cabecera = {
            tipo_prenda: borrador.prendas[0].tipo_prenda,
            descripcion:
                borrador.prendas.length === 1
                    ? borrador.prendas[0].descripcion.trim()
                    : `Pedido con ${borrador.prendas.length} tipos de trabajo.`,
            fecha_entrega: borrador.fecha_entrega,
            precio: total,
            sena: borrador.pagado ? total : Number(borrador.sena || 0),
            pagado: borrador.pagado,
            estado: borrador.estado,
            prioridad: borrador.prioridad,
            notas: borrador.notas.trim(),
        };
        let pedido = original;
        if (!pedido) {
            pedido = await comprobar(
                db
                    .from("pedidos")
                    .insert({ ...cabecera, cliente_id: cliente.id })
                    .select(seleccionPedido)
                    .single(),
                "No se pudo crear el pedido. Revisá la lista antes de reintentar si se cortó la conexión.",
            );
            escrito = true;
            const id = pedido.id;
            revertir.push(() =>
                comprobar(
                    db.from("pedidos").delete().eq("id", id),
                    "No se pudo retirar el pedido incompleto.",
                ),
            );
        }
        const prendasGuardadas = [];
        const anteriores = original?.pedido_prendas || [];
        for (const prenda of borrador.prendas) {
            const datos = datosPrenda(prenda);
            const anterior = anteriores.find((p) => p.id === prenda.id);
            if (anterior) {
                if (
                    JSON.stringify(datosPrenda(anterior)) !==
                    JSON.stringify(datos)
                ) {
                    await comprobar(
                        db
                            .from("pedido_prendas")
                            .update(datos)
                            .eq("pedido_id", pedido.id)
                            .eq("id", anterior.id)
                            .select("id")
                            .single(),
                        "No se pudo actualizar una prenda.",
                    );
                    escrito = true;
                    revertir.push(() =>
                        comprobar(
                            db
                                .from("pedido_prendas")
                                .update({
                                    tipo_prenda: anterior.tipo_prenda,
                                    cantidad: anterior.cantidad,
                                    descripcion: anterior.descripcion,
                                    precio: anterior.precio,
                                })
                                .eq("pedido_id", pedido.id)
                                .eq("id", anterior.id),
                            "No se pudo restaurar una prenda.",
                        ),
                    );
                }
                prendasGuardadas.push({ id: anterior.id, ...datos });
            } else {
                const nueva = await comprobar(
                    db
                        .from("pedido_prendas")
                        .insert({ ...datos, pedido_id: pedido.id })
                        .select("id")
                        .single(),
                    "No se pudo agregar una prenda.",
                );
                escrito = true;
                revertir.push(() =>
                    comprobar(
                        db
                            .from("pedido_prendas")
                            .delete()
                            .eq("pedido_id", pedido.id)
                            .eq("id", nueva.id),
                        "No se pudo retirar una prenda incompleta.",
                    ),
                );
                prendasGuardadas.push({ id: nueva.id, ...datos });
            }
        }
        if (original) {
            pedido = await comprobar(
                db
                    .from("pedidos")
                    .update(cabecera)
                    .eq("id", original.id)
                    .select(seleccionPedido)
                    .single(),
                "No se pudo actualizar el pedido.",
            );
            escrito = true;
            revertir.push(() =>
                comprobar(
                    db
                        .from("pedidos")
                        .update(datosCabecera(original))
                        .eq("id", original.id),
                    "No se pudo restaurar el pedido.",
                ),
            );
            const eliminadas = anteriores
                .filter(
                    (p) =>
                        !prendasGuardadas.some((actual) => actual.id === p.id),
                )
                .map((p) => p.id);
            // Eliminar al final: no hay escrituras posteriores que puedan fallar.
            if (eliminadas.length)
                await comprobar(
                    db
                        .from("pedido_prendas")
                        .delete()
                        .eq("pedido_id", original.id)
                        .in("id", eliminadas),
                    "No se pudieron quitar las prendas del pedido.",
                );
        }
        return {
            ...pedido,
            ...cabecera,
            clientes: cliente,
            pedido_prendas: prendasGuardadas,
        };
    } catch (error) {
        let falloReversion = false;
        for (const deshacer of revertir.reverse()) {
            try {
                await deshacer();
            } catch {
                falloReversion = true;
            }
        }
        if (falloReversion)
            throw new Error(
                `${error.message} No pudimos revertir todos los cambios. Revisá el pedido antes de volver a guardar.`,
                { cause: error },
            );
        if (escrito)
            throw new Error(
                `${error.message} Se revirtieron los cambios confirmados. Revisá el pedido si hubo un corte de conexión.`,
                { cause: error },
            );
        throw error;
    }
}
