// logsEventos.js
import { supabase } from "./supabaseClient";

export function registrarLog(usuarioActual, descripcion) {
  const usuario = usuarioActual?.usuario ?? null;

  // estación fija por PC (se guarda en localStorage)
  let estacion = null;
  if (typeof window !== "undefined") {
    estacion = localStorage.getItem("sara_estacion") || null;
  }

  supabase
    .from("logs_eventos")
    .insert({
      usuario,
      descripcion,
      estacion,                        
      created_at: new Date().toISOString(), // si querés seguí seteando vos la fecha
    })
    .then(({ error }) => {
      if (error) {
        console.error("Error registrando log de evento:", error);
      }
    })
    .catch((err) => {
      console.error("Error inesperado registrando log:", err);
    });
}
