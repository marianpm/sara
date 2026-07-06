import { toBlob } from "html-to-image";

const normalizar = (valor = "") =>
  String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const PRODUCTOS_CONFIG = {
  1: {
    label: "J. Crudo c/hueso",
    orden: 1,
    pesos: {
      "sin prensar": "9-10",
    },
  },
  2: {
    label: "J. Crudo s/hueso c/cuero",
    orden: 2,
    pesos: {
      "sin prensar": "4,5 - 6",
      parma: "4,5 - 6",
    },
  },
  3: {
    label: "J. Crudo s/hueso c/cuero Serrano",
    orden: 3,
    pesos: {
      "sin prensar": "4,5 - 6",
      parma: "4,5 - 6",
    },
  },
  4: {
    label: "J. Crudo Listo",
    orden: 4,
    pesos: {
      "sin prensar": "4,5 - 5,5",
      parma: "4,5 - 5,5",
      cuadrado: "4,5 - 5,5",
    },
  },
  5: {
    label: "J. Crudo Listo Serrano",
    orden: 5,
    pesos: {
      "sin prensar": "4,5 - 5,5",
      parma: "4,5 - 5,5",
      cuadrado: "4,5 - 5,5",
    },
  },
  6: {
    label: "J. Crudo Listo 1/2",
    orden: 6,
    pesos: {
      "sin prensar": "2 - 2,5",
      cuadrado: "2 - 2,5",
      parma: "2 - 2,5",
    },
  },
  7: {
    label: "J. Crudo Listo 1/2 Serrano",
    orden: 7,
    pesos: {
      "sin prensar": "2 - 2,5",
      cuadrado: "2 - 2,5",
      parma: "2 - 2,5",
    },
  },
  8: {
    label: "Jamón cocido natural",
    orden: 1,
    pesos: {
      oval: "6",
      "medio oval": "3",
      rectangular: "6",
    },
  },
  9: {
    label: "Jamón cocido",
    orden: 2,
    pesos: {
      oval: "5,5",
      rectangular: "6",
    },
  },
  10: {
    label: "Fiambre de paleta cocido",
    orden: 3,
    pesos: {
      oval: "6",
      rectangular: "6",
    },
  },
  11: {
    label: "Fiambre de cerdo para emparedado",
    orden: 4,
    pesos: {
      oval: "5,5",
      rectangular: "6",
    },
  },
};

const PRODUCTO_LABELS_FALLBACK = {
  "jamon crudo c/h": "J. Crudo c/hueso",
  "jamon crudo c/hueso": "J. Crudo c/hueso",

  "jamon crudo s/h c": "J. Crudo s/hueso c/cuero",
  "jamon crudo s/hueso c/cuero": "J. Crudo s/hueso c/cuero",

  "jamon crudo s/h s/c": "J. Crudo Listo",
  "jamon crudo s/h s/cuero": "J. Crudo Listo",
  "jamon crudo listo": "J. Crudo Listo",

  "jamon crudo listo serrano": "J. Crudo Listo Serrano",
  "jamon crudo 1/2": "J. Crudo Listo 1/2",
  "jamon crudo 1/2 serrano": "J. Crudo Listo 1/2 Serrano",

  "jamon cocido natural": "Jamón cocido natural",
  "jamon cocido": "Jamón cocido",
  "jamon cocido (pernil de cerdo)": "Jamón cocido",

  "paleta cocida (fiambre de cerdo)": "Fiambre de paleta cocido",
  "fiambre de paleta cocido": "Fiambre de paleta cocido",

  "sandwichera (fiambre para emparedado)":
    "Fiambre de cerdo para emparedado",
  "fiambre de cerdo para emparedado":
    "Fiambre de cerdo para emparedado",
  "fiambre de cerdo para emparedados":
    "Fiambre de cerdo para emparedado",
};

const PRESENTACION_LABELS = {
  "sin prensar": "Sin Prensar",
  parma: "Parma",
  cuadrado: "Cuadrado",
  oval: "Oval",
  "medio oval": "Medio Oval",
  rectangular: "Rectangular",
};

const ORDEN_PRESENTACIONES = {
  "sin prensar": 1,
  parma: 2,
  cuadrado: 3,
  oval: 1,
  "medio oval": 2,
  rectangular: 3,
};

const precioTexto = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor ?? "");

  return numero.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const formatearMesAnio = () => {
  const ahora = new Date();

  const mes = ahora.toLocaleString("es-AR", {
    month: "long",
  });

  const texto = `${mes} ${ahora.getFullYear()}`;

  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const productoVisible = (producto) => {
  const config = PRODUCTOS_CONFIG[producto.id];

  if (config?.label) {
    return config.label;
  }

  const key = normalizar(producto.nombre);
  return PRODUCTO_LABELS_FALLBACK[key] || producto.nombre || "";
};

const presentacionVisible = (presentacion) => {
  const key = normalizar(presentacion);
  return PRESENTACION_LABELS[key] || presentacion || "";
};

const pesoAprox = (producto, presentacion) => {
  const config = PRODUCTOS_CONFIG[producto.id];
  const presentacionKey = normalizar(presentacion);

  return config?.pesos?.[presentacionKey] || "";
};

const ordenProducto = (producto) => {
  const config = PRODUCTOS_CONFIG[producto.productoId];

  if (config?.orden != null) {
    return config.orden;
  }

  return 9999;
};

export function armarFilasListaPrecios(productos = [], tipoPrecio = "mayorista") {
  const filasCrudas = [];
  const filasCocidas = [];

  (productos || []).forEach((producto) => {
    if (producto.activo === false) return;

    const categoria = producto.categoria;
    const nombreVisible = productoVisible(producto);

    (producto.producto_variantes || []).forEach((variante) => {
      if (variante.activo === false) return;

      const presentacion = presentacionVisible(variante.presentacion);

      const precio =
        tipoPrecio === "mayorista"
          ? variante.precio_mayorista
          : variante.precio_minorista;

      const fila = {
        productoId: producto.id,
        varianteId: variante.id,
        producto: nombreVisible,
        presentacion,
        pesoAprox: pesoAprox(producto, presentacion),
        precio: precioTexto(precio),
      };

      if (categoria === "Salazon Cruda") {
        filasCrudas.push(fila);
      }

      if (categoria === "Salazon Cocida") {
        filasCocidas.push(fila);
      }
    });
  });

  const ordenar = (a, b) => {
    const ordenProductoA = ordenProducto(a);
    const ordenProductoB = ordenProducto(b);

    if (ordenProductoA !== ordenProductoB) {
      return ordenProductoA - ordenProductoB;
    }

    const ordenPresentacionA =
      ORDEN_PRESENTACIONES[normalizar(a.presentacion)] ?? 9999;

    const ordenPresentacionB =
      ORDEN_PRESENTACIONES[normalizar(b.presentacion)] ?? 9999;

    if (ordenPresentacionA !== ordenPresentacionB) {
      return ordenPresentacionA - ordenPresentacionB;
    }

    return a.producto.localeCompare(b.producto);
  };

  filasCrudas.sort(ordenar);
  filasCocidas.sort(ordenar);

  return {
    filasCrudas,
    filasCocidas,
  };
}

export async function copiarNodoComoImagen(node) {
  if (!node) {
    throw new Error("No se pudo generar la imagen.");
  }

  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#e5e5e5",
  });

  if (!blob) {
    throw new Error("No se pudo convertir la lista en imagen.");
  }

  if (
    navigator.clipboard &&
    window.ClipboardItem &&
    typeof navigator.clipboard.write === "function"
  ) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
    return;
  }

  throw new Error("Tu navegador no permite copiar imágenes al portapapeles.");
}