// src/utils/printPedido.js
import { formatFecha } from "./pedidosUtils";

// ---- Helper: imprimir un pedido específico EN NUEVA VENTANA ----
export function printPedido(ped) {
  if (!ped) return;
  const fechaStr = ped.fecha ? formatFecha(ped.fecha) : "Sin fecha definida";
  const totalKg = ped.productos.reduce(
    (acc, prod) => acc + (prod.peso || 0),
    0
  );

  const ventana = window.open("", "_blank");
  if (!ventana) return;

  const html = `
      <html>
        <head>
          <title>Pesaje - ${ped.cliente || ""}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 16px; margin-top: 16px; margin-bottom: 4px; }
            .section { margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #000; padding: 4px 6px; font-size: 12px; }
            th { text-align: center; }
            td.right { text-align: right; }
            .totales { margin-top: 8px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Comprobante de pesaje</h1>
          <div class="section">
            <div><strong>Cliente:</strong> ${ped.cliente || ""}</div>
            <div><strong>CUIT:</strong> ${ped.cuit || ""}</div>
            <div><strong>Dirección:</strong> ${ped.direccion || "Sin definir"}</div>
            <div><strong>Tipo de factura:</strong> ${ped.tipo_factura || ""}</div>
            <div><strong>Tipo de entrega:</strong> ${ped.tipoEntrega || ""}</div>
            <div><strong>Fecha:</strong> ${fechaStr}</div>
          </div>

          <h2>Detalle de productos</h2>
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Producto</th>
                <th>Presentación</th>
                <th class="right">Cantidad</th>
                <th class="right">Peso (kg)</th>
              </tr>
            </thead>
            <tbody>
              ${
                ped.productos
                  .map(
                    (prod) => `
                <tr>
                  <td>${prod.marca}</td>
                  <td>${prod.productoNombre}</td>
                  <td>${prod.presentacion}</td>
                  <td class="left">${prod.cantidad}</td>
                  <td class="left">${(prod.peso || 0).toFixed(2)}</td>
                </tr>`
                  )
                  .join("") || ""
              }
            </tbody>
          </table>

          <div class="totales">
            Total kg: ${totalKg.toFixed(2)}
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
