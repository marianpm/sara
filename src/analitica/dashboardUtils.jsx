const AR_TZ = "America/Argentina/Buenos_Aires";

export function toDateKeyArgentina(dateLike) {
  if (!dateLike) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateLike))) {
    return String(dateLike);
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateLike));
}

export function todayKeyArgentina() {
  return toDateKeyArgentina(new Date().toISOString());
}

export function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function getLastNDaysStartKey(n) {
  return addDays(todayKeyArgentina(), -(n - 1));
}

export function getFechaCreacionKey(pedido) {
  return toDateKeyArgentina(pedido.created_at);
}

export function getFechaEntregaOperativaKey(pedido) {
  return pedido.fecha_solicitada || getFechaCreacionKey(pedido);
}

export function getWeekStartKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0 domingo, 1 lunes
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatKg(value) {
  return `${Number(value || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 1,
  })} kg`;
}

export function formatInteger(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

export function formatWeekLabel(weekStartKey) {
  const [y, m, d] = weekStartKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

function groupSum(rows, keyFn, valueFn) {
  const map = new Map();

  for (const row of rows) {
    const key = keyFn(row);
    const value = Number(valueFn(row) || 0);
    map.set(key, (map.get(key) || 0) + value);
  }

  return map;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCategoria(value) {
  const text = normalizeText(value);
  if (text.includes("cocida")) return "cocidas";
  if (text.includes("cruda")) return "crudas";
  return "sin_categoria";
}

function normalizeMarca(value) {
  const text = normalizeText(value);
  if (text === "1319") return "1319";
  if (text.includes("sarria")) return "Sarria";
  return "Sin marca";
}

function normalizeFactura(value) {
  const text = normalizeText(value).replaceAll("-", "_").replaceAll(" ", "_");
  return text === "sin_factura" ? "Sin factura" : "Con factura";
}

function normalizeEntrega(value) {
  const text = normalizeText(value);
  if (text.includes("retiro")) return "Retiro";
  if (text.includes("env")) return "Envío";
  return "Otro";
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getOrCreateStackBucket(map, key) {
  if (!map.has(key)) {
    map.set(key, { cocidas: 0, crudas: 0 });
  }
  return map.get(key);
}

function buildStackRows(maps) {
  const allKeys = Array.from(
    new Set(maps.flatMap((map) => Array.from(map.keys())))
  ).sort();

  return allKeys.map((key) => ({
    semana: key,
    label: formatWeekLabel(key),
    cocidas: Number((maps[0].get(key)?.cocidas || 0).toFixed(2)),
    crudas: Number((maps[0].get(key)?.crudas || 0).toFixed(2)),
    total: Number(
      (
        (maps[0].get(key)?.cocidas || 0) +
        (maps[0].get(key)?.crudas || 0)
      ).toFixed(2)
    ),
  }));
}

function buildStackRowsFromSingleMap(map) {
  const keys = Array.from(map.keys()).sort();

  return keys.map((key) => ({
    semana: key,
    label: formatWeekLabel(key),
    cocidas: Number((map.get(key)?.cocidas || 0).toFixed(2)),
    crudas: Number((map.get(key)?.crudas || 0).toFixed(2)),
    total: Number(
      ((map.get(key)?.cocidas || 0) + (map.get(key)?.crudas || 0)).toFixed(2)
    ),
  }));
}

function buildPieRows(map) {
  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value: Number(value || 0),
    }))
    .filter((row) => row.value > 0);
}

export function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);

  if (abs >= 1000000) {
    return `$${(amount / 1000000).toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} M`;
  }

  if (abs >= 1000) {
    return `$${(amount / 1000).toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} K`;
  }

  return `$${amount.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

export function buildDashboardData({
  pedidos,
  items,
  productos = [],
  clientes = [],
  periodoDias = 30,
}) {
  const startKey = getLastNDaysStartKey(periodoDias);
  const endToday = todayKeyArgentina();

  const productosCategoriaMap = new Map(
    (productos || []).map((p) => [
      normalizeText(p.nombre),
      normalizeCategoria(p.categoria),
    ])
  );

  const clientesTipoMap = new Map(
    (clientes || []).map((c) => [
      normalizeText(c.razon_social),
      String(c.tipo ?? "").trim() || "Sin tipo",
    ])
  );

  const itemsByPedido = new Map();
  for (const item of items || []) {
    if (!itemsByPedido.has(item.pedido_id)) {
      itemsByPedido.set(item.pedido_id, []);
    }
    itemsByPedido.get(item.pedido_id).push(item);
  }

  const pedidosConMeta = (pedidos || []).map((pedido) => {
    const rows = itemsByPedido.get(pedido.id) || [];

    let kilosCocidas = 0;
    let kilosCrudas = 0;
    let lineasCocidas = 0;
    let lineasCrudas = 0;

    for (const row of rows) {
      const categoria =
        productosCategoriaMap.get(normalizeText(row.producto_nombre)) ||
        "sin_categoria";

      const kg = Number(row.peso_kg || 0);

      if (categoria === "cocidas") {
        kilosCocidas += kg;
        lineasCocidas += 1;
      } else if (categoria === "crudas") {
        kilosCrudas += kg;
        lineasCrudas += 1;
      }
    }

    const totalKilos = kilosCocidas + kilosCrudas;
    const totalLineas = lineasCocidas + lineasCrudas;

    const shareCocidas =
      totalKilos > 0
        ? kilosCocidas / totalKilos
        : totalLineas > 0
        ? lineasCocidas / totalLineas
        : 0;

    const shareCrudas =
      totalKilos > 0
        ? kilosCrudas / totalKilos
        : totalLineas > 0
        ? lineasCrudas / totalLineas
        : 0;

    return {
      ...pedido,
      fechaCreacionKey: getFechaCreacionKey(pedido),
      fechaEntregaKey: getFechaEntregaOperativaKey(pedido),
      clienteTipo:
        clientesTipoMap.get(normalizeText(pedido.cliente_nombre)) || "Sin tipo",
      marcaNormalizada: normalizeMarca(pedido.marca),
      facturaNormalizada: normalizeFactura(pedido.tipo_factura),
      entregaNormalizada: normalizeEntrega(pedido.tipo_entrega),
      shareCocidas,
      shareCrudas,
    };
  });

  const pedidosPeriodo = pedidosConMeta.filter(
    (p) => p.fechaCreacionKey >= startKey && p.fechaCreacionKey <= endToday
  );

  const pedidosEntregadosPeriodo = pedidosConMeta.filter(
    (p) =>
      p.estado === "entregado" &&
      p.fechaEntregaKey >= startKey &&
      p.fechaEntregaKey <= endToday
  );

  const deliveredRowsPeriodo = [];
  for (const pedido of pedidosEntregadosPeriodo) {
    const rows = itemsByPedido.get(pedido.id) || [];

    for (const row of rows) {
      const categoria =
        productosCategoriaMap.get(normalizeText(row.producto_nombre)) ||
        "sin_categoria";

      deliveredRowsPeriodo.push({
        ...row,
        cliente_nombre: pedido.cliente_nombre,
        clienteTipo: pedido.clienteTipo,
        fechaEntregaKey: pedido.fechaEntregaKey,
        marca: pedido.marcaNormalizada,
        factura: pedido.facturaNormalizada,
        tipo_entrega: pedido.entregaNormalizada,
        categoria,
        peso_kg: Number(row.peso_kg || 0),
      });
    }
  }

  const pedidosPorSemanaMap = new Map();
  for (const pedido of pedidosPeriodo) {
    const weekKey = getWeekStartKey(pedido.fechaCreacionKey);
    const bucket = getOrCreateStackBucket(pedidosPorSemanaMap, weekKey);
    bucket.cocidas += pedido.shareCocidas;
    bucket.crudas += pedido.shareCrudas;
  }

  const entregasPorSemanaMap = new Map();
  for (const pedido of pedidosEntregadosPeriodo) {
    const weekKey = getWeekStartKey(pedido.fechaEntregaKey);
    const bucket = getOrCreateStackBucket(entregasPorSemanaMap, weekKey);
    bucket.cocidas += pedido.shareCocidas;
    bucket.crudas += pedido.shareCrudas;
  }

  const facturacionPorSemanaMap = new Map();
  for (const pedido of pedidosEntregadosPeriodo) {
    const weekKey = getWeekStartKey(pedido.fechaEntregaKey);
    const bucket = getOrCreateStackBucket(facturacionPorSemanaMap, weekKey);
    const total = Number(pedido.precio_total || 0);

    bucket.cocidas += total * pedido.shareCocidas;
    bucket.crudas += total * pedido.shareCrudas;
  }

  const kilosPorSemanaMap = new Map();
  for (const row of deliveredRowsPeriodo) {
    const weekKey = getWeekStartKey(row.fechaEntregaKey);
    const bucket = getOrCreateStackBucket(kilosPorSemanaMap, weekKey);

    if (row.categoria === "cocidas") {
      bucket.cocidas += Number(row.peso_kg || 0);
    } else if (row.categoria === "crudas") {
      bucket.crudas += Number(row.peso_kg || 0);
    }
  }

  const kgPorMarcaMap = new Map();
  for (const row of deliveredRowsPeriodo) {
    kgPorMarcaMap.set(
      row.marca || "Sin marca",
      (kgPorMarcaMap.get(row.marca || "Sin marca") || 0) +
        Number(row.peso_kg || 0)
    );
  }

  const facturaVsSinFacturaMap = new Map();
  for (const pedido of pedidosPeriodo) {
    facturaVsSinFacturaMap.set(
      pedido.facturaNormalizada,
      (facturaVsSinFacturaMap.get(pedido.facturaNormalizada) || 0) + 1
    );
  }

  const envioVsRetiroMap = new Map();
  for (const pedido of pedidosPeriodo) {
    envioVsRetiroMap.set(
      pedido.entregaNormalizada,
      (envioVsRetiroMap.get(pedido.entregaNormalizada) || 0) + 1
    );
  }

  const kilosPorTipoClienteMap = new Map();

  for (const row of deliveredRowsPeriodo) {
    const tipo = String(row.clienteTipo ?? "").trim() || "Sin tipo";

    kilosPorTipoClienteMap.set(
      tipo,
      (kilosPorTipoClienteMap.get(tipo) || 0) + Number(row.peso_kg || 0)
    );
  }

  const kilosPorTipoCliente = Array.from(kilosPorTipoClienteMap.entries())
    .map(([tipo, kilos]) => ({
      tipo,
      kilos: Number(kilos.toFixed(2)),
    }))
    .sort((a, b) => b.kilos - a.kilos);

  const topProductosMap = new Map();
  for (const row of deliveredRowsPeriodo) {
    const key = row.producto_nombre || "Sin nombre";
    const actual = topProductosMap.get(key) || { nombre: key, kilos: 0 };
    actual.kilos += Number(row.peso_kg || 0);
    topProductosMap.set(key, actual);
  }

  const totalKilosTopProductos = deliveredRowsPeriodo.reduce(
    (acc, row) => acc + Number(row.peso_kg || 0),
    0
  );

  const topProductos = Array.from(topProductosMap.values())
    .sort((a, b) => b.kilos - a.kilos)
    .slice(0, 8)
    .map((producto) => ({
      ...producto,
      porcentaje:
        totalKilosTopProductos > 0
          ? (producto.kilos / totalKilosTopProductos) * 100
          : 0,
    }));

  const topClientesMap = new Map();
  for (const pedido of pedidosEntregadosPeriodo) {
    const key = pedido.cliente_nombre || "Sin cliente";
    const actual = topClientesMap.get(key) || {
      nombre: key,
      facturacion: 0,
      pedidos: 0,
    };
    actual.facturacion += Number(pedido.precio_total || 0);
    actual.pedidos += 1;
    topClientesMap.set(key, actual);
  }

  const totalFacturacionTopClientes = pedidosEntregadosPeriodo.reduce(
    (acc, pedido) => acc + Number(pedido.precio_total || 0),
    0
  );

  const topClientes = Array.from(topClientesMap.values())
    .sort((a, b) => b.facturacion - a.facturacion)
    .slice(0, 8)
    .map((cliente) => ({
      ...cliente,
      porcentaje:
        totalFacturacionTopClientes > 0
          ? (cliente.facturacion / totalFacturacionTopClientes) * 100
          : 0,
    }));

  return {
    kpis: {
      pedidosCreados: pedidosPeriodo.length,
      pedidosEntregados: pedidosEntregadosPeriodo.length,
      facturacion: pedidosEntregadosPeriodo.reduce(
        (acc, pedido) => acc + Number(pedido.precio_total || 0),
        0
      ),
      kilosVendidos: deliveredRowsPeriodo.reduce(
        (acc, row) => acc + Number(row.peso_kg || 0),
        0
      ),
    },
    pedidosPorSemana: buildStackRowsFromSingleMap(pedidosPorSemanaMap),
    kilosPorSemana: buildStackRowsFromSingleMap(kilosPorSemanaMap),
    entregasPorSemana: buildStackRowsFromSingleMap(entregasPorSemanaMap),
    facturacionPorSemana: buildStackRowsFromSingleMap(facturacionPorSemanaMap),
    kgPorMarca: buildPieRows(kgPorMarcaMap),
    facturaVsSinFactura: buildPieRows(facturaVsSinFacturaMap),
    envioVsRetiro: buildPieRows(envioVsRetiroMap),
    kilosPorTipoCliente,
    topProductos,
    topClientes,
  };
}