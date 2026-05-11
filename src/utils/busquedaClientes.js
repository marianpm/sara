// utils/busquedaClientes.js
export const normalizarTextoBusqueda = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const clienteCoincideBusqueda = (cliente, texto) => {
  const q = normalizarTextoBusqueda(texto);
  if (!q) return true;

  return [
    cliente?.nombre,
    cliente?.razon_social,
    cliente?.cliente,
    cliente?.nombre_fantasia,
    cliente?.direccion,
    cliente?.domicilio_entrega,
    cliente?.domicilio_fiscal,
    cliente?.numero_impositivo,
  ].some((valor) => normalizarTextoBusqueda(valor).includes(q));
};