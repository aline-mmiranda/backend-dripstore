import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  login,
} from "../controllers/userController.js";

const router = Router();

router.route("/user/token").post(login);

router.route("/user").post(createUser);

router
  .route("/user/:id")
  .get(getUserById)
  .put(authMiddleware, updateUser)
  .delete(authMiddleware, deleteUser);

export default router;
