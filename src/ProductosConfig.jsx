import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { registrarLog } from "./logsEventos";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const CATEGORIAS = ["Salazon Cocida", "Salazon Cruda"];

const buildEmptyVariante = () => ({
  presentacion: "",
  precio_mayorista: "",
  precio_minorista: "",
  activo: true,
});

const normalizarProductos = (productos = []) =>
  productos.map((p) => ({
    id: p.id,
    nombre: p.nombre ?? "",
    categoria: p.categoria ?? "",
    activo: p.activo !== false,
    producto_variantes: (p.producto_variantes || []).map((v) => ({
      id: v.id,
      producto_id: v.producto_id ?? p.id,
      presentacion: v.presentacion ?? "",
      precio_mayorista:
        v.precio_mayorista != null ? String(v.precio_mayorista) : "",
      precio_minorista:
        v.precio_minorista != null ? String(v.precio_minorista) : "",
      activo: v.activo !== false,
    })),
  }));

const textoErrorSupabase = (error) => {
  if (error?.code === "23505") {
    return "Ya existe una presentación con ese nombre para este producto.";
  }
  return error?.message || "Ocurrió un error.";
};

const normalizarTexto = (valor) => (valor ?? "").trim();

const aNumero = (valor) => Number(valor);

const formatearPrecio = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor ?? "");
  return numero.toFixed(2);
};

const registrarLogsCambiosProducto = ({
  usuarioActual,
  productoOriginal,
  productoEditado,
}) => {
  if (!productoOriginal || !productoEditado) return;

  const nombreOriginal = normalizarTexto(productoOriginal.nombre);
  const nombreNuevo = normalizarTexto(productoEditado.nombre);

  if (nombreOriginal !== nombreNuevo) {
    registrarLog(
      usuarioActual,
      `Se cambió el nombre del producto "${nombreOriginal}" a "${nombreNuevo}".`
    );
  }

  if ((productoOriginal.activo !== false) !== (productoEditado.activo !== false)) {
    registrarLog(
      usuarioActual,
      productoEditado.activo
        ? `Se activó el producto "${nombreNuevo}".`
        : `Se desactivó el producto "${nombreNuevo}".`
    );
  }
};

const registrarLogsCambiosVariante = ({
  usuarioActual,
  productoNombre,
  varianteOriginal,
  varianteEditada,
}) => {
  if (!varianteOriginal || !varianteEditada) return;

  const presentacionOriginal = normalizarTexto(varianteOriginal.presentacion);
  const presentacionNueva = normalizarTexto(varianteEditada.presentacion);

  if (presentacionOriginal !== presentacionNueva) {
    registrarLog(
      usuarioActual,
      `Se cambió el nombre de la presentación "${presentacionOriginal}" a "${presentacionNueva}" del producto "${productoNombre}".`
    );
  }

  const precioMayoristaOriginal = aNumero(varianteOriginal.precio_mayorista);
  const precioMayoristaNuevo = aNumero(varianteEditada.precio_mayorista);

  if (precioMayoristaOriginal !== precioMayoristaNuevo) {
    registrarLog(
      usuarioActual,
      `Se cambió el precio mayorista de la presentación "${presentacionNueva}" del producto "${productoNombre}" de $${formatearPrecio(precioMayoristaOriginal)} a $${formatearPrecio(precioMayoristaNuevo)}.`
    );
  }

  const precioMinoristaOriginal = aNumero(varianteOriginal.precio_minorista);
  const precioMinoristaNuevo = aNumero(varianteEditada.precio_minorista);

  if (precioMinoristaOriginal !== precioMinoristaNuevo) {
    registrarLog(
      usuarioActual,
      `Se cambió el precio minorista de la presentación "${presentacionNueva}" del producto "${productoNombre}" de $${formatearPrecio(precioMinoristaOriginal)} a $${formatearPrecio(precioMinoristaNuevo)}.`
    );
  }

  if ((varianteOriginal.activo !== false) !== (varianteEditada.activo !== false)) {
    registrarLog(
      usuarioActual,
      varianteEditada.activo
        ? `Se activó la presentación "${presentacionNueva}" del producto "${productoNombre}".`
        : `Se desactivó la presentación "${presentacionNueva}" del producto "${productoNombre}".`
    );
  }
};

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? "bg-slate-900" : "bg-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function ProductosConfig({
  productos,
  cargando,
  error,
  recargarProductos,
  usuarioActual,
}) {
  const [productosLocales, setProductosLocales] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    categoria: CATEGORIAS[0],
  });
  const [nuevaVariantePorProducto, setNuevaVariantePorProducto] = useState({});
  const [guardandoNuevoProducto, setGuardandoNuevoProducto] = useState(false);
  const [guardandoProductos, setGuardandoProductos] = useState({});
  const [guardandoVariantes, setGuardandoVariantes] = useState({});
  const [mensaje, setMensaje] = useState(null);

  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);
  const [mostrarNuevaVariantePorProducto, setMostrarNuevaVariantePorProducto] =
    useState({});

  const [presentacionesColapsadas, setPresentacionesColapsadas] = useState({});

  const [exportandoGoogleSheet, setExportandoGoogleSheet] = useState(false);
  const [copiandoLinkGoogleSheet, setCopiandoLinkGoogleSheet] = useState(false);

  const GOOGLE_PRICE_SHEET_URL =
    import.meta.env.VITE_GOOGLE_PRICE_SHEET_URL || "";

  const copiarLinkGoogleSheet = async () => {
    if (!GOOGLE_PRICE_SHEET_URL) {
      mostrarMensaje(
        "error",
        "Falta configurar VITE_GOOGLE_PRICE_SHEET_URL."
      );
      return;
    }

    try {
      setCopiandoLinkGoogleSheet(true);
      await navigator.clipboard.writeText(GOOGLE_PRICE_SHEET_URL);
      mostrarMensaje("success", "Link copiado al portapapeles.");
    } catch (e) {
      mostrarMensaje("error", "No se pudo copiar el link.");
    } finally {
      setCopiandoLinkGoogleSheet(false);
    }
  };

  const exportarGoogleSheet = async () => {
    if (exportandoGoogleSheet) return;

    setExportandoGoogleSheet(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "exportar-precios-google-sheet"
      );

      if (error) {
        mostrarMensaje(
          "error",
          error.message || "No se pudo exportar la lista a Google Sheet."
        );
        return;
      }

      mostrarMensaje(
        "success",
        data?.message || "Lista exportada correctamente a Google Sheet."
      );
    } catch (e) {
      mostrarMensaje("error", String(e));
    } finally {
      setExportandoGoogleSheet(false);
    }
  };

  useEffect(() => {
    const productosNormalizados = normalizarProductos(productos);
    setProductosLocales(productosNormalizados);

    setPresentacionesColapsadas((prev) => {
      const next = { ...prev };

      productosNormalizados.forEach((p) => {
        if (next[p.id] === undefined) {
          next[p.id] = p.activo === false;
        }
      });

      return next;
    });
  }, [productos]);

  const toggleNuevaVarianteVisible = (productoId) => {
    setMostrarNuevaVariantePorProducto((prev) => ({
      ...prev,
      [productoId]: !prev[productoId],
    }));
  };

  const togglePresentacionesColapsadas = (productoId) => {
    setPresentacionesColapsadas((prev) => ({
      ...prev,
      [productoId]: !prev[productoId],
    }));
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
  };

  const setGuardandoProducto = (productoId, valor) => {
    setGuardandoProductos((prev) => ({ ...prev, [productoId]: valor }));
  };

  const setGuardandoVariante = (varianteId, valor) => {
    setGuardandoVariantes((prev) => ({ ...prev, [varianteId]: valor }));
  };

  const actualizarProductoLocal = (productoId, field, value) => {
    setProductosLocales((prev) =>
      prev.map((p) => (p.id === productoId ? { ...p, [field]: value } : p))
    );
  };

  const actualizarVarianteLocal = (productoId, varianteId, field, value) => {
    setProductosLocales((prev) =>
      prev.map((p) =>
        p.id !== productoId
          ? p
          : {
              ...p,
              producto_variantes: p.producto_variantes.map((v) =>
                v.id === varianteId ? { ...v, [field]: value } : v
              ),
            }
      )
    );
  };

  const actualizarNuevaVariante = (productoId, field, value) => {
    setNuevaVariantePorProducto((prev) => ({
      ...prev,
      [productoId]: {
        ...buildEmptyVariante(),
        ...(prev[productoId] || {}),
        [field]: value,
      },
    }));
  };

  const guardarProducto = async (productoId) => {
    const producto = productosLocales.find((p) => p.id === productoId);
    const productoOriginal = normalizarProductos(productos).find(
      (p) => p.id === productoId
    );

    if (!producto || !productoOriginal) return;

    const nombre = producto.nombre.trim();

    if (!nombre) {
      mostrarMensaje("error", "El nombre del producto no puede quedar vacío.");
      return;
    }

    setGuardandoProducto(productoId, true);

    try {
      const { error: updateError } = await supabase
        .from("productos")
        .update({
          nombre,
          activo: producto.activo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productoId);

      if (updateError) {
        mostrarMensaje("error", textoErrorSupabase(updateError));
        return;
      }

      registrarLogsCambiosProducto({
        usuarioActual,
        productoOriginal,
        productoEditado: {
          ...producto,
          nombre,
        },
      });

      mostrarMensaje("success", "Producto actualizado correctamente.");
      await recargarProductos();
    } catch (e) {
      mostrarMensaje("error", String(e));
    } finally {
      setGuardandoProducto(productoId, false);
    }
  };

  const crearProducto = async () => {
    if (guardandoNuevoProducto) return;

    const nombre = nuevoProducto.nombre.trim();
    const categoria = nuevoProducto.categoria;

    if (!nombre) {
      mostrarMensaje("error", "Tenés que ingresar el nombre del producto.");
      return;
    }

    if (!CATEGORIAS.includes(categoria)) {
      mostrarMensaje("error", "La categoría seleccionada no es válida.");
      return;
    }

    const yaExisteProducto = (productosLocales || []).some(
      (p) => (p.nombre || "").trim().toLowerCase() === nombre.toLowerCase()
    );

    if (yaExisteProducto) {
      mostrarMensaje("error", "Ya existe un producto con ese nombre.");
      return;
    }

    setGuardandoNuevoProducto(true);

    try {
      const { error: insertError } = await supabase.from("productos").insert({
        nombre,
        categoria,
        activo: true,
      });

      if (insertError) {
        mostrarMensaje("error", textoErrorSupabase(insertError));
        return;
      }

      registrarLog(
        usuarioActual,
        `Se creó el producto "${nombre}" en la categoría "${categoria}".`
      );

      setNuevoProducto({
        nombre: "",
        categoria: CATEGORIAS[0],
      });

      setMostrarNuevoProducto(false);

      mostrarMensaje("success", "Producto creado correctamente.");
      await recargarProductos();
    } catch (e) {
      mostrarMensaje("error", String(e));
    } finally {
      setGuardandoNuevoProducto(false);
    }
  };

  const guardarVariante = async (productoId, varianteId) => {
    const producto = productosLocales.find((p) => p.id === productoId);
    const productoOriginal = normalizarProductos(productos).find(
      (p) => p.id === productoId
    );

    const variante = producto?.producto_variantes?.find((v) => v.id === varianteId);
    const varianteOriginal = productoOriginal?.producto_variantes?.find(
      (v) => v.id === varianteId
    );

    if (!producto || !productoOriginal || !variante || !varianteOriginal) return;

    const presentacion = variante.presentacion.trim();
    const precioMayorista = Number(variante.precio_mayorista);
    const precioMinorista = Number(variante.precio_minorista);

    if (!presentacion) {
      mostrarMensaje("error", "La presentación no puede quedar vacía.");
      return;
    }

    if (Number.isNaN(precioMayorista) || precioMayorista < 0) {
      mostrarMensaje("error", "El precio mayorista no es válido.");
      return;
    }

    if (Number.isNaN(precioMinorista) || precioMinorista < 0) {
      mostrarMensaje("error", "El precio minorista no es válido.");
      return;
    }

    setGuardandoVariante(varianteId, true);

    try {
      const { error: updateError } = await supabase
        .from("producto_variantes")
        .update({
          presentacion,
          precio_mayorista: precioMayorista,
          precio_minorista: precioMinorista,
          activo: variante.activo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", varianteId);

      if (updateError) {
        mostrarMensaje("error", textoErrorSupabase(updateError));
        return;
      }

      registrarLogsCambiosVariante({
        usuarioActual,
        productoNombre: normalizarTexto(productoOriginal.nombre),
        varianteOriginal,
        varianteEditada: {
          ...variante,
          presentacion,
          precio_mayorista: precioMayorista,
          precio_minorista: precioMinorista,
        },
      });

      mostrarMensaje("success", "Presentación actualizada correctamente.");
      await recargarProductos();
    } catch (e) {
      mostrarMensaje("error", String(e));
    } finally {
      setGuardandoVariante(varianteId, false);
    }
  };

  const agregarVariante = async (productoId) => {
    if (guardandoProductos[productoId]) return;

    const form = {
      ...buildEmptyVariante(),
      ...(nuevaVariantePorProducto[productoId] || {}),
    };

    const producto = productosLocales.find((p) => p.id === productoId);
    const presentacion = form.presentacion.trim();
    const precioMayorista = Number(form.precio_mayorista);
    const precioMinorista = Number(form.precio_minorista);

    if (!presentacion) {
      mostrarMensaje("error", "Tenés que ingresar la presentación.");
      return;
    }

    const yaExistePresentacion = (producto?.producto_variantes || []).some(
      (v) => (v.presentacion || "").trim().toLowerCase() === presentacion.toLowerCase()
    );

    if (yaExistePresentacion) {
      mostrarMensaje(
        "error",
        "Ese producto ya tiene una presentación con ese nombre."
      );
      return;
    }

    if (Number.isNaN(precioMayorista) || precioMayorista < 0) {
      mostrarMensaje("error", "El precio mayorista no es válido.");
      return;
    }

    if (Number.isNaN(precioMinorista) || precioMinorista < 0) {
      mostrarMensaje("error", "El precio minorista no es válido.");
      return;
    }

    setGuardandoProducto(productoId, true);

    try {
      const { error: insertError } = await supabase
        .from("producto_variantes")
        .insert({
          producto_id: productoId,
          presentacion,
          precio_mayorista: precioMayorista,
          precio_minorista: precioMinorista,
          activo: form.activo !== false,
        });

      if (insertError) {
        mostrarMensaje("error", textoErrorSupabase(insertError));
        return;
      }

      registrarLog(
        usuarioActual,
        `Se creó la presentación "${presentacion}" para el producto "${producto?.nombre ?? productoId}" con precio mayorista $${formatearPrecio(precioMayorista)} y precio minorista $${formatearPrecio(precioMinorista)}.`
      );

      setNuevaVariantePorProducto((prev) => ({
        ...prev,
        [productoId]: buildEmptyVariante(),
      }));

      setMostrarNuevaVariantePorProducto((prev) => ({
        ...prev,
        [productoId]: false,
      }));

      mostrarMensaje("success", "Presentación creada correctamente.");
      await recargarProductos();
    } catch (e) {
      mostrarMensaje("error", String(e));
    } finally {
      setGuardandoProducto(productoId, false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Configuración de productos</h2>
          </div>

          {mensaje && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                mensaje.tipo === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {mensaje.texto}
            </div>
          )}

          <div className="rounded-xl border border-dashed border-slate-300 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">Creá un producto nuevo</h3>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={copiarLinkGoogleSheet}
                  disabled={copiandoLinkGoogleSheet}
                >
                  {copiandoLinkGoogleSheet ? "Copiando..." : "Copiar link"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={exportarGoogleSheet}
                  disabled={exportandoGoogleSheet}
                >
                  {exportandoGoogleSheet ? "Exportando..." : "Exportar a Google Sheet"}
                </Button>

                <Button
                  type="button"
                  variant={mostrarNuevoProducto ? "outline" : "default"}
                  onClick={() => setMostrarNuevoProducto((prev) => !prev)}
                  disabled={exportandoGoogleSheet}
                >
                  {mostrarNuevoProducto ? "Cancelar" : "Agregar producto"}
                </Button>
              </div>
            </div>

            {mostrarNuevoProducto && (
              <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-800">
                      Nombre
                    </label>
                    <Input
                      value={nuevoProducto.nombre}
                      onChange={(e) =>
                        setNuevoProducto((prev) => ({
                          ...prev,
                          nombre: e.target.value,
                        }))
                      }
                      placeholder="Ej: Jamón cocido natural"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-800">
                      Categoría
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                      value={nuevoProducto.categoria}
                      onChange={(e) =>
                        setNuevoProducto((prev) => ({
                          ...prev,
                          categoria: e.target.value,
                        }))
                      }
                    >
                      {CATEGORIAS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMostrarNuevoProducto(false)}
                  >
                    Cerrar
                  </Button>
                  <Button onClick={crearProducto} disabled={guardandoNuevoProducto}>
                    {guardandoNuevoProducto ? "Guardando..." : "Crear producto"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {cargando && (
            <p className="text-sm text-slate-500">Cargando productos...</p>
          )}

          {error && (
            <p className="text-sm text-red-600">
              Error cargando productos: {error}
            </p>
          )}

          {!cargando && !error && productosLocales.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay productos cargados todavía.
            </p>
          )}
        </CardContent>
      </Card>

      {!cargando &&
        !error &&
        productosLocales.map((producto) => {
          const nuevaVariante =
            nuevaVariantePorProducto[producto.id] || buildEmptyVariante();

          return (
            <Card key={producto.id}>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800">
                        Nombre
                      </label>
                      <Input
                        value={producto.nombre}
                        onChange={(e) =>
                          actualizarProductoLocal(
                            producto.id,
                            "nombre",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800">
                        Categoría
                      </label>
                      <div className="h-9 flex items-center rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700">
                        {producto.categoria || "Sin categoría"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800">
                        Estado
                      </label>
                      <div className="flex items-center gap-3 h-9">
                        <ToggleSwitch
                          checked={producto.activo}
                          onChange={() => {
                            const nuevoActivo = !producto.activo;

                            actualizarProductoLocal(producto.id, "activo", nuevoActivo);

                            setPresentacionesColapsadas((prev) => ({
                              ...prev,
                              [producto.id]: !nuevoActivo,
                            }));
                          }}
                        />
                        <span className="text-sm text-slate-700">
                          {producto.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => guardarProducto(producto.id)}
                      disabled={!!guardandoProductos[producto.id]}
                    >
                      {guardandoProductos[producto.id]
                        ? "Guardando..."
                        : "Guardar producto"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">Presentaciones</h3>
                      <span className="text-xs text-slate-500">
                        {producto.producto_variantes.length}{" "}
                        {producto.producto_variantes.length === 1
                          ? "presentación"
                          : "presentaciones"}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => togglePresentacionesColapsadas(producto.id)}
                    >
                      {presentacionesColapsadas[producto.id]
                        ? "Ver presentaciones"
                        : "Ocultar"}
                    </Button>
                  </div>

                  {!presentacionesColapsadas[producto.id] && (
                    <>
                      {producto.producto_variantes.length === 0 && (
                        <p className="text-sm text-slate-500">
                          Este producto todavía no tiene presentaciones.
                        </p>
                      )}

                      {producto.producto_variantes.map((variante) => (
                        <div
                          key={variante.id}
                          className="rounded-xl border border-slate-200 p-3 space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-800">
                                Presentación
                              </label>
                              <Input
                                value={variante.presentacion}
                                onChange={(e) =>
                                  actualizarVarianteLocal(
                                    producto.id,
                                    variante.id,
                                    "presentacion",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-800">
                                Precio mayorista
                              </label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variante.precio_mayorista}
                                onChange={(e) =>
                                  actualizarVarianteLocal(
                                    producto.id,
                                    variante.id,
                                    "precio_mayorista",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-800">
                                Precio minorista
                              </label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variante.precio_minorista}
                                onChange={(e) =>
                                  actualizarVarianteLocal(
                                    producto.id,
                                    variante.id,
                                    "precio_minorista",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-800">
                                Estado
                              </label>
                              <div className="flex items-center gap-3 h-9">
                                <ToggleSwitch
                                  checked={variante.activo}
                                  onChange={() =>
                                    actualizarVarianteLocal(
                                      producto.id,
                                      variante.id,
                                      "activo",
                                      !variante.activo
                                    )
                                  }
                                />
                                <span className="text-sm text-slate-700">
                                  {variante.activo ? "Activa" : "Inactiva"}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-transparent">
                                Guardar
                              </label>
                              <Button
                                className="w-full"
                                onClick={() => guardarVariante(producto.id, variante.id)}
                                disabled={!!guardandoVariantes[variante.id]}
                              >
                                {guardandoVariantes[variante.id] ? "Guardando..." : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="rounded-xl border border-dashed border-slate-300 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-medium text-sm">Nueva presentación</h4>

                          <Button
                            type="button"
                            variant={
                              mostrarNuevaVariantePorProducto[producto.id] ? "outline" : "default"
                            }
                            onClick={() => toggleNuevaVarianteVisible(producto.id)}
                          >
                            {mostrarNuevaVariantePorProducto[producto.id]
                              ? "Cancelar"
                              : "Agregar presentación"}
                          </Button>
                        </div>

                        {mostrarNuevaVariantePorProducto[producto.id] && (
                          <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-800">
                                  Presentación
                                </label>
                                <Input
                                  value={nuevaVariante.presentacion}
                                  onChange={(e) =>
                                    actualizarNuevaVariante(
                                      producto.id,
                                      "presentacion",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ej: Pieza, Media pieza, x kg"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-800">
                                  Precio mayorista
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={nuevaVariante.precio_mayorista}
                                  onChange={(e) =>
                                    actualizarNuevaVariante(
                                      producto.id,
                                      "precio_mayorista",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-800">
                                  Precio minorista
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={nuevaVariante.precio_minorista}
                                  onChange={(e) =>
                                    actualizarNuevaVariante(
                                      producto.id,
                                      "precio_minorista",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-800">
                                  Estado inicial
                                </label>
                                <div className="flex items-center gap-3 h-9">
                                  <ToggleSwitch
                                    checked={nuevaVariante.activo}
                                    onChange={() =>
                                      actualizarNuevaVariante(
                                        producto.id,
                                        "activo",
                                        !nuevaVariante.activo
                                      )
                                    }
                                  />
                                  <span className="text-sm text-slate-700">
                                    {nuevaVariante.activo ? "Activa" : "Inactiva"}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-sm font-medium text-transparent">
                                  Agregar
                                </label>
                                <Button
                                  className="w-full"
                                  onClick={() => agregarVariante(producto.id)}
                                  disabled={!!guardandoProductos[producto.id]}
                                >
                                  {guardandoProductos[producto.id] ? "Guardando..." : "Agregar"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}