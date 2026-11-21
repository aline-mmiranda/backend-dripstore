import request from "supertest";
import app from "../src/app.js";
import { resetDatabase, getToken, closeDatabase } from "./helpers.js";

let token;

beforeAll(async () => {
  await resetDatabase();
  token = await getToken();
});
afterAll(closeDatabase);

describe("POST /v1/user/token", () => {
  test("200 e devolve o token com credenciais corretas", async () => {
    const res = await request(app)
      .post("/v1/user/token")
      .send({ email: "teste@mail.com", password: "123@123" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });

  test("400 com senha errada", async () => {
    const res = await request(app)
      .post("/v1/user/token")
      .send({ email: "teste@mail.com", password: "errada" });
    expect(res.status).toBe(400);
  });

  test("400 sem email", async () => {
    const res = await request(app)
      .post("/v1/user/token")
      .send({ password: "123@123" });
    expect(res.status).toBe(400);
  });
});

describe("Validação do token em POST, PUT e DELETE", () => {
  const body = { name: "Cat", slug: "cat" };

  test("400 sem o cabeçalho Authorization (POST)", async () => {
    const res = await request(app).post("/v1/category").send(body);
    expect(res.status).toBe(400);
  });

  test("400 sem o cabeçalho Authorization (PUT)", async () => {
    const res = await request(app).put("/v1/user/1").send({});
    expect(res.status).toBe(400);
  });

  test("400 sem o cabeçalho Authorization (DELETE)", async () => {
    const res = await request(app).delete("/v1/product/1");
    expect(res.status).toBe(400);
  });

  test("401 com token inválido", async () => {
    const res = await request(app)
      .post("/v1/category")
      .set("Authorization", "Bearer token-falso")
      .send(body);
    expect(res.status).toBe(401);
  });

  test("201 com token válido", async () => {
    const res = await request(app)
      .post("/v1/category")
      .set("Authorization", `Bearer ${token}`)
      .send(body);
    expect(res.status).toBe(201);
  });

  test("GET continua público (200 sem token)", async () => {
    const res = await request(app).get("/v1/category/search");
    expect(res.status).toBe(200);
  });
});
