import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { env } from "./config/env";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Error interno" });
});

app.listen(env.port, () => {
  console.log(`API Inventario Cibao escuchando en el puerto ${env.port}`);
});
