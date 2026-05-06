import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

if (!JWT_SECRET) {
  throw new Error("Falta JWT_SECRET en el backend.");
}

export function firmarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      usuario: usuario.usuario,
      rol: usuario.rol,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

export function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}