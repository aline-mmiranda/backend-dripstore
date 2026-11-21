import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import Product from "./productModel.js";
import Category from "./categoryModel.js";

class ProductCategory extends Model {}

ProductCategory.init(
  {
    product_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Product,
        key: "id",
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Category,
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "ProductCategory",
    tableName: "product_categories",
    timestamps: false,
  },
);

export default ProductCategory;
