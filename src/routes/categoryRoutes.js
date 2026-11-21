import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  searchCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = Router();

router.route("/category/search").get(searchCategories);

router.route("/category").post(authMiddleware, createCategory);

router
  .route("/category/:id")
  .get(getCategoryById)
  .put(authMiddleware, updateCategory)
  .delete(authMiddleware, deleteCategory);

export default router;
