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
    └── src/index.ts                # servidor Express + /health
```

## Backend (`server/`)

1. `cd server`
2. `npm install`
3. Copia `.env.example` a `.env` y edita:
   - `PORT` (por defecto 4000)
   - `DATABASE_URL` apuntando a tu instancia PostgreSQL
   - `JWT_SECRET` con una clave segura
4. Levanta el backend: `npm run dev`
5. Verifica [http://localhost:4000/health](http://localhost:4000/health)
6. Para producción: `npm run build` y `npm start`

> Asegúrate de crear las tablas y datos iniciales (roles/usuarios) en PostgreSQL para que `/auth/login` funcione.

## Frontend (`web/`)

1. `cd web`
2. `npm install`
3. Copia `.env.example` a `.env.local` y ajusta `NEXT_PUBLIC_API_BASE_URL` al dominio del backend (ej. `http://localhost:4000`)
4. Ejecuta `npm run dev`
5. Abre [http://localhost:3000](http://localhost:3000)

> Desde el frontend consumirás el backend usando la URL definida en `NEXT_PUBLIC_API_BASE_URL`.
