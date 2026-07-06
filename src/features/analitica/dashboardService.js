import { supabase } from "../../shared/lib/supabaseClient";

function isoDaysAgo(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString();
}

function dateKeyDaysAgo(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString().slice(0, 10);
}

export async function fetchDashboardBaseData() {
  const sinceIso = isoDaysAgo(800);
  const sinceDateKey = dateKeyDaysAgo(800);

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

  const { data: ingresosMercaderia, error: ingresosMercaderiaError } =
    await supabase
      .from("planta_ingresos_mercaderia")
      .select(
        `
        id,
        fecha_ingreso,
        proveedor_id,
        proveedor_nombre_snapshot,
        patas_cantidad,
        patas_peso_kg,
        unto_peso_kg,
        carne_peso_kg,
        created_at
        `
      )
      .gte("fecha_ingreso", sinceDateKey)
      .order("fecha_ingreso", { ascending: true });

  if (ingresosMercaderiaError) {
    throw ingresosMercaderiaError;
  }

  const pedidoIds = (pedidos || []).map((p) => p.id);

  let items = [];
  let productos = [];

  if (pedidoIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from("pedidoItems")
      .select("pedido_id, producto_nombre, presentacion, cantidad, peso_kg")
      .in("pedido_id", pedidoIds);

    if (itemsError) {
      throw itemsError;
    }

    items = itemsData || [];

    const nombresProductos = Array.from(
      new Set(items.map((i) => i.producto_nombre).filter(Boolean))
    );

    if (nombresProductos.length > 0) {
      const { data: productosData, error: productosError } = await supabase
        .from("productos")
        .select("nombre, categoria")
        .in("nombre", nombresProductos);

      if (productosError) throw productosError;

      productos = productosData || [];
    }
  }

  return {
    pedidos: pedidos || [],
    items,
    productos,
    clientes: [],
    ingresosMercaderia: ingresosMercaderia || [],
  };
}