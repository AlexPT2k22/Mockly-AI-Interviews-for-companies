export function errorHandler(err, _req, res, _next) {
  const status = err?.status || 500;
  const message = err?.message || "Internal Server Error";
  if (process.env.NODE_ENV !== "test") {
    console.error("[error]", { message, stack: err?.stack });
  }
  res.status(status).json({ error: message });
}
