import React, { useEffect, useMemo, useRef, useState } from "react";

const normalizarTexto = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export default function ClienteAutocomplete({
  clientes = [],
  value = null,
  inputValue,
  onInputChange,
  onSelect,
  placeholder = "Buscar cliente...",
  disabled = false,
  minChars = 0,
  maxResults = 8,
  noResultsText = "No se encontraron clientes.",
}) {
  const [queryInterna, setQueryInterna] = useState(value?.nombre ?? "");
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef(null);

  const esControlado = inputValue !== undefined;
  const query = esControlado ? inputValue : queryInterna;

  useEffect(() => {
    if (!esControlado) {
      setQueryInterna(value?.nombre ?? "");
    }
  }, [value, esControlado]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clientesFiltrados = useMemo(() => {
    const texto = normalizarTexto(query);

    if (!texto) {
      return minChars === 0 ? clientes.slice(0, maxResults) : [];
    }

    if (texto.length < minChars) return [];

    return clientes
      .filter((cliente) => {
        const nombre = normalizarTexto(cliente?.nombre);
        const nombreFantasia = normalizarTexto(cliente?.nombre_fantasia);
        const direccion = normalizarTexto(cliente?.direccion);

        return (
          nombre.includes(texto) ||
          nombreFantasia.includes(texto) ||
          direccion.includes(texto)
        );
      })
      .slice(0, maxResults);
  }, [clientes, query, minChars, maxResults]);

  const handleChange = (event) => {
    const nuevoValor = event.target.value;

    if (!esControlado) {
      setQueryInterna(nuevoValor);
    }

    onInputChange?.(nuevoValor);
    setAbierto(true);

    if (!nuevoValor.trim()) {
      onSelect?.(null);
    }
  };

  const handleSelect = (cliente) => {
    if (!esControlado) {
      setQueryInterna(cliente?.nombre ?? "");
    }

    onInputChange?.(cliente?.nombre ?? "");
    setAbierto(false);
    onSelect?.(cliente);
  };

  const handleFocus = () => {
    if (!disabled) setAbierto(true);
  };

  const mostrarDropdown =
    abierto &&
    !disabled &&
    ((query && query.trim().length >= minChars) || (!query && minChars === 0));

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />

      {mostrarDropdown && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
          {clientesFiltrados.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              {noResultsText}
            </div>
          ) : (
            clientesFiltrados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(cliente);
                }}
                className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
              >
                {cliente.nombre_fantasia && cliente.nombre && cliente.nombre_fantasia !== cliente.nombre && (
                  <div className="text-xs font-medium text-slate-900">
                    {cliente.nombre}
                  </div>
                )}
                <div className="text-sm  text-slate-500">
                  {cliente.nombre_fantasia || cliente.nombre}
                </div>       
                {cliente.direccion && (
                  <div className="text-xs text-slate-500">
                    {cliente.direccion}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}