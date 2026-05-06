import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import cobrosRoutes from "./routes/cobros.routes.js";

const app = express();

const port = Number(process.env.PORT || 4000);

const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sara-backend" });
});

app.use("/auth", authRoutes);
app.use("/cobros", cobrosRoutes);

app.use((err, _req, res, _next) => {
  console.error("API error:", err);

  const status = err.status || 500;

  res.status(status).json({
    error: err.message || "Error interno del servidor.",
    details: err.details || null,
  });
});

app.listen(port, () => {
  console.log(`Sara backend escuchando en http://localhost:${port}`);
});