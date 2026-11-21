import sequelize from "../config/database.js";
import User from "./userModel.js";
import Product from "./productModel.js";
import Category from "./categoryModel.js";
import ProductImage from "./productImageModel.js";
import ProductOption from "./productOptionModel.js";
import ProductCategory from "./productCategoryModel.js";

Product.hasMany(ProductImage, { foreignKey: "product_id", as: "images" });
ProductImage.belongsTo(Product, { foreignKey: "product_id" });

Product.hasMany(ProductOption, { foreignKey: "product_id", as: "options" });
ProductOption.belongsTo(Product, { foreignKey: "product_id" });

Product.belongsToMany(Category, {
  through: ProductCategory,
  foreignKey: "product_id",
  otherKey: "category_id",
  as: "categories",
});

Category.belongsToMany(Product, {
  through: ProductCategory,
  foreignKey: "category_id",
  otherKey: "product_id",
});

export {
  sequelize,
  User,
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
};
