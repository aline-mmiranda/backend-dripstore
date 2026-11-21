require("dotenv").config();
process.env.DB_NAME = process.env.DB_NAME_TEST || "drippstore_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "segredo-de-teste";
