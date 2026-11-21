import "dotenv/config";
import app from "./app.js";
import { sequelize } from "./models/relations.js";

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  } catch (error) {
    console.error("Erro ao iniciar:", error);
  }
}

start();
