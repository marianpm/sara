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

function groupCount(rows, keyFn) {
  const map = new Map();

  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, (map.get(key) || 0) + 1);
  }

  return map;
}

export function buildDashboardData({ pedidos, items, periodoTopDias = 30 }) {
  const start7 = getLastNDaysStartKey(7);
  const endToday = todayKeyArgentina();

  const pedidosConEntrega = pedidos.map((p) => ({
    ...p,
    fechaCreacionKey: getFechaCreacionKey(p),
    fechaEntregaKey: getFechaEntregaOperativaKey(p),
  }));

  const pedidosUltimos7 = pedidosConEntrega.filter(
    (p) => p.fechaCreacionKey >= start7 && p.fechaCreacionKey <= endToday
  );

  const pedidosEntregadosUltimos7 = pedidosConEntrega.filter(
    (p) =>
      p.estado === "entregado" &&
      p.fechaEntregaKey >= start7 &&
      p.fechaEntregaKey <= endToday
  );

  const itemsByPedido = new Map();
  for (const item of items) {
    if (!itemsByPedido.has(item.pedido_id)) {
      itemsByPedido.set(item.pedido_id, []);
    }
    itemsByPedido.get(item.pedido_id).push(item);
  }

  const kilosVendidos7 = pedidosEntregadosUltimos7.reduce((acc, pedido) => {
    const rows = itemsByPedido.get(pedido.id) || [];
    return (
      acc +
      rows.reduce((sum, item) => sum + Number(item.peso_kg || 0), 0)
    );
  }, 0);

  const facturacion7 = pedidosEntregadosUltimos7.reduce(
    (acc, pedido) => acc + Number(pedido.precio_total || 0),
    0
  );

  const semanasPedidos = groupCount(
    pedidosConEntrega,
    (p) => getWeekStartKey(p.fechaCreacionKey)
  );

  const semanasEntregas = groupCount(
    pedidosConEntrega.filter((p) => p.estado === "entregado"),
    (p) => getWeekStartKey(p.fechaEntregaKey)
  );

  const semanasFacturacion = groupSum(
    pedidosConEntrega.filter((p) => p.estado === "entregado"),
    (p) => getWeekStartKey(p.fechaEntregaKey),
    (p) => p.precio_total
  );

  const deliveredRows = [];
  for (const pedido of pedidosConEntrega) {
    if (pedido.estado !== "entregado") continue;
    const rows = itemsByPedido.get(pedido.id) || [];
    for (const item of rows) {
      deliveredRows.push({
        ...item,
        cliente_nombre: pedido.cliente_nombre,
        fechaEntregaKey: pedido.fechaEntregaKey,
        precio_total_pedido: Number(pedido.precio_total || 0),
      });
    }
  }

  const semanasKilos = groupSum(
    deliveredRows,
    (row) => getWeekStartKey(row.fechaEntregaKey),
    (row) => row.peso_kg
  );

  const allWeekKeys = Array.from(
    new Set([
      ...semanasPedidos.keys(),
      ...semanasEntregas.keys(),
      ...semanasFacturacion.keys(),
      ...semanasKilos.keys(),
    ])
  ).sort();

  const pedidosPorSemana = allWeekKeys.map((key) => ({
    semana: key,
    label: formatWeekLabel(key),
    valor: semanasPedidos.get(key) || 0,
  }));

  const entregasPorSemana = allWeekKeys.map((key) => ({
    semana: key,
    label: formatWeekLabel(key),
    valor: semanasEntregas.get(key) || 0,
  }));

  const facturacionPorSemana = allWeekKeys.map((key) => ({
    semana: key,
    label: formatWeekLabel(key),
    valor: Number(semanasFacturacion.get(key) || 0),
  }));

  const kilosPorSemana = allWeekKeys.map((key) => ({
    semana: key,
    label: formatWeekLabel(key),
    valor: Number(semanasKilos.get(key) || 0),
  }));

  const startTop = getLastNDaysStartKey(periodoTopDias);

  const deliveredRowsPeriodo = deliveredRows.filter(
    (row) => row.fechaEntregaKey >= startTop && row.fechaEntregaKey <= endToday
  );

  const topProductosMap = new Map();
  for (const row of deliveredRowsPeriodo) {
    const key = row.producto_nombre || "Sin nombre";
    const actual = topProductosMap.get(key) || { nombre: key, kilos: 0 };
    actual.kilos += Number(row.peso_kg || 0);
    topProductosMap.set(key, actual);
  }

  const topProductos = Array.from(topProductosMap.values())
    .sort((a, b) => b.kilos - a.kilos)
    .slice(0, 8);

  const pedidosEntregadosPeriodo = pedidosConEntrega.filter(
    (p) =>
      p.estado === "entregado" &&
      p.fechaEntregaKey >= startTop &&
      p.fechaEntregaKey <= endToday
  );

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

  const topClientes = Array.from(topClientesMap.values())
    .sort((a, b) => b.facturacion - a.facturacion)
    .slice(0, 8);

  return {
    kpis: {
      pedidosCreados7: pedidosUltimos7.length,
      pedidosEntregados7: pedidosEntregadosUltimos7.length,
      facturacion7,
      kilosVendidos7,
    },
    pedidosPorSemana,
    kilosPorSemana,
    entregasPorSemana,
    facturacionPorSemana,
    topProductos,
    topClientes,
  };
}