import request from "supertest";
import app from "../src/app.js";
import { resetDatabase, getToken, closeDatabase } from "./helpers.js";

let token;
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await resetDatabase();
  token = await getToken();
});
afterAll(closeDatabase);

const create = (body) =>
  request(app).post("/v1/category").set(auth()).send(body);

describe("POST /v1/category", () => {
  test("201 ao criar", async () => {
    const res = await create({
      name: "Shoes",
      slug: "shoes",
      use_in_menu: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe("shoes");
    expect(res.body.use_in_menu).toBe(true);
  });

  test("201 sem use_in_menu (padrão false)", async () => {
    const res = await create({ name: "Offers", slug: "offers" });
    expect(res.status).toBe(201);
    expect(res.body.use_in_menu).toBe(false);
  });

  test("400 sem slug", async () => {
    const res = await create({ name: "Sem slug" });
    expect(res.status).toBe(400);
  });

  test("400 com use_in_menu que não é booleano", async () => {
    const res = await create({ name: "X", slug: "x", use_in_menu: "sim" });
    expect(res.status).toBe(400);
  });
});

describe("GET /v1/category/:id", () => {
  test("200 com a categoria", async () => {
    const created = await create({
      name: "Bolsas",
      slug: "bolsas",
      use_in_menu: false,
    });
    const res = await request(app).get(`/v1/category/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Bolsas");
  });

  test("404 quando não existe", async () => {
    const res = await request(app).get("/v1/category/99999");
    expect(res.status).toBe(404);
  });
});

describe("GET /v1/category/search", () => {
  beforeAll(async () => {
    await create({ name: "Menu 1", slug: "menu-1", use_in_menu: true });
    await create({ name: "Menu 2", slug: "menu-2", use_in_menu: true });
    await create({ name: "Oculta", slug: "oculta", use_in_menu: false });
  });

  test("200 com data, total, limit e page (padrões 12 e 1)", async () => {
    const res = await request(app).get("/v1/category/search");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.limit).toBe(12);
    expect(res.body.page).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  test("limit=-1 devolve todos", async () => {
    const res = await request(app).get("/v1/category/search?limit=-1");
    expect(res.body.limit).toBe(-1);
    expect(res.body.data.length).toBe(res.body.total);
  });

  test("limit=2 e page=2 paginam", async () => {
    const res = await request(app).get("/v1/category/search?limit=2&page=2");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(2);
  });

  test("fields=name,slug limita os campos", async () => {
    const res = await request(app).get("/v1/category/search?fields=name,slug");
    expect(Object.keys(res.body.data[0]).sort()).toEqual(["name", "slug"]);
  });

  test("use_in_menu=true filtra só as do menu", async () => {
    const res = await request(app).get(
      "/v1/category/search?use_in_menu=true&limit=-1",
    );
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((c) => c.use_in_menu === true)).toBe(true);
  });

  test("400 com limit inválido", async () => {
    const res = await request(app).get("/v1/category/search?limit=abc");
    expect(res.status).toBe(400);
  });

  test("400 com page inválido", async () => {
    const res = await request(app).get("/v1/category/search?page=0");
    expect(res.status).toBe(400);
  });

  test("400 com fields inexistente", async () => {
    const res = await request(app).get("/v1/category/search?fields=senha");
    expect(res.status).toBe(400);
  });
});

describe("PUT /v1/category/:id", () => {
  let id;
  beforeAll(async () => {
    id = (await create({ name: "Antes", slug: "antes" })).body.id;
  });

  test("204 e atualiza", async () => {
    const res = await request(app)
      .put(`/v1/category/${id}`)
      .set(auth())
      .send({ name: "Depois", slug: "depois", use_in_menu: true });
    expect(res.status).toBe(204);

    const get = await request(app).get(`/v1/category/${id}`);
    expect(get.body.name).toBe("Depois");
    expect(get.body.use_in_menu).toBe(true);
  });

  test("400 sem name", async () => {
    const res = await request(app)
      .put(`/v1/category/${id}`)
      .set(auth())
      .send({ slug: "x" });
    expect(res.status).toBe(400);
  });

  test("404 quando não existe", async () => {
    const res = await request(app)
      .put("/v1/category/99999")
      .set(auth())
      .send({ name: "A", slug: "a" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /v1/category/:id", () => {
  test("204 e depois 404 no GET", async () => {
    const created = await create({ name: "Apagar", slug: "apagar" });
    const res = await request(app)
      .delete(`/v1/category/${created.body.id}`)
      .set(auth());
    expect(res.status).toBe(204);

    const get = await request(app).get(`/v1/category/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  test("404 quando não existe", async () => {
    const res = await request(app).delete("/v1/category/99999").set(auth());
    expect(res.status).toBe(404);
  });
});
