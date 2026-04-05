import { supabase } from "../supabaseClient";

function isoDaysAgo(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString();
}

export async function fetchDashboardBaseData() {
  const sinceIso = isoDaysAgo(370);

  const { data: pedidos, error: pedidosError } = await supabase
    .from("pedidos")
    .select(
      "id, created_at, fecha_solicitada, estado, precio_total, cliente_nombre"
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (pedidosError) {
    throw pedidosError;
  }

  const pedidoIds = (pedidos || []).map((p) => p.id);

  if (pedidoIds.length === 0) {
    return { pedidos: [], items: [] };
  }

  const { data: items, error: itemsError } = await supabase
    .from("pedidoItems")
    .select("pedido_id, producto_nombre, peso_kg")
    .in("pedido_id", pedidoIds);

  if (itemsError) {
    throw itemsError;
  }

  return {
    pedidos: pedidos || [],
    items: items || [],
  };
}