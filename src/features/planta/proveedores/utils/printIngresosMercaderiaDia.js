const formatFecha = (fechaISO) => {
  if (!fechaISO) return "-";

  const [year, month, day] = String(fechaISO).split("-");
  return `${day}/${month}/${year}`;
};

const formatKg = (valor) => {
  if (valor == null) return "-";

  return `${Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
};

const formatKgPorPata = (valor) => {
  if (valor == null || Number.isNaN(Number(valor))) return "-";

  return `${Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg/pata`;
};

const calcularPesoPromedio = (pesoKg, cantidad) => {
  const peso = Number(pesoKg || 0);
  const cant = Number(cantidad || 0);

  if (!(peso > 0) || !(cant > 0)) return null;

  return peso / cant;
};

const sumarTotalesIngresos = (lista = []) => {
  return lista.reduce(
    (acc, ingreso) => {
      acc.patasCantidad += Number(ingreso.patas_cantidad || 0);
      acc.patasPesoKg += Number(ingreso.patas_peso_kg || 0);
      acc.untoPesoKg += Number(ingreso.unto_peso_kg || 0);
      acc.carnePesoKg += Number(ingreso.carne_peso_kg || 0);
      return acc;
    },
    {
      patasCantidad: 0,
      patasPesoKg: 0,
      untoPesoKg: 0,
      carnePesoKg: 0,
    }
  );
};

const obtenerNombreProveedorIngreso = (ingreso) => {
  return (
    ingreso?.proveedor_nombre_snapshot ||
    ingreso?.proveedor?.nombre ||
    "-"
  );
};

const escapeHtml = (valor) => {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export function printIngresosMercaderiaDia({
  fecha,
  ingresos,
  proveedorNombre = "",
}) {
  if (!fecha) return;

  if (!Array.isArray(ingresos) || ingresos.length === 0) return;

  const totalesDia = sumarTotalesIngresos(ingresos);
  const promedioPatasDia = calcularPesoPromedio(
    totalesDia.patasPesoKg,
    totalesDia.patasCantidad
  );

  const filas = ingresos
    .map((ingreso) => {
      const promedioPata = calcularPesoPromedio(
        ingreso.patas_peso_kg,
        ingreso.patas_cantidad
      );

      return `
        <tr>
          <td>${escapeHtml(formatFecha(ingreso.fecha_ingreso))}</td>
          <td>${escapeHtml(obtenerNombreProveedorIngreso(ingreso))}</td>
          <td class="right">${escapeHtml(ingreso.patas_cantidad ?? "-")}</td>
          <td class="right">${escapeHtml(formatKg(ingreso.patas_peso_kg))}</td>
          <td class="right">${escapeHtml(formatKgPorPata(promedioPata))}</td>
          <td class="right">${escapeHtml(formatKg(ingreso.unto_peso_kg))}</td>
          <td class="right">${escapeHtml(formatKg(ingreso.carne_peso_kg))}</td>
          <td>${escapeHtml(ingreso.usuario || "-")}</td>
          <td>${escapeHtml(ingreso.observaciones || "-")}</td>
        </tr>
      `;
    })
    .join("");

  const ventana = window.open("", "_blank");
  if (!ventana) return;

  const html = `
    <html>
      <head>
        <title>Ingreso mercadería - ${escapeHtml(formatFecha(fecha))}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            padding: 16px;
          }

          h1 {
            font-size: 28px;
            margin-bottom: 4px;
          }

          .subtitulo {
            margin-bottom: 16px;
            font-size: 15px;
          }

          .resumen {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }

          .box {
            border: 1px solid #000;
            padding: 8px;
          }

          .box-label {
            font-size: 12px;
            color: #444;
          }

          .box-value {
            font-size: 17px;
            font-weight: 700;
            margin-top: 2px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }

          th,
          td {
            border: 1px solid #000;
            padding: 4px 6px;
            font-size: 13px;
            vertical-align: middle;
          }

          th {
            background: #f1f5f9;
            text-align: left;
          }

          .right {
            text-align: right;
          }

          @media print {
            body {
              padding: 8px;
            }
          }
        </style>
      </head>

      <body>
        <h1>Ingreso de mercadería</h1>

        <div class="subtitulo">
          <strong>Fecha:</strong> ${escapeHtml(formatFecha(fecha))}
          ${
            proveedorNombre
              ? ` · <strong>Proveedor:</strong> ${escapeHtml(proveedorNombre)}`
              : ""
          }
        </div>

        <div class="resumen">
          <div class="box">
            <div class="box-label">Patas</div>
            <div class="box-value">
              ${totalesDia.patasCantidad.toLocaleString("es-AR")} un. - ${escapeHtml(formatKg(totalesDia.patasPesoKg))}
            </div>
            <div>Prom: ${escapeHtml(formatKgPorPata(promedioPatasDia))}</div>
          </div>

          <div class="box">
            <div class="box-label">Unto</div>
            <div class="box-value">${escapeHtml(formatKg(totalesDia.untoPesoKg))}</div>
          </div>

          <div class="box">
            <div class="box-label">Carne</div>
            <div class="box-value">${escapeHtml(formatKg(totalesDia.carnePesoKg))}</div>
          </div>

          <div class="box">
            <div class="box-label">Ingresos</div>
            <div class="box-value">${ingresos.length.toLocaleString("es-AR")}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th class="right">Patas cant.</th>
              <th class="right">Patas kg</th>
              <th class="right">Prom. pata</th>
              <th class="right">Unto kg</th>
              <th class="right">Carne kg</th>
              <th>Usuario</th>
              <th>Observaciones</th>
            </tr>
          </thead>

          <tbody>
            ${filas}
          </tbody>
        </table>
      </body>
    </html>
  `;

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}