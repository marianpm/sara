import { supabase } from "../supabaseClient";

function isoDaysAgo(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString();
}

export async function fetchDashboardBaseData() {
  const sinceIso = isoDaysAgo(450);

  const { data: pedidos, error: pedidosError } = await supabase
    .from("pedidos")
    .select(
      `
      id,
      created_at,
      fecha_solicitada,
      estado,
      precio_total,
      cliente_id,
      marca,
      tipo_factura,
      tipo_entrega,
      cliente:clientes (
        id,
        razon_social,
        nombre_fantasia,
        tipo
      )
      `
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (pedidosError) {
    throw pedidosError;
  }

  const pedidoIds = (pedidos || []).map((p) => p.id);

  if (pedidoIds.length === 0) {
    return {
      pedidos: [],
      items: [],
      productos: [],
      clientes: [],
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from("pedidoItems")
    .select("pedido_id, producto_nombre, peso_kg")
    .in("pedido_id", pedidoIds);

  if (itemsError) {
    throw itemsError;
  }

  const nombresProductos = Array.from(
    new Set((items || []).map((i) => i.producto_nombre).filter(Boolean))
  );

  const productosPromise = nombresProductos.length
    ? supabase
        .from("productos")
        .select("nombre, categoria")
        .in("nombre", nombresProductos)
    : Promise.resolve({ data: [], error: null });

  const { data: productos, error: productosError } = await productosPromise;

  if (productosError) throw productosError;

  return {
    pedidos: pedidos || [],
    items: items || [],
    productos: productos || [],
    clientes: [],
  };
}