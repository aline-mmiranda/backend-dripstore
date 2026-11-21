import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const router = Router();

router.route("/product/search").get(searchProducts);

router.route("/product").post(authMiddleware, createProduct);

router
  .route("/product/:id")
  .get(getProductById)
  .put(authMiddleware, updateProduct)
  .delete(authMiddleware, deleteProduct);

export default router;
