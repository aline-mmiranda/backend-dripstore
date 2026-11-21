import { Category } from "../models/relations.js";

export async function searchCategories(req, res) {
  const { fields, use_in_menu } = req.query;

  const limit = req.query.limit === undefined ? 12 : Number(req.query.limit);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);

  if (!Number.isInteger(limit) || (limit !== -1 && limit < 1)) {
    return res.status(400).json({ message: "limit inválido" });
  }

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({ message: "page inválido" });
  }

  const options = { where: {}, order: [["id", "ASC"]] };

  if (fields) {
    const allowed = ["id", "name", "slug", "use_in_menu"];
    const list = fields.split(",");
    if (list.some((f) => !allowed.includes(f))) {
      return res.status(400).json({ message: "fields inválido" });
    }
    options.attributes = list;
  }

  if (use_in_menu !== undefined) {
    if (use_in_menu !== "true" && use_in_menu !== "false") {
      return res.status(400).json({ message: "use_in_menu inválido" });
    }
    options.where.use_in_menu = use_in_menu === "true";
  }

  if (limit !== -1) {
    options.limit = limit;
    options.offset = (page - 1) * limit;
  }

  const { count, rows } = await Category.findAndCountAll(options);

  return res.status(200).json({ data: rows, total: count, limit, page });
}

export async function getCategoryById(req, res) {
  const { id } = req.params;

  const category = await Category.findByPk(id);

  if (!category) {
    return res.status(404).json({ message: "Categoria não encontrada" });
  }

  return res.status(200).json(category);
}

export async function createCategory(req, res) {
  const { name, slug, use_in_menu } = req.body;

  if (!name || !slug) {
    return res
      .status(400)
      .json({ message: "name e slug são obrigatórios" });
  }

  if (use_in_menu !== undefined && typeof use_in_menu !== "boolean") {
    return res.status(400).json({ message: "use_in_menu inválido" });
  }

  const category = await Category.create({ name, slug, use_in_menu });

  return res.status(201).json({
    id: category.id,
    name: category.name,
    slug: category.slug,
    use_in_menu: category.use_in_menu,
  });
}

export async function updateCategory(req, res) {
  const { id } = req.params;
  const { name, slug, use_in_menu } = req.body;

  if (!name || !slug) {
    return res
      .status(400)
      .json({ message: "name e slug são obrigatórios" });
  }

  if (use_in_menu !== undefined && typeof use_in_menu !== "boolean") {
    return res.status(400).json({ message: "use_in_menu inválido" });
  }

  const category = await Category.findByPk(id);

  if (!category) {
    return res.status(404).json({ message: "Categoria não encontrada" });
  }

  await category.update({ name, slug, use_in_menu });

  return res.status(204).send();
}

export async function deleteCategory(req, res) {
  const { id } = req.params;

  const category = await Category.findByPk(id);

  if (!category) {
    return res.status(404).json({ message: "Categoria não encontrada" });
  }

  await category.destroy();

  return res.status(204).send();
}
