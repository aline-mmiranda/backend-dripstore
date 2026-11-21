# DRIP Store — API Back-end

API REST do projeto **DRIP Store** (Digital College / Geração Tech 4.0): cadastro de usuários, categorias e produtos (com imagens, opções e categorias), com autenticação via **JWT** e testes automatizados.

## Sumário

- [Tecnologias](#tecnologias)
- [Funcionalidades](#funcionalidades)
- [Guia de setup](#guia-de-setup)
- [Scripts](#scripts)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Modelo de dados](#modelo-de-dados)
- [Autenticação](#autenticação)
- [Documentação da API](#documentação-da-api)
- [Testes](#testes)
- [Decisões de implementação](#decisões-de-implementação)
- [Solução de problemas](#solução-de-problemas)
- [Autora](#autora)

## Tecnologias

| Tecnologia           | Uso                                                                     |
| -------------------- | -------------------------------------------                             |
| Node.js              | Executa JavaScript no servidor (módulos ES)                             |
| Express 5            | Rotas da API                                                            |
| MySQL                | Banco de dados relacional                                               |
| Sequelize            | ORM: models, relacionamentos, transações e migrations (sequelize-cli)   |
| JWT (`jsonwebtoken`) | Autenticação nas rotas protegidas                                       |
| bcrypt               | Hash das senhas                                                         |
| dotenv               | Variáveis de ambiente                                                   |
| Nodemon              | Reinício automático em desenvolvimento                                  |
| Jest + Supertest     | Testes automatizados                                                    |
| Swagger UI           | Documentação interativa da API                                          |

## Funcionalidades

- **Usuários:** cadastro, consulta, atualização e exclusão. Senhas guardadas como hash.
- **Autenticação:** geração de token JWT e validação nos métodos `POST`, `PUT` e `DELETE`.
- **Categorias:** CRUD completo e busca com paginação, filtro e escolha de campos.
- **Produtos:** CRUD completo com categorias, imagens (enviadas em base64) e opções; busca com paginação, texto, categoria, faixa de preço e opções.

## Guia de setup

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [MySQL](https://dev.mysql.com/downloads/) 8 ou superior, em execução
- Git

### 1. Clonar e instalar

```bash
git clone https://github.com/aline-mmiranda/backend-dripstore.git
cd backend-dripstore
npm install
```

### 2. Criar os bancos de dados

O Sequelize cria as tabelas, mas **não** cria o banco. No MySQL (Workbench ou terminal):

```sql
CREATE DATABASE drippstore;
CREATE DATABASE drippstore_test;
```

O segundo banco é usado apenas pelos testes, que **apagam e recriam as tabelas** dele. Nunca aponte os testes para o banco real.

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```
PORT=3000

DB_NAME=drippstore
DB_NAME_TEST=drippstore_test
DB_USER=root
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=3306

JWT_SECRET=troque-por-um-texto-longo-e-aleatorio
```

| Variável                  | Descrição                                            |
| ------------------------- | ---------------------------------------------------- |
| `PORT`                    | Porta da API (padrão `3000`)                         |
| `DB_NAME`                 | Banco usado pela aplicação                           |
| `DB_NAME_TEST`            | Banco usado pelos testes (deve terminar com `_test`) |
| `DB_USER` / `DB_PASSWORD` | Credenciais do MySQL                                 |
| `DB_HOST` / `DB_PORT`     | Endereço do MySQL                                    |
| `JWT_SECRET`              | Segredo usado para assinar e validar os tokens       |

> O arquivo `.env` contém segredos e **não deve ser commitado**. Confira se ele está no `.gitignore`.

### 4. Criar as tabelas (migrations)

```bash
npm run migrate
```

As tabelas são criadas pelas migrations em `src/migrations/`. Para desfazer todas: `npm run migrate:undo`.

### 5. Subir a API

```bash
npm run dev
```

A API fica disponível em `http://localhost:3000/v1`.

### 6. Verificar

- Documentação interativa: `http://localhost:3000/api-docs`
- Teste rápido (deve retornar `200` com uma lista):

```bash
curl "http://localhost:3000/v1/category/search"
```

## Scripts

| Comando                | O que faz                                     |
| ---------------------- | --------------------------------------------- |
| `npm start`            | Inicia a API com Node                         |
| `npm run dev`          | Inicia a API com Nodemon (reinicia ao salvar) |
| `npm test`             | Executa todos os testes automatizados         |
| `npm run migrate`      | Executa as migrations (cria as tabelas)       | 
| `npm run migrate:undo` | Desfaz todas as migrations                    |

## Estrutura de pastas

```
project-root/
├── src/
│   ├── config/          # conexão com o banco
│   ├── controllers/     # lógica de cada endpoint
│   ├── middlewares/     # autenticação JWT
│   ├── migrations/      
│   ├── models/          # models do Sequelize e relacionamentos (relations.js)
│   ├── routes/          # definição das rotas
│   ├── app.js           # configuração do Express (sem listen)
│   └── server.js        # conexão com o banco e início do servidor
├── tests/               # testes automatizados (Jest + Supertest)
├── docs/
│   └── openapi.yaml     # especificação OpenAPI usada pelo Swagger UI
├── public/
│   └── media/           # imagens de produtos enviadas pela API
├── .env
├── .gitignore
└── package.json
```

`app.js` e `server.js` são separados para que os testes importem o app sem abrir uma porta.

## Modelo de dados

| Tabela               | Colunas principais                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`              | `id`, `firstname`, `surname`, `email`, `password` (hash bcrypt), `created_at`, `updated_at`                                                                                                   |
| `categories`         | `id`, `name`, `slug`, `use_in_menu` (padrão `false`), `created_at`, `updated_at`                                                                                                              |
| `products`           | `id`, `enabled` (padrão `false`), `name`, `slug`, `use_in_menu`, `stock` (padrão `0`), `description`, `price`, `price_with_discount`, `created_at`, `updated_at`                              |
| `product_images`     | `id`, `product_id` (FK), `enabled`, `path` (caminho relativo da imagem)                                                                                                                       |
| `product_options`    | `id`, `product_id` (FK), `title`, `shape` (`square` \| `circle`, padrão `square`), `radius` (padrão `0`), `type` (`text` \| `color`, padrão `text`), `values` (valores separados por vírgula) |
| `product_categories` | `product_id` (FK), `category_id` (FK) — chave primária composta                                                                                                                               |

Relacionamentos: um produto tem **N imagens** e **N opções**; produtos e categorias se relacionam em **N:N** pela tabela `product_categories`. As chaves estrangeiras usam `ON DELETE CASCADE`: ao excluir um produto, suas imagens, opções e vínculos com categorias são removidos.

## Autenticação

1. Cadastre um usuário em `POST /v1/user`.
2. Gere um token em `POST /v1/user/token` com email e senha.
3. Envie o token nas rotas protegidas:

```
Authorization: Bearer <jwt>
```

O token expira em **1 hora**.

| Situação                                                           | Resposta           |
| ------------------------------------------------------------------ | ------------------ |
| Cabeçalho `Authorization: Bearer <jwt>` ausente ou fora do formato | `400 Bad Request`  |
| Token inválido ou expirado                                         | `401 Unauthorized` |

**Rotas públicas:** todos os `GET`, o cadastro de usuário (`POST /v1/user`) e a geração do token (`POST /v1/user/token`).
**Rotas protegidas:** `POST`, `PUT` e `DELETE` de categorias e produtos, e `PUT` e `DELETE` de usuários.

## Documentação da API

- **Swagger UI (interativo):** `http://localhost:3000/api-docs`
- **Especificação OpenAPI:** [`docs/openapi.yaml`](docs/openapi.yaml)
  URL base: `http://localhost:3000/v1`

Todas as requisições com corpo usam `Content-Type: application/json`.

### Resumo dos endpoints

| Método   | Rota               | Autenticação | Descrição                             |
| -------- | ------------------ | ------------ | ------------------------------------- |
| `POST`   | `/user/token`      | —            | Gera o token JWT                      |
| `POST`   | `/user`            | —            | Cadastra usuário                      |
| `GET`    | `/user/:id`        | —            | Consulta usuário                      |
| `PUT`    | `/user/:id`        | Bearer       | Atualiza usuário                      |
| `DELETE` | `/user/:id`        | Bearer       | Exclui usuário                        |
| `GET`    | `/category/search` | —            | Lista categorias (paginação, filtros) |
| `GET`    | `/category/:id`    | —            | Consulta categoria                    |
| `POST`   | `/category`        | Bearer       | Cria categoria                        |
| `PUT`    | `/category/:id`    | Bearer       | Atualiza categoria                    |
| `DELETE` | `/category/:id`    | Bearer       | Exclui categoria                      |
| `GET`    | `/product/search`  | —            | Lista produtos (paginação, filtros)   |
| `GET`    | `/product/:id`     | —            | Consulta produto                      |
| `POST`   | `/product`         | Bearer       | Cria produto                          |
| `PUT`    | `/product/:id`     | Bearer       | Atualiza produto                      |
| `DELETE` | `/product/:id`     | Bearer       | Exclui produto                        |

---

### Autenticação

#### `POST /user/token`

Corpo:

```json
{
  "email": "user@mail.com",
  "password": "123@123"
}
```

Resposta `200`:

```json
{
  "token": "<JWT>"
}
```

| Status | Quando                                |
| ------ | ------------------------------------- |
| `200`  | Credenciais corretas                  |
| `400`  | Email ou senha ausentes ou incorretos |

---

### Usuários

#### `POST /user`

Corpo:

```json
{
  "firstname": "Maria",
  "surname": "Silva",
  "email": "maria@mail.com",
  "password": "123@123",
  "confirmPassword": "123@123"
}
```

| Status | Quando                                                      |
| ------ | ----------------------------------------------------------- |
| `201`  | Cadastro realizado (o corpo da resposta não inclui a senha) |
| `400`  | Campo ausente, senhas diferentes ou email já cadastrado     |

#### `GET /user/:id`

Resposta `200`:

```json
{
  "id": 1,
  "firstname": "Maria",
  "surname": "Silva",
  "email": "maria@mail.com"
}
```

| Status | Quando             |
| ------ | ------------------ |
| `200`  | Usuário encontrado |
| `404`  | Usuário não existe |

#### `PUT /user/:id` 🔒

Corpo:

```json
{
  "firstname": "Maria",
  "surname": "Souza",
  "email": "maria@mail.com"
}
```

| Status | Quando                                                                   |
| ------ | ------------------------------------------------------------------------ |
| `204`  | Atualizado (sem corpo)                                                   |
| `400`  | Campo ausente, email de outro usuário ou sem o cabeçalho `Authorization` |
| `401`  | Token inválido ou expirado                                               |
| `404`  | Usuário não existe                                                       |

#### `DELETE /user/:id` 🔒

| Status | Quando                          |
| ------ | ------------------------------- |
| `204`  | Excluído (sem corpo)            |
| `400`  | Sem o cabeçalho `Authorization` |
| `401`  | Token inválido ou expirado      |
| `404`  | Usuário não existe              |

---

### Categorias

#### `GET /category/search`

| Parâmetro     | Descrição                                                                      | Padrão     |
| ------------- | ------------------------------------------------------------------------------ | ---------- |
| `limit`       | Itens por página. `-1` retorna todos                                           | `12`       |
| `page`        | Página (sem efeito quando `limit=-1`)                                          | `1`        |
| `fields`      | Campos retornados, separados por vírgula (`id`, `name`, `slug`, `use_in_menu`) | todos      |
| `use_in_menu` | `true` ou `false`: filtra pelas categorias do menu                             | sem filtro |

Exemplo: `GET /category/search?limit=2&page=1&fields=name,slug&use_in_menu=true`

Resposta `200`:

```json
{
  "data": [
    { "id": 1, "name": "Shoes", "slug": "shoes", "use_in_menu": true },
    { "id": 2, "name": "Offers", "slug": "offers", "use_in_menu": true }
  ],
  "total": 10,
  "limit": 2,
  "page": 1
}
```

`total` é o número de itens que atendem ao filtro, independentemente da paginação.

| Status | Quando                                               |
| ------ | ---------------------------------------------------- |
| `200`  | Sucesso                                              |
| `400`  | `limit`, `page`, `fields` ou `use_in_menu` inválidos |

#### `GET /category/:id`

Resposta `200`:

```json
{ "id": 1, "name": "Shoes", "slug": "shoes", "use_in_menu": true }
```

| Status | Quando               |
| ------ | -------------------- |
| `200`  | Categoria encontrada |
| `404`  | Categoria não existe |

#### `POST /category` 🔒

Corpo (`use_in_menu` é opcional e, se enviado, deve ser booleano):

```json
{ "name": "Shoes", "slug": "shoes", "use_in_menu": true }
```

| Status | Quando                                                                                |
| ------ | ------------------------------------------------------------------------------------- |
| `201`  | Criada (retorna a categoria)                                                          |
| `400`  | `name` ou `slug` ausentes, `use_in_menu` inválido, ou sem o cabeçalho `Authorization` |
| `401`  | Token inválido ou expirado                                                            |

#### `PUT /category/:id` 🔒

Mesmo corpo do `POST`.

| Status | Quando                                             |
| ------ | -------------------------------------------------- |
| `204`  | Atualizada (sem corpo)                             |
| `400`  | Dados inválidos ou sem o cabeçalho `Authorization` |
| `401`  | Token inválido ou expirado                         |
| `404`  | Categoria não existe                               |

#### `DELETE /category/:id` 🔒

| Status | Quando                                                                               |
| ------ | ------------------------------------------------------------------------------------ |
| `204`  | Excluída (sem corpo). Os vínculos com produtos são removidos; os produtos permanecem |
| `400`  | Sem o cabeçalho `Authorization`                                                      |
| `401`  | Token inválido ou expirado                                                           |
| `404`  | Categoria não existe                                                                 |

---

### Produtos

#### `GET /product/search`

| Parâmetro      | Descrição                                                                                                                                                               | Padrão     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `limit`        | Itens por página. `-1` retorna todos                                                                                                                                    | `12`       |
| `page`         | Página (sem efeito quando `limit=-1`)                                                                                                                                   | `1`        |
| `fields`       | Campos retornados, separados por vírgula (`id`, `enabled`, `name`, `slug`, `stock`, `description`, `price`, `price_with_discount`, `category_ids`, `images`, `options`) | todos      |
| `match`        | Termo que deve aparecer no nome **ou** na descrição                                                                                                                     | sem filtro |
| `category_ids` | IDs de categorias separados por vírgula (`15,24`): produtos com ao menos uma delas                                                                                      | sem filtro |
| `price-range`  | Faixa de preço `min-max` (`100-200`)                                                                                                                                    | sem filtro |
| `option[ID]`   | Valores de uma opção (`option[45]=GG,PP`): produtos cuja opção de id `45` tenha ao menos um dos valores                                                                 | sem filtro |

Filtros diferentes se combinam com **E**; dentro de um mesmo filtro (`category_ids`, `option[ID]`), vale **OU**.

Exemplo: `GET /product/search?limit=12&page=1&match=Camiseta&price-range=50-150&fields=name,price`

Resposta `200`:

```json
{
  "data": [
    {
      "id": 1,
      "enabled": true,
      "name": "Camiseta",
      "slug": "camiseta",
      "stock": 10,
      "description": "Camiseta de algodão",
      "price": 119.9,
      "price_with_discount": 99.9,
      "category_ids": [1, 15],
      "images": [
        {
          "id": 1,
          "content": "http://localhost:3000/media/product-1/imagem.png"
        }
      ],
      "options": [
        {
          "id": 1,
          "title": "Tamanho",
          "shape": "square",
          "radius": 4,
          "type": "text",
          "values": ["PP", "M", "GG"]
        }
      ]
    }
  ],
  "total": 120,
  "limit": 12,
  "page": 1
}
```

| Status | Quando                                                                        |
| ------ | ----------------------------------------------------------------------------- |
| `200`  | Sucesso                                                                       |
| `400`  | Parâmetro inválido (`limit`, `page`, `fields`, `price-range`, `category_ids`) |

#### `GET /product/:id`

Resposta `200`: o mesmo objeto de produto mostrado acima.

| Status | Quando             |
| ------ | ------------------ |
| `200`  | Produto encontrado |
| `404`  | Produto não existe |

#### `POST /product` 🔒

Corpo:

```json
{
  "enabled": true,
  "name": "Camiseta",
  "slug": "camiseta",
  "stock": 10,
  "description": "Camiseta de algodão",
  "price": 119.9,
  "price_with_discount": 99.9,
  "category_ids": [1, 15],
  "images": [{ "type": "image/png", "content": "<imagem em base64>" }],
  "options": [
    {
      "title": "Tamanho",
      "shape": "square",
      "radius": "4px",
      "type": "text",
      "values": ["PP", "M", "GG"]
    }
  ]
}
```

| Campo                          | Regra                                                |
| ------------------------------ | ---------------------------------------------------- |
| `name`, `slug`                 | Obrigatórios                                         |
| `price`, `price_with_discount` | Obrigatórios, numéricos (`0` é aceito)               |
| `enabled`                      | Opcional, booleano (padrão `false`)                  |
| `stock`                        | Opcional, inteiro maior ou igual a `0`               |
| `category_ids`                 | Opcional, array de ids de categorias existentes      |
| `images[].type`                | `image/png`, `image/jpg` ou `image/jpeg`             |
| `images[].content`             | Imagem em base64                                     |
| `options[].title`              | Obrigatório                                          |
| `options[].values`             | Array não vazio                                      |
| `options[].shape`              | `square` ou `circle` (padrão `square`)               |
| `options[].type`               | `text` ou `color` (padrão `text`)                    |
| `options[].radius`             | Número ou texto como `"4px"` (guardado como inteiro) |

A criação é feita em uma **transação**: se qualquer etapa falhar, nada é gravado.

| Status | Quando                                             |
| ------ | -------------------------------------------------- |
| `201`  | Criado (retorna o produto completo)                |
| `400`  | Dados inválidos ou sem o cabeçalho `Authorization` |
| `401`  | Token inválido ou expirado                         |

#### `PUT /product/:id` 🔒

Os campos simples (`name`, `slug`, `price`, `price_with_discount` obrigatórios; os demais opcionais) funcionam como no `POST`. Os campos `category_ids`, `images` e `options` só são alterados **se forem enviados**.

- `category_ids` **substitui** o conjunto de categorias do produto.
- Em `images` e `options`, cada item é interpretado pelos campos que tem:
  | O item tem | Ação |
  |---|---|
  | sem `id` | Cria um novo |
  | `id` + `deleted: true` | Exclui |
  | `id` + outros campos | Atualiza apenas os campos enviados |

Para imagens com `id`: `content` em base64 troca o arquivo; `content` em URL (`http...`) é ignorado, pois a imagem já está salva. Os `id` enviados precisam pertencer ao produto, senão a resposta é `400`.

Exemplo:

```json
{
  "name": "Camiseta atualizada",
  "slug": "camiseta-atualizada",
  "stock": 20,
  "price": 49.9,
  "price_with_discount": 0,
  "category_ids": [1, 15],
  "images": [
    { "type": "image/png", "content": "<base64>" },
    { "id": 2, "deleted": true }
  ],
  "options": [
    { "id": 1, "deleted": true },
    { "id": 2, "radius": "10px", "values": ["42/43", "44/45"] },
    {
      "title": "Tipo",
      "shape": "square",
      "type": "text",
      "values": ["100% algodão"]
    }
  ]
}
```

| Status | Quando                                                                                |
| ------ | ------------------------------------------------------------------------------------- |
| `204`  | Atualizado (sem corpo)                                                                |
| `400`  | Dados inválidos, `id` que não pertence ao produto, ou sem o cabeçalho `Authorization` |
| `401`  | Token inválido ou expirado                                                            |
| `404`  | Produto não existe                                                                    |

#### `DELETE /product/:id` 🔒

| Status | Quando                                                     |
| ------ | ---------------------------------------------------------- |
| `204`  | Excluído (sem corpo), junto com imagens, opções e vínculos |
| `400`  | Sem o cabeçalho `Authorization`                            |
| `401`  | Token inválido ou expirado                                 |
| `404`  | Produto não existe                                         |

---

### Códigos de status utilizados

| Código             | Significado                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `200 OK`           | Requisição bem-sucedida, com corpo de resposta                       |
| `201 Created`      | Recurso criado                                                       |
| `204 No Content`   | Sucesso, sem corpo (`PUT` e `DELETE`)                                |
| `400 Bad Request`  | Dados da requisição incorretos, ou cabeçalho `Authorization` ausente |
| `401 Unauthorized` | Token inválido ou expirado                                           |
| `404 Not Found`    | Recurso não encontrado                                               |

## Testes

Os testes usam **Jest** e **Supertest**, executando requisições contra o app sem abrir porta. Eles rodam no banco definido em `DB_NAME_TEST` (que deve terminar com `_test`), que é apagado e recriado a cada arquivo de teste.

```bash
npm test                          # todos os testes
npm test -- tests/user.test.js    # um arquivo
npm test -- -t "price-range"      # testes cujo nome contém o texto
```

| Arquivo                  | O que cobre                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `tests/auth.test.js`     | Geração do token e validação nos métodos `POST`, `PUT` e `DELETE` |
| `tests/user.test.js`     | CRUD de usuários                                                  |
| `tests/category.test.js` | CRUD e busca de categorias                                        |
| `tests/product.test.js`  | CRUD e busca de produtos (imagens, opções, categorias, filtros)   |

## Decisões de implementação

- **Imagens:** chegam em base64, são gravadas em `public/media/product-<id>/` e servidas em `/media/...`. No banco fica apenas o caminho relativo. Ao trocar ou excluir uma imagem, o arquivo antigo é apagado do disco **depois** que a transação é confirmada.
- **Senhas:** guardadas como hash bcrypt e nunca retornadas pela API.
- **`radius`:** o enunciado usa valores como `"4px"`, mas a coluna é inteira; o número é extraído e armazenado (`4`).
- **`values` das opções:** recebidos como array e guardados como texto separado por vírgula; devolvidos como array.
- **`price-range`:** filtra pelo campo `price` (não pelo preço com desconto).
- **Token ausente × inválido:** o enunciado indica `400` para ausência do cabeçalho `Authorization: Bearer` (seção de JWT) e `401` para token incorreto (seções dos CRUDs). A API usa `400` para o primeiro caso e `401` para o segundo.
- **Express 5:** erros em funções `async` são capturados automaticamente. A query string `option[45]=GG` não é convertida em objeto; a chave chega como `"option[45]"` e é tratada por expressão regular.

## Solução de problemas

| Sintoma                                       | Causa provável                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `Unknown database 'drippstore'`               | Falta executar o `CREATE DATABASE`                                             |
| `Access denied for user`                      | `DB_USER` ou `DB_PASSWORD` incorretos no `.env`                                |
| `ERR_MODULE_NOT_FOUND`                        | Import local sem a extensão `.js` ou caminho incorreto                         |
| `413 Payload Too Large` ao enviar imagens     | O limite do `express.json` está abaixo do tamanho do base64 (a API usa `10mb`) |
| `Cannot destructure property ... of req.body` | Corpo não enviado como JSON (use `Content-Type: application/json`)             |
| Testes recusam rodar                          | `DB_NAME_TEST` ausente ou sem o sufixo `_test`                                 |

## Autora

**Aline M Miranda** — [github.com/aline-mmiranda](https://github.com/aline-mmiranda)
