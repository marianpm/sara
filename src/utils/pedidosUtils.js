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
export const filtrarPedidosPorFecha = (pedidos, filtroFecha) => {
  const lista = pedidos || [];
  const hoy0 = new Date();
  hoy0.setHours(0, 0, 0, 0);

  const finSemana = new Date(`${hoy0}T00:00:00`);
  finSemana.setDate(hoy0.getDate() + 7);

  return lista
    .filter((p) => {
      if (p.estado === "entregado") return false;

      if (!p.fecha) return true;

      const fecha = new Date(p.fecha);
      if (Number.isNaN(fecha)) return true;

      const f = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate()
      );

      if (filtroFecha === "hoy") {
        // todos hasta hoy (incluye anteriores)
        return f <= hoy0;
      }

      if (filtroFecha === "semana") {
        // todos hasta hoy + 7 días (incluye anteriores)
        return f <= finSemana;
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
