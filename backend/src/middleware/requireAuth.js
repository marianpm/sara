import { HttpError } from "../lib/errors.js";
import { verificarToken } from "../lib/jwt.js";

export function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [tipo, token] = header.split(" ");

    if (tipo !== "Bearer" || !token) {
      throw new HttpError(401, "Falta token de autorización.");
    }

    req.usuarioActual = verificarToken(token);
    next();
  } catch {
    next(new HttpError(401, "Sesión inválida o vencida."));
  }
}

export function requireRole(...rolesPermitidos) {
  return (req, _res, next) => {
    const rol = req.usuarioActual?.rol;

    if (!rolesPermitidos.includes(rol)) {
      return next(new HttpError(403, "No tenés permisos para esta operación."));
    }

    next();
  };
}