// logsEventos.js
import { supabase } from "./supabaseClient";

export function registrarLog(usuarioActual, descripcion) {
  const usuario = usuarioActual?.usuario ?? null;

  supabase
    .from("logs_eventos")
    .insert({ usuario, descripcion, created_at: new Date().toISOString(), })
    .then(({ error }) => {
      if (error) {
        console.error("Error registrando log de evento:", error);
      }
    })
    .catch((err) => {
      console.error("Error inesperado registrando log:", err);
    });
}
