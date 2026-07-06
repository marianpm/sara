// src/features/cuenta-corriente/utils/printEstadoCuenta.js

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatMoney = (value) => {
  const n = Number(value || 0);

  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
};

const formatFecha = (value) => {
  if (!value) return "-";

  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("es-AR");
};

const formatFechaHora = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const construirEstadoCuentaHtml = ({ cliente, movimientos }) => {
  const clienteReal = cliente?.clienteRegistro || {};
  const fechaEmision = formatFechaHora();

  const filasMovimientos = (movimientos || [])
    .map((m) => {
      const debe = Number(m.debe || 0);
      const haber = Number(m.haber || 0);

      return `
        <tr>
          <td>${escapeHtml(formatFecha(m.fecha))}</td>
          <td>${escapeHtml(m.tipo_movimiento || "-")}</td>
          <td>
            <div class="comprobante">${escapeHtml(m.comprobante || "-")}</div>
            ${
              m.observacion
                ? `<div class="observacion">${escapeHtml(m.observacion)}</div>`
                : ""
            }
          </td>
          <td>${escapeHtml(m.estado || "-")}</td>
          <td class="num">${debe > 0 ? escapeHtml(formatMoney(debe)) : "-"}</td>
          <td class="num">${haber > 0 ? escapeHtml(formatMoney(haber)) : "-"}</td>
          <td class="num saldo">${escapeHtml(formatMoney(m.saldo_acumulado))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Estado de cuenta - ${escapeHtml(
          clienteReal.razon_social || cliente.razon_social || "Cliente"
        )}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 32px;
            color: #0f172a;
            font-size: 12px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 18px;
          }

          h1 {
            margin: 0;
            font-size: 22px;
          }

          h2 {
            margin: 22px 0 8px;
            font-size: 15px;
          }

          .muted {
            color: #64748b;
          }

          .cliente-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 24px;
            margin-bottom: 18px;
          }

          .resumen {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin: 16px 0 22px;
          }

          .card {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 10px;
          }

          .card .label {
            color: #64748b;
            font-size: 10px;
            margin-bottom: 4px;
          }

          .card .value {
            font-weight: 700;
            font-size: 13px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            text-align: left;
            background: #f1f5f9;
            color: #475569;
            font-size: 10px;
            text-transform: uppercase;
            border: 1px solid #cbd5e1;
            padding: 7px;
          }

          td {
            border: 1px solid #cbd5e1;
            padding: 7px;
            vertical-align: top;
          }

          .num {
            text-align: right;
            white-space: nowrap;
          }

          .saldo {
            font-weight: 700;
          }

          .comprobante {
            font-weight: 600;
          }

          .observacion {
            color: #64748b;
            font-size: 10px;
            margin-top: 2px;
          }

          .footer {
            margin-top: 24px;
            color: #64748b;
            font-size: 10px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
          }

          @media print {
            body {
              margin: 18px;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div>
            <h1>Estado de cuenta</h1>
            <div class="muted">Emitido: ${escapeHtml(fechaEmision)}</div>
          </div>

          <div style="text-align: right;">
            <div class="muted">Cuenta corriente de cliente</div>
          </div>
        </div>

        <h2>Cliente</h2>

        <div class="cliente-box">
          <div>
            <strong>Razón social:</strong>
            ${escapeHtml(clienteReal.razon_social || "-")}
          </div>

          <div>
            <strong>Nombre de fantasía:</strong>
            ${escapeHtml(clienteReal.nombre_fantasia || "-")}
          </div>

          <div>
            <strong>ID impositivo:</strong>
            ${escapeHtml(clienteReal.id_impositiva || "-")}
            ${escapeHtml(clienteReal.numero_impositivo || "-")}
          </div>

          <div>
            <strong>Condición IVA:</strong>
            ${escapeHtml(clienteReal.condicion_iva || "-")}
          </div>

          <div>
            <strong>Email:</strong>
            ${escapeHtml(clienteReal.email || "-")}
          </div>

          <div>
            <strong>Teléfono:</strong>
            ${escapeHtml(clienteReal.telefono || "-")}
          </div>

          <div>
            <strong>Domicilio fiscal:</strong>
            ${escapeHtml(clienteReal.domicilio_fiscal || "-")}
          </div>

          <div>
            <strong>Domicilio entrega:</strong>
            ${escapeHtml(clienteReal.domicilio_entrega || "-")}
          </div>
        </div>

        <h2>Resumen</h2>

        <div class="resumen">
          <div class="card">
            <div class="label">Cargos</div>
            <div class="value">${escapeHtml(formatMoney(cliente.total_facturado))}</div>
          </div>

          <div class="card">
            <div class="label">Cobrado</div>
            <div class="value">${escapeHtml(formatMoney(cliente.total_cobrado))}</div>
          </div>

          <div class="card">
            <div class="label">Aplicado</div>
            <div class="value">${escapeHtml(formatMoney(cliente.total_aplicado))}</div>
          </div>

          <div class="card">
            <div class="label">Saldo pendiente</div>
            <div class="value">${escapeHtml(formatMoney(cliente.saldo_pendiente))}</div>
          </div>

          <div class="card">
            <div class="label">Saldo a favor</div>
            <div class="value">${escapeHtml(formatMoney(cliente.saldo_a_favor))}</div>
          </div>

          <div class="card">
            <div class="label">Saldo neto</div>
            <div class="value">${escapeHtml(formatMoney(cliente.saldo_neto))}</div>
          </div>
        </div>

        <h2>Movimientos</h2>

        ${
          movimientos?.length
            ? `
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Comprobante</th>
                    <th>Estado</th>
                    <th>Debe</th>
                    <th>Haber</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  ${filasMovimientos}
                </tbody>
              </table>
            `
            : `<p class="muted">Este cliente no tiene movimientos de cuenta corriente.</p>`
        }

        <div class="footer">
          Este estado de cuenta refleja los comprobantes, cargos y cobros registrados al momento de emisión.
        </div>

        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;
};

export const printEstadoCuenta = ({ cliente, movimientos }) => {
  if (!cliente) return;

  const html = construirEstadoCuentaHtml({
    cliente,
    movimientos,
  });

  const printWindow = window.open("", "_blank", "width=1100,height=800");

  if (!printWindow) {
    window.alert(
      "No se pudo abrir la ventana de impresión. Revisá si el navegador bloqueó las ventanas emergentes."
    );
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};