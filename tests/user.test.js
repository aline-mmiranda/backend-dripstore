import request from "supertest";
import app from "../src/app.js";
import { resetDatabase, getToken, closeDatabase } from "./helpers.js";

let token;
const auth = () => ({ Authorization: `Bearer ${token}` });

const newUser = (email) => ({
  firstname: "Maria",
  surname: "Silva",
  email,
  password: "123@123",
  confirmPassword: "123@123",
});

beforeAll(async () => {
  await resetDatabase();
  token = await getToken();
});
afterAll(closeDatabase);

describe("POST /v1/user", () => {
  test("201 ao cadastrar e não devolve a senha", async () => {
    const res = await request(app)
      .post("/v1/user")
      .send(newUser("maria@mail.com"));
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("maria@mail.com");
    expect(res.body.password).toBeUndefined();
  });

  test("400 com senhas diferentes", async () => {
    const res = await request(app)
      .post("/v1/user")
      .send({ ...newUser("a@mail.com"), confirmPassword: "outra" });
    expect(res.status).toBe(400);
  });

  test("400 com campo faltando", async () => {
    const { surname, ...incompleto } = newUser("b@mail.com");
    const res = await request(app).post("/v1/user").send(incompleto);
    expect(res.status).toBe(400);
  });

  test("400 com email já cadastrado", async () => {
    const res = await request(app)
      .post("/v1/user")
      .send(newUser("maria@mail.com"));
    expect(res.status).toBe(400);
  });
});

describe("GET /v1/user/:id", () => {
  let id;
  beforeAll(async () => {
    const res = await request(app)
      .post("/v1/user")
      .send(newUser("get@mail.com"));
    id = res.body.id;
  });

  test("200 com os dados do usuário, sem senha", async () => {
    const res = await request(app).get(`/v1/user/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id,
      firstname: "Maria",
      surname: "Silva",
      email: "get@mail.com",
    });
  });

  test("404 quando não existe", async () => {
    const res = await request(app).get("/v1/user/99999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /v1/user/:id", () => {
  let id;
  beforeAll(async () => {
    const res = await request(app)
      .post("/v1/user")
      .send(newUser("put@mail.com"));
    id = res.body.id;
  });

  test("204 e os dados são atualizados", async () => {
    const res = await request(app)
      .put(`/v1/user/${id}`)
      .set(auth())
      .send({ firstname: "Novo", surname: "Nome", email: "novo@mail.com" });
    expect(res.status).toBe(204);

    const get = await request(app).get(`/v1/user/${id}`);
    expect(get.body.firstname).toBe("Novo");
    expect(get.body.email).toBe("novo@mail.com");
  });

  test("400 com corpo incompleto", async () => {
    const res = await request(app)
      .put(`/v1/user/${id}`)
      .set(auth())
      .send({ firstname: "X" });
    expect(res.status).toBe(400);
  });

  test("400 com email de outro usuário", async () => {
    const res = await request(app)
      .put(`/v1/user/${id}`)
      .set(auth())
      .send({ firstname: "A", surname: "B", email: "maria@mail.com" });
    expect(res.status).toBe(400);
  });

  test("404 quando não existe", async () => {
    const res = await request(app)
      .put("/v1/user/99999")
      .set(auth())
      .send({ firstname: "A", surname: "B", email: "z@mail.com" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /v1/user/:id", () => {
  test("204 e depois o usuário não existe mais", async () => {
    const created = await request(app)
      .post("/v1/user")
      .send(newUser("del@mail.com"));
    const res = await request(app)
      .delete(`/v1/user/${created.body.id}`)
      .set(auth());
    expect(res.status).toBe(204);

    const get = await request(app).get(`/v1/user/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  test("404 quando não existe", async () => {
    const res = await request(app).delete("/v1/user/99999").set(auth());
    expect(res.status).toBe(404);
  });
});
