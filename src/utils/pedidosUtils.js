// src/utils/pedidosUtils.js

export const diasSemana = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const formatFecha = (isoDate) => {
  if (!isoDate || isoDate === "Sin fecha definida") return "Sin fecha definida";
  const fecha = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(fecha)) return "Sin fecha definida";

  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  const dia = diasSemana[fecha.getDay()];

  return `${dia} ${dd}-${mm}-${yyyy}`;
};

// Agrupa pedidos por fecha
export const agruparPorFecha = (lista) =>
  (lista || []).reduce((acc, p) => {
    const key = p.fecha || "Sin fecha definida";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

// Un pedido está "pesado" cuando TODOS sus productos tienen peso
export const pedidoEstaPesado = (pedido) =>
  pedido &&
  Array.isArray(pedido.productos) &&
  pedido.productos.length > 0 &&
  pedido.productos.every(
    (prod) => prod.peso != null && !Number.isNaN(prod.peso)
  );

// Aplica el filtro Hoy / Semana / Todas, con el mismo criterio que tenías
// Aplica el filtro Hoy / Semana / Todas (rolling) y evita bugs de fecha
export const filtrarPedidosPorFecha = (pedidos, filtroFecha) => {
  const lista = pedidos || [];

  const hoy0 = new Date();
  hoy0.setHours(0, 0, 0, 0);

  const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const parseFechaPedido = (iso) => {
    if (!iso) return null;
    // iso viene como "YYYY-MM-DD"
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Horizonte para "Hoy": hasta mañana, pero si es viernes/sábado, hasta lunes
  const dow = hoy0.getDay(); // 0 dom ... 5 vie ... 6 sáb
  const extraHoy = dow === 5 ? 3 : dow === 6 ? 2 : 1; // vie->lun, sáb->lun, resto->mañana
  const limiteHoy = addDays(hoy0, extraHoy);

  // "Semana": próximos 7 días desde hoy (rolling)
  const limiteSemana = addDays(hoy0, 7);

  return lista
    .filter((p) => {
      // contemplar ambos modelos
      if (p.estado === "entregado" || p.entregado === true) return false;

      // sin fecha
      if (!p.fecha) return true;

      const f = parseFechaPedido(p.fecha);
      if (!f) return true;

      if (filtroFecha === "hoy") {
        // incluye anteriores y hasta el límite (mañana o lunes si viernes/sábado)
        return f <= limiteHoy;
      }

      if (filtroFecha === "semana") {
        // incluye anteriores y hasta hoy + 7 días
        return f <= limiteSemana;
      }

      // "todas"
      return true;
    })
    .sort((a, b) => {
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return new Date(`${a.fecha}T00:00:00`) - new Date(`${b.fecha}T00:00:00`);
    });
};

