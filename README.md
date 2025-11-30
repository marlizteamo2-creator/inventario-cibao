# Inventario Cibao

## Estructura inicial

El repositorio está dividido en dos carpetas: `web/` (frontend Next.js + Tailwind) y `server/` (backend Node.js con Express, PostgreSQL y JWT).

### Stack objetivo

- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js + Express
- Base de datos: PostgreSQL (cliente `pg`)
- Autenticación: JWT (con bcrypt para los hash)

```
inventario-cibao/
├── Documento_Proyecto_Inventario_Cibao.docx
├── README.md
├── web/
│   ├── package.json                # scripts de Next.js
│   ├── src/app/{layout,page,globals.css}
│   └── .env.example                # NEXT_PUBLIC_API_BASE_URL
└── server/
    ├── package.json                # scripts dev/build/start para Express
    ├── src/config/env.ts           # lectura de variables de entorno
    ├── src/db/pool.ts              # conexión Pool a PostgreSQL
    ├── src/routes/auth.ts          # endpoint POST /auth/login
    ├── src/docs/swagger.ts         # configuración OpenAPI
    ├── src/index.ts                # servidor Express + /health
    ├── db_schema.sql               # script SQL para crear tablas base
    └── create_database.sql         # script opcional para crear usuario/base inv_cibao
```

## Backend (`server/`)

1. `cd server`
2. `npm install`
3. Copia `.env.example` a `.env` y edita:
   - `PORT` (por defecto 4000)
   - `DATABASE_URL` apuntando a tu instancia PostgreSQL
   - `JWT_SECRET` con una clave segura
4. Levanta el backend: `npm run dev`
5. Verifica [http://localhost:4000/health](http://localhost:4000/health) y la documentación [http://localhost:4000/docs](http://localhost:4000/docs)
6. Para producción: `npm run build` y `npm start`

### Crear la base de datos

1. Si aún no tienes base ni usuario, ejecuta (como superusuario `postgres`):  
   ```bash
   psql -f server/create_database.sql
   ```  
   Esto crea el usuario `inventario_user` (clave `inventario_password`) y la base `inv_cibao`.
2. Ejecuta el script provisto con ese usuario:  
   ```bash
   psql \"postgresql://inventario_user:inventario_password@localhost:5432/inv_cibao\" -f server/db_schema.sql
   ```  
   Esto crea tablas, índices y roles iniciales.
3. Inserta usuarios con contraseñas encriptadas (puedes usar `bcryptjs` desde Node o herramientas externas) para probar `/auth/login`.

> Para crear las tablas y roles iniciales ejecuta `psql < server/db_schema.sql` (o el comando equivalente en tu cliente PostgreSQL) apuntando a la base definida en `DATABASE_URL`.

## Frontend (`web/`)

1. `cd web`
2. `npm install`
3. Copia `.env.example` a `.env.local` y ajusta `NEXT_PUBLIC_API_BASE_URL` al dominio del backend (ej. `http://localhost:4000`)
4. Ejecuta `npm run dev`
5. Abre [http://localhost:3000](http://localhost:3000)

> Desde el frontend consumirás el backend usando la URL definida en `NEXT_PUBLIC_API_BASE_URL`.
