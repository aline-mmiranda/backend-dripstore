import fs from "node:fs";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import express from "express";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const swaggerDocument = YAML.parse(
  fs.readFileSync("./docs/openapi.yaml", "utf8"),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/v1", userRoutes);
app.use("/v1", categoryRoutes);
app.use("/v1", productRoutes);

export default app;
