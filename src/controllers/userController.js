import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/relations.js";

export async function getUserById(req, res) {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    attributes: ["id", "firstname", "surname", "email"],
  });

  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }

  return res.status(200).json(user);
}

export async function createUser(req, res) {
  const { firstname, surname, email, password, confirmPassword } = req.body;

  if (!firstname || !surname || !email || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "As senhas não conferem" });
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: "Email já cadastrado" });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ firstname, surname, email, password: hash });

  return res.status(201).json({
    id: user.id,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
  });
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const { firstname, surname, email } = req.body;

  if (!firstname || !surname || !email) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios" });
  }

  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }

  const emailOwner = await User.findOne({ where: { email } });

  if (emailOwner && emailOwner.id !== user.id) {
    return res
      .status(400)
      .json({ message: "Email cadastrado por outro usuário" });
  }

  await user.update({ firstname, surname, email });

  return res.status(204).send();
}

export async function deleteUser(req, res) {
  const { id } = req.params;

  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }

  await user.destroy();

  return res.status(204).send();
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "email e password são obrigatórios" });
  }

  const user = await User.findOne({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.password));

  if (!valid) {
    return res.status(400).json({ message: "Email ou senha inválidos" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  return res.status(200).json({ token });
}
