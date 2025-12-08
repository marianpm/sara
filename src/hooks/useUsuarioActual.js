// hooks/useUsuarioActual.js
import { useEffect, useState } from "react";

const STORAGE_KEY = "sara.usuarioActual";

export function useUsuarioActual() {
  const [usuarioActual, setUsuarioActualState] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUsuarioActualState(JSON.parse(saved));
      } catch (e) {
        console.error("Error leyendo usuarioActual de localStorage", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setUsuarioActual = (user) => {
    setUsuarioActualState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return { usuarioActual, setUsuarioActual };
}
