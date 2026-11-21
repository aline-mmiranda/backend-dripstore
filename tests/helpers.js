import request from "supertest";
import app from "../src/app.js";
import { sequelize } from "../src/models/relations.js";

export async function resetDatabase() {
  if (!sequelize.config.database.endsWith("_test")) {
    throw new Error(
      "Os testes só podem rodar em um banco que termine com _test",
    );
  }
  await sequelize.sync({ force: true });
}

export async function getToken() {
  await request(app).post("/v1/user").send({
    firstname: "Teste",
    surname: "User",
    email: "teste@mail.com",
    password: "123@123",
    confirmPassword: "123@123",
  });
  const res = await request(app)
    .post("/v1/user/token")
    .send({ email: "teste@mail.com", password: "123@123" });
  return res.body.token;
}

export async function closeDatabase() {
  await sequelize.close();
}
