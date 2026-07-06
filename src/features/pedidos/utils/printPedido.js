// src/features/pedidos/utils/printPedido.js
import { formatFecha } from "./pedidosUtils";

const formatearMoneda = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "-";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
};

const formatearNumero = (valor, decimales = 2) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "-";

  return numero.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
};

const calcularTotalProducto = (prod) => {
  const peso = Number(prod?.peso);
  const precioPorKg = Number(prod?.precioPorKg);

  if (!Number.isFinite(peso) || !Number.isFinite(precioPorKg)) return null;

  return peso * precioPorKg;
};

// ---- Helper: imprimir un pedido específico EN NUEVA VENTANA ----
export function printPedido(ped) {
  if (!ped) return;

  const fechaStr = ped.fecha ? formatFecha(ped.fecha) : "Sin fecha definida";

  const totalPrecio = ped.productos.reduce((acc, prod) => {
    const totalProducto = calcularTotalProducto(prod);
    return acc + (totalProducto ?? 0);
  }, 0);

  const ventana = window.open("", "_blank");
  if (!ventana) return;

  const html = `
      <html>
        <head>
          <title>Pesaje - ${ped.cliente || ""}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
            h1 { font-size: 32px; margin-bottom: 4px; }
            h2 { font-size: 28px; margin-top: 16px; margin-bottom: 4px; }
            .section { margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td {
              border: 1px solid #000;
              padding: 4px 6px;
              font-size: 17px;
              text-align: center;
              vertical-align: middle;
            }

            td.right,
            td.left {
              text-align: center;
            }
            .totales { margin-top: 8px; font-weight: bold; text-align: right; font-size: 20px; }
          </style>
        </head>
        <body>
          <h1>Comprobante de pesaje</h1>

          <div class="section">
            <div><strong>Cliente:</strong> ${ped.cliente || ""}</div>
            <!-- <div><strong>${ped.id_impositiva}:</strong> ${ped.numero_impositivo || ""}</div> -->
            <div><strong>Dirección:</strong> ${ped.direccion_entrega || "Sin definir"}</div>
            ${
              ped.tipo_factura && ped.tipo_factura !== "Sin_Factura"
                ? `<div><strong>Tipo de factura:</strong> ${ped.tipo_factura}</div>`
                : ""
            }
            <!-- <div><strong>Tipo de entrega:</strong> ${ped.tipoEntrega || ""}</div> -->
            <div><strong>Fecha de entrega:</strong> ${fechaStr}</div>
          </div>

          <h2>Detalle</h2>

          <table>
            <thead>
              <tr>
                <!-- <th>Marca</th> -->
                <th>Producto</th>
                <th>Presentación</th>
                <th class="right">Cantidad</th>
                <th class="right">Peso (kg)</th>
                <th class="right">Precio kg</th>
                <th class="right">Total producto</th>
              </tr>
            </thead>

            <tbody>
              ${
                ped.productos
                  .map((prod) => {
                    const totalProducto = calcularTotalProducto(prod);

                    return `
                      <tr>
                        <!-- <td>${ped.marca}</td> -->
                        <td>${prod.productoNombre || ""}</td>
                        <td>${prod.presentacion || ""}</td>
                        <td class="right">${prod.cantidad ?? ""}</td>
                        <td class="right">${formatearNumero(prod.peso || 0)}</td>
                        <td class="right">${formatearMoneda(prod.precioPorKg)}</td>
                        <td class="right">${formatearMoneda(totalProducto)}</td>
                      </tr>`;
                  })
                  .join("") || ""
              }
            </tbody>
          </table>

          <div class="totales">
            Total: ${formatearMoneda(totalPrecio)}
          </div>
        </body>
      </html>
    `;

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  ventana.print();
  // si querés, podés NO cerrarla automáticamente
  // ventana.close();
}