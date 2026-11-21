import request from "supertest";
import app from "../src/app.js";
import { resetDatabase, getToken, closeDatabase } from "./helpers.js";

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let token;
let categoryId;
const auth = () => ({ Authorization: `Bearer ${token}` });

const validProduct = (overrides = {}) => ({
  enabled: true,
  name: "Camiseta",
  slug: "camiseta",
  stock: 10,
  description: "Camiseta de algodão",
  price: 119.9,
  price_with_discount: 99.9,
  category_ids: [categoryId],
  images: [{ type: "image/png", content: PNG }],
  options: [
    {
      title: "Tamanho",
      shape: "square",
      radius: "4px",
      type: "text",
      values: ["PP", "M", "GG"],
    },
  ],
  ...overrides,
});

const createProduct = (overrides) =>
  request(app).post("/v1/product").set(auth()).send(validProduct(overrides));

const getProduct = (id) => request(app).get(`/v1/product/${id}`);

beforeAll(async () => {
  await resetDatabase();
  token = await getToken();
  const res = await request(app)
    .post("/v1/category")
    .set(auth())
    .send({ name: "Roupas", slug: "roupas", use_in_menu: true });
  categoryId = res.body.id;
});
afterAll(closeDatabase);

describe("POST /v1/product", () => {
  test("201 e devolve o produto completo", async () => {
    const res = await createProduct();
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Camiseta");
    expect(res.body.category_ids).toEqual([categoryId]);
    expect(res.body.images).toHaveLength(1);
    expect(res.body.images[0].content).toMatch(/\/media\/.+\.png$/);
    expect(res.body.options[0].values).toEqual(["PP", "M", "GG"]);
    expect(res.body.options[0].radius).toBe(4);
  });

  test("201 com price_with_discount igual a 0", async () => {
    const res = await createProduct({ slug: "zero", price_with_discount: 0 });
    expect(res.status).toBe(201);
  });

  test("201 sem enabled, imagens, opções e categorias", async () => {
    const res = await request(app)
      .post("/v1/product")
      .set(auth())
      .send({
        name: "Simples",
        slug: "simples",
        price: 10,
        price_with_discount: 8,
      });
    expect(res.status).toBe(201);
    expect(res.body.enabled).toBe(false);
    expect(res.body.images).toEqual([]);
  });

  test("400 sem name", async () => {
    const res = await createProduct({ name: undefined });
    expect(res.status).toBe(400);
  });

  test("400 com price como texto", async () => {
    const res = await createProduct({ price: "abc" });
    expect(res.status).toBe(400);
  });

  test("400 com stock negativo", async () => {
    const res = await createProduct({ stock: -1 });
    expect(res.status).toBe(400);
  });

  test("400 com categoria inexistente", async () => {
    const res = await createProduct({ category_ids: [99999] });
    expect(res.status).toBe(400);
  });

  test("400 com tipo de imagem inválido", async () => {
    const res = await createProduct({
      images: [{ type: "image/gif", content: PNG }],
    });
    expect(res.status).toBe(400);
  });

  test("400 com opção sem title", async () => {
    const res = await createProduct({ options: [{ values: ["PP"] }] });
    expect(res.status).toBe(400);
  });

  test("400 com shape inválido", async () => {
    const res = await createProduct({
      options: [{ title: "X", shape: "triangle", values: ["a"] }],
    });
    expect(res.status).toBe(400);
  });

  test("não deixa produto pela metade quando dá erro (400 não grava nada)", async () => {
    const before = await request(app).get("/v1/product/search?limit=-1");
    await createProduct({ name: "Fantasma", options: [{ values: ["PP"] }] });
    const after = await request(app).get("/v1/product/search?limit=-1");
    expect(after.body.total).toBe(before.body.total);
  });
});

describe("GET /v1/product/:id", () => {
  test("200 com category_ids, images e options", async () => {
    const created = await createProduct({ slug: "get-id" });
    const res = await getProduct(created.body.id);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.category_ids).toEqual([categoryId]);
    expect(res.body.images[0]).toHaveProperty("content");
    expect(res.body.options[0]).toHaveProperty("title", "Tamanho");
  });

  test("404 quando não existe", async () => {
    const res = await getProduct(99999);
    expect(res.status).toBe(404);
  });
});

describe("GET /v1/product/search", () => {
  let a; // Camiseta, categoria, preço 119.9, opção PP/M/GG
  let b; // Tênis, sem categoria, preço 300

  beforeAll(async () => {
    a = (
      await createProduct({ name: "Camiseta Básica", slug: "camiseta-basica" })
    ).body;
    b = (
      await request(app).post("/v1/product").set(auth()).send({
        name: "Tênis Corrida",
        slug: "tenis-corrida",
        description: "Para correr",
        price: 300,
        price_with_discount: 250,
      })
    ).body;
  });

  const ids = (res) => res.body.data.map((p) => p.id);

  test("200 com data, total, limit e page", async () => {
    const res = await request(app).get("/v1/product/search");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(12);
    expect(res.body.page).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  test("limit=1 devolve 1 item", async () => {
    const res = await request(app).get("/v1/product/search?limit=1");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBeGreaterThan(1);
  });

  test("limit=-1 devolve todos", async () => {
    const res = await request(app).get("/v1/product/search?limit=-1");
    expect(res.body.limit).toBe(-1);
    expect(res.body.data.length).toBe(res.body.total);
  });

  test("fields=name,price limita os campos", async () => {
    const res = await request(app).get("/v1/product/search?fields=name,price");
    expect(Object.keys(res.body.data[0]).sort()).toEqual(["name", "price"]);
  });

  test("match filtra por nome", async () => {
    const res = await request(app)
      .get("/v1/product/search")
      .query({ match: "Tênis", limit: -1 });
    expect(ids(res)).toContain(b.id);
    expect(ids(res)).not.toContain(a.id);
  });

  test("match filtra por descrição", async () => {
    const res = await request(app)
      .get("/v1/product/search")
      .query({ match: "correr", limit: -1 });
    expect(ids(res)).toContain(b.id);
  });

  test("category_ids filtra por categoria", async () => {
    const res = await request(app).get(
      `/v1/product/search?category_ids=${categoryId}&limit=-1`,
    );
    expect(ids(res)).toContain(a.id);
    expect(ids(res)).not.toContain(b.id);
  });

  test("price-range filtra por faixa de preço", async () => {
    const res = await request(app).get(
      "/v1/product/search?price-range=250-350&limit=-1",
    );
    expect(ids(res)).toContain(b.id);
    expect(ids(res)).not.toContain(a.id);
  });

  test("option[id] filtra pelo valor da opção", async () => {
    const optionId = a.options[0].id;
    const res = await request(app).get(
      `/v1/product/search?option[${optionId}]=GG&limit=-1`,
    );
    expect(ids(res)).toContain(a.id);
    expect(ids(res)).not.toContain(b.id);
  });

  test("option[id] sem valor correspondente não devolve o produto", async () => {
    const optionId = a.options[0].id;
    const res = await request(app).get(
      `/v1/product/search?option[${optionId}]=XXL&limit=-1`,
    );
    expect(ids(res)).not.toContain(a.id);
  });

  test("400 com limit inválido", async () => {
    const res = await request(app).get("/v1/product/search?limit=abc");
    expect(res.status).toBe(400);
  });

  test("400 com price-range inválido", async () => {
    const res = await request(app).get("/v1/product/search?price-range=abc");
    expect(res.status).toBe(400);
  });

  test("400 com fields inexistente", async () => {
    const res = await request(app).get("/v1/product/search?fields=senha");
    expect(res.status).toBe(400);
  });
});

describe("PUT /v1/product/:id", () => {
  let product;
  const base = {
    name: "Atualizado",
    slug: "atualizado",
    price: 49.9,
    price_with_discount: 0,
  };

  beforeEach(async () => {
    product = (await createProduct({ slug: `put-${Date.now()}` })).body;
  });

  const put = (body, id = product.id) =>
    request(app).put(`/v1/product/${id}`).set(auth()).send(body);

  test("204 e atualiza os campos simples sem mexer em imagens e opções", async () => {
    const res = await put({ ...base, stock: 20 });
    expect(res.status).toBe(204);

    const get = await getProduct(product.id);
    expect(get.body.name).toBe("Atualizado");
    expect(get.body.stock).toBe(20);
    expect(get.body.price_with_discount).toBe(0);
    expect(get.body.images).toHaveLength(1);
    expect(get.body.options).toHaveLength(1);
  });

  test("substitui as categorias", async () => {
    const res = await put({ ...base, category_ids: [] });
    expect(res.status).toBe(204);
    const get = await getProduct(product.id);
    expect(get.body.category_ids).toEqual([]);
  });

  test("cria uma nova imagem (item sem id)", async () => {
    const res = await put({
      ...base,
      images: [{ type: "image/png", content: PNG }],
    });
    expect(res.status).toBe(204);
    const get = await getProduct(product.id);
    expect(get.body.images).toHaveLength(2);
  });

  test("exclui uma imagem (id + deleted)", async () => {
    const res = await put({
      ...base,
      images: [{ id: product.images[0].id, deleted: true }],
    });
    expect(res.status).toBe(204);
    const get = await getProduct(product.id);
    expect(get.body.images).toHaveLength(0);
  });

  test("troca o arquivo de uma imagem (id + base64)", async () => {
    const res = await put({
      ...base,
      images: [{ id: product.images[0].id, type: "image/png", content: PNG }],
    });
    expect(res.status).toBe(204);
    const get = await getProduct(product.id);
    expect(get.body.images).toHaveLength(1);
    expect(get.body.images[0].content).not.toBe(product.images[0].content);
  });

  test("atualiza só o radius de uma opção", async () => {
    const res = await put({
      ...base,
      options: [{ id: product.options[0].id, radius: "10px" }],
    });
    expect(res.status).toBe(204);
    const get = await getProduct(product.id);
    expect(get.body.options[0].radius).toBe(10);
    expect(get.body.options[0].title).toBe("Tamanho");
  });

  test("cria uma nova opção (item sem id)", async () => {
    const res = await put({
      ...base,
      options: [
        {
          title: "Cor",
          shape: "circle",
          type: "color",
          values: ["#000", "#333"],
        },
      ],
    });
    expect(res.status).toBe(204);
    const get = await getProduct(product.id);
    expect(get.body.options).toHaveLength(2);
  });

  test("exclui uma opção (id + deleted)", async () => {
    const res = await put({
      ...base,
      options: [{ id: product.options[0].id, deleted: true }],
    });
    expect(res.status).toBe(204);
    const get = await getProduct(product.id);
    expect(get.body.options).toHaveLength(0);
  });

  test("400 com id de imagem que não pertence ao produto", async () => {
    const res = await put({ ...base, images: [{ id: 99999, deleted: true }] });
    expect(res.status).toBe(400);
  });

  test("400 com id de opção de outro produto", async () => {
    const other = (await createProduct({ slug: `other-${Date.now()}` })).body;
    const res = await put({
      ...base,
      options: [{ id: other.options[0].id, deleted: true }],
    });
    expect(res.status).toBe(400);
  });

  test("400 sem name", async () => {
    const res = await put({ slug: "x", price: 1, price_with_discount: 0 });
    expect(res.status).toBe(400);
  });

  test("404 quando o produto não existe", async () => {
    const res = await put(base, 99999);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /v1/product/:id", () => {
  test("204 e depois 404 no GET", async () => {
    const created = await createProduct({ slug: "apagar" });
    const res = await request(app)
      .delete(`/v1/product/${created.body.id}`)
      .set(auth());
    expect(res.status).toBe(204);

    const get = await getProduct(created.body.id);
    expect(get.status).toBe(404);
  });

  test("404 quando não existe", async () => {
    const res = await request(app).delete("/v1/product/99999").set(auth());
    expect(res.status).toBe(404);
  });
});
