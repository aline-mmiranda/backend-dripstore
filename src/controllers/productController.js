import fs from "node:fs/promises";
import path from "node:path";
import { Op } from "sequelize";
import {
  sequelize,
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
} from "../models/relations.js";

const EXTENSIONS = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
};

const SHAPES = ["square", "circle"];
const TYPES = ["text", "color"];

const productInclude = [
  {
    model: Category,
    as: "categories",
    attributes: ["id"],
    through: { attributes: [] },
  },
  { model: ProductImage, as: "images" },
  { model: ProductOption, as: "options" },
];

function pickDefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, v]) => v !== undefined),
  );
}

async function saveImage(productId, image, index) {
  const extension = EXTENSIONS[image.type];
  const base64 = image.content.replace(/^data:.*;base64,/, "");
  const relativePath = `media/product-${productId}/${Date.now()}-${index}.${extension}`;
  const fullPath = path.join("public", relativePath);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, Buffer.from(base64, "base64"));

  return relativePath;
}

function formatProduct(product, baseUrl) {
  return {
    id: product.id,
    enabled: product.enabled,
    name: product.name,
    slug: product.slug,
    stock: product.stock,
    description: product.description,
    price: product.price,
    price_with_discount: product.price_with_discount,
    category_ids: product.categories.map((category) => category.id),
    images: product.images.map((image) => ({
      id: image.id,
      content: `${baseUrl}/${image.path}`,
    })),
    options: product.options.map((option) => ({
      id: option.id,
      title: option.title,
      shape: option.shape,
      radius: option.radius,
      type: option.type,
      values: option.values.split(","),
    })),
  };
}

function intersect(current, ids) {
  return current === null ? ids : current.filter((id) => ids.includes(id));
}

export async function searchProducts(req, res) {
  const { fields, match } = req.query;
  const categoryIdsParam = req.query.category_ids;
  const priceRange = req.query["price-range"];

  const limit = req.query.limit === undefined ? 12 : Number(req.query.limit);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);

  if (!Number.isInteger(limit) || (limit !== -1 && limit < 1)) {
    return res.status(400).json({ message: "limit inválido" });
  }
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({ message: "page inválido" });
  }

  const allowedFields = [
    "id",
    "enabled",
    "name",
    "slug",
    "stock",
    "description",
    "price",
    "price_with_discount",
    "category_ids",
    "images",
    "options",
  ];
  let fieldList = null;
  if (fields) {
    fieldList = String(fields).split(",");
    if (fieldList.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({ message: "fields inválido" });
    }
  }

  const where = {};
  let allowedIds = null;

  if (match) {
    const term = `%${String(match)}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { description: { [Op.like]: term } },
    ];
  }

  if (priceRange !== undefined) {
    const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(String(priceRange));
    if (!m || Number(m[1]) > Number(m[2])) {
      return res.status(400).json({ message: "price-range inválido" });
    }
    where.price = { [Op.between]: [Number(m[1]), Number(m[2])] };
  }

  if (categoryIdsParam !== undefined) {
    const ids = String(categoryIdsParam).split(",").map(Number);
    if (ids.some((number) => !Number.isInteger(number))) {
      return res.status(400).json({ message: "category_ids inválido" });
    }
    const links = await ProductCategory.findAll({
      where: { category_id: ids },
      attributes: ["product_id"],
    });
    allowedIds = intersect(allowedIds, [
      ...new Set(links.map((link) => link.product_id)),
    ]);
  }

  const optionFilters = [];
  for (const [key, value] of Object.entries(req.query)) {
    const match = key.match(/^option\[(\d+)\]$/);
    if (match) {
      optionFilters.push({
        id: Number(match[1]),
        values: String(value).split(","),
      });
    }
  }
  if (optionFilters.length) {
    const optionRows = await ProductOption.findAll({
      where: { id: optionFilters.map((filter) => filter.id) },
    });
    for (const filter of optionFilters) {
      const ids = optionRows
        .filter(
          (option) =>
            option.id === filter.id &&
            option.values.split(",").some((v) => filter.values.includes(v)),
        )
        .map((option) => option.product_id);
      allowedIds = intersect(allowedIds, ids);
    }
  }

  if (allowedIds !== null) {
    where.id = { [Op.in]: allowedIds };
  }

  const queryOptions = {
    where,
    include: productInclude,
    order: [["id", "ASC"]],
    distinct: true,
  };
  if (limit !== -1) {
    queryOptions.limit = limit;
    queryOptions.offset = (page - 1) * limit;
  }

  const { count, rows } = await Product.findAndCountAll(queryOptions);

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  let data = rows.map((product) => formatProduct(product, baseUrl));

  if (fieldList) {
    data = data.map((item) =>
      Object.fromEntries(fieldList.map((field) => [field, item[field]])),
    );
  }

  return res.status(200).json({ data, total: count, limit, page });
}

export async function getProductById(req, res) {
  const { id } = req.params;

  const product = await Product.findByPk(id, {
    include: productInclude,
  });

  if (!product) {
    return res.status(404).json({ message: "Produto não encontrado" });
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return res.status(200).json(formatProduct(product, baseUrl));
}

export async function createProduct(req, res) {
  const {
    enabled,
    name,
    slug,
    stock,
    description,
    price,
    price_with_discount,
    category_ids,
    images,
    options,
  } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ message: "name e slug são obrigatórios" });
  }

  if (typeof price !== "number" || typeof price_with_discount !== "number") {
    return res
      .status(400)
      .json({ message: "price e price_with_discount inválidos" });
  }

  if (enabled !== undefined && typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled inválido" });
  }

  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ message: "stock inválido" });
  }

  if (category_ids !== undefined) {
    if (!Array.isArray(category_ids)) {
      return res.status(400).json({ message: "category_ids inválido" });
    }
    const found = await Category.count({ where: { id: category_ids } });
    if (found !== category_ids.length) {
      return res
        .status(400)
        .json({ message: "Categoria inexistente em category_ids" });
    }
  }

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      return res.status(400).json({ message: "imagens inválido" });
    }

    for (const image of images) {
      if (
        !image ||
        !EXTENSIONS[image.type] ||
        typeof image.content !== "string"
      ) {
        return res.status(400).json({ message: "images contém item inválido" });
      }
    }
  }

  if (options !== undefined) {
    if (!Array.isArray(options)) {
      return res.status(400).json({ message: "options inválido" });
    }

    for (const option of options) {
      if (!option || !option.title) {
        return res.status(400).json({ message: "option sem title" });
      }

      if (!Array.isArray(option.values) || option.values.length === 0) {
        return res.status(400).json({ message: "option com values inválido" });
      }

      if (option.shape !== undefined && !SHAPES.includes(option.shape)) {
        return res.status(400).json({ message: "option com shape inválido" });
      }

      if (option.type !== undefined && !TYPES.includes(option.type)) {
        return res.status(400).json({ message: "option com type inválido" });
      }

      if (option.radius !== undefined) {
        const radius = parseInt(option.radius);
        if (Number.isNaN(radius) || radius < 0) {
          return res
            .status(400)
            .json({ message: "option com radius inválido" });
        }
      }
    }
  }

  const productId = await sequelize.transaction(async (t) => {
    const product = await Product.create(
      { enabled, name, slug, stock, description, price, price_with_discount },
      { transaction: t },
    );

    if (category_ids?.length) {
      await product.setCategories(category_ids, { transaction: t });
    }

    if (images?.length) {
      const rows = [];
      for (const [index, image] of images.entries()) {
        const imagePath = await saveImage(product.id, image, index);
        rows.push({ product_id: product.id, path: imagePath });
      }
      await ProductImage.bulkCreate(rows, { transaction: t });
    }

    if (options?.length) {
      await ProductOption.bulkCreate(
        options.map((option) => ({
          product_id: product.id,
          title: option.title,
          shape: option.shape,
          radius:
            option.radius !== undefined ? parseInt(option.radius) : undefined,
          type: option.type,
          values: option.values.join(","),
        })),
        { transaction: t },
      );
    }

    return product.id;
  });

  const created = await Product.findByPk(productId, {
    include: productInclude,
  });
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return res.status(201).json(formatProduct(created, baseUrl));
}

export async function updateProduct(req, res) {
  const { id } = req.params;

  const {
    enabled,
    name,
    slug,
    stock,
    description,
    price,
    price_with_discount,
    category_ids,
    images,
    options,
  } = req.body;

  const product = await Product.findByPk(id);

  if (!product) {
    return res.status(404).json({ message: "Produto não encontrado" });
  }

  if (!name || !slug) {
    return res.status(400).json({ message: "name e slug são obrigatórios" });
  }

  if (typeof price !== "number" || typeof price_with_discount !== "number") {
    return res
      .status(400)
      .json({ message: "price e price_with_discount inválidos" });
  }

  if (enabled !== undefined && typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled inválido" });
  }

  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ message: "stock inválido" });
  }

  if (category_ids !== undefined) {
    if (!Array.isArray(category_ids)) {
      return res.status(400).json({ message: "category_ids inválido" });
    }

    const found = await Category.count({ where: { id: category_ids } });

    if (found !== category_ids.length) {
      return res
        .status(400)
        .json({ message: "Categoria inexistente em category_ids" });
    }
  }

  const currentImages = await ProductImage.findAll({
    where: { product_id: product.id },
  });
  const currentOptions = await ProductOption.findAll({
    where: { product_id: product.id },
  });
  const imagesById = new Map(currentImages.map((image) => [image.id, image]));
  const optionsById = new Map(
    currentOptions.map((option) => [option.id, option]),
  );

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      return res.status(400).json({ message: "images inválido" });
    }

    for (const image of images) {
      if (!image) {
        return res.status(400).json({ message: "images contém item inválido" });
      }

      if (image.id === undefined) {
        if (!EXTENSIONS[image.type] || typeof image.content !== "string") {
          return res
            .status(400)
            .json({ message: "images contém item inválido" });
        }
      } else {
        if (!imagesById.has(image.id)) {
          return res
            .status(400)
            .json({ message: `Imagem ${image.id} não pertence ao produto` });
        }
        if (!image.deleted) {
          if (image.type !== undefined && !EXTENSIONS[image.type]) {
            return res
              .status(400)
              .json({ message: "images contém type inválido" });
          }
          if (
            image.content !== undefined &&
            typeof image.content !== "string"
          ) {
            return res
              .status(400)
              .json({ message: "images contém content inválido" });
          }
        }
      }
    }
  }

  if (options !== undefined) {
    if (!Array.isArray(options)) {
      return res.status(400).json({ message: "options inválido" });
    }
    for (const option of options) {
      if (!option) {
        return res
          .status(400)
          .json({ message: "options contém item inválido" });
      }
      const values = option.values ?? option.value;

      if (option.id === undefined) {
        if (!option.title || !Array.isArray(values) || values.length === 0) {
          return res
            .status(400)
            .json({ message: "option nova precisa de title e values" });
        }
      } else {
        if (!optionsById.has(option.id)) {
          return res
            .status(400)
            .json({ message: `Opção ${option.id} não pertence ao produto` });
        }
        if (option.deleted) continue;
        if (
          values !== undefined &&
          (!Array.isArray(values) || values.length === 0)
        ) {
          return res
            .status(400)
            .json({ message: "option com values inválido" });
        }
      }

      if (option.shape !== undefined && !SHAPES.includes(option.shape)) {
        return res.status(400).json({ message: "option com shape inválido" });
      }
      if (option.type !== undefined && !TYPES.includes(option.type)) {
        return res.status(400).json({ message: "option com type inválido" });
      }
      if (option.radius !== undefined) {
        const radius = parseInt(option.radius);
        if (Number.isNaN(radius) || radius < 0) {
          return res
            .status(400)
            .json({ message: "option com radius inválido" });
        }
      }
    }
  }

  const removedPaths = [];

  await sequelize.transaction(async (t) => {
    await product.update(
      pickDefined({
        enabled,
        name,
        slug,
        stock,
        description,
        price,
        price_with_discount,
      }),
      { transaction: t },
    );

    if (category_ids !== undefined) {
      await product.setCategories(category_ids, { transaction: t });
    }

    if (images !== undefined) {
      for (const [index, image] of images.entries()) {
        if (image.id === undefined) {
          // CRIAR
          const imagePath = await saveImage(product.id, image, index);
          await ProductImage.create(
            { product_id: product.id, path: imagePath },
            { transaction: t },
          );
        } else if (image.deleted) {
          const existing = imagesById.get(image.id);
          await existing.destroy({ transaction: t });
          removedPaths.push(existing.path);
        } else if (image.content && !image.content.startsWith("http")) {
          const existing = imagesById.get(image.id);
          const type =
            image.type ?? `image/${path.extname(existing.path).slice(1)}`;
          const newPath = await saveImage(
            product.id,
            { ...image, type },
            index,
          );
          removedPaths.push(existing.path);
          await existing.update({ path: newPath }, { transaction: t });
        }
      }
    }

    if (options !== undefined) {
      for (const option of options) {
        const values = option.values ?? option.value;

        if (option.id === undefined) {
          await ProductOption.create(
            pickDefined({
              product_id: product.id,
              title: option.title,
              shape: option.shape,
              radius:
                option.radius !== undefined
                  ? parseInt(option.radius)
                  : undefined,
              type: option.type,
              values: values.join(","),
            }),
            { transaction: t },
          );
        } else if (option.deleted) {
          await optionsById.get(option.id).destroy({ transaction: t });
        } else {
          await optionsById.get(option.id).update(
            pickDefined({
              title: option.title,
              shape: option.shape,
              radius:
                option.radius !== undefined
                  ? parseInt(option.radius)
                  : undefined,
              type: option.type,
              values: values ? values.join(",") : undefined,
            }),
            { transaction: t },
          );
        }
      }
    }
  });

  for (const removed of removedPaths) {
    await fs.rm(path.join("public", removed), { force: true });
  }

  return res.status(204).send();
}

export async function deleteProduct(req, res) {
  const { id } = req.params;

  const product = await Product.findByPk(id);

  if (!product) {
    return res.status(404).json({ message: "Produto não encontrado" });
  }

  await product.destroy();

  return res.status(204).send();
}
