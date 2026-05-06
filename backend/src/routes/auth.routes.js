import express from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { firmarToken } from "../lib/jwt.js";
import { HttpError, assert } from "../lib/errors.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const usuario = String(req.body?.usuario || "").trim();
    const clave = String(req.body?.clave || "");

    assert(usuario, 400, "Falta usuario.");
    assert(clave, 400, "Falta contraseña.");

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("id, usuario, rol, clave")
      .eq("usuario", usuario)
      .maybeSingle();

    if (error) throw error;

    if (!data || data.clave !== clave) {
      throw new HttpError(401, "Usuario o contraseña incorrectos.");
    }

    const usuarioSeguro = {
      id: data.id,
      usuario: data.usuario,
      rol: data.rol,
    };

    const token = firmarToken(usuarioSeguro);

    res.json({
      token,
      usuario: usuarioSeguro,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({
    usuario: req.usuarioActual,
  });
});

export default router;