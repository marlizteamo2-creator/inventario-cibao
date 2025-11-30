# Inventario Cibao

## Estructura inicial

El proyecto cuenta con un frontend basado en Next.js + Tailwind dentro de `web/`. La carpeta incluye configuración para TypeScript, ESLint y App Router lista para ampliar el sistema descrito en el documento del proyecto.

### Stack objetivo

- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js (API Routes/Express lo cubren)
- Base de datos: PostgreSQL (se integrará con Prisma/Drizzle)
- Autenticación: JWT (con bcrypt para los hash)

```
inventario-cibao/
├── Documento_Proyecto_Inventario_Cibao.docx
├── README.md
└── web/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── tsconfig.json
    └── src/app/{layout.tsx,page.tsx,globals.css}
```

## Cómo inicializar la aplicación

1. Ve a la carpeta del frontend: `cd web`
2. Instala las dependencias (requiere acceso a npm): `npm install`
3. Ejecuta el servidor de desarrollo: `npm run dev`
4. Abre [http://localhost:3000](http://localhost:3000) para ver la pantalla inicial.

> Una vez instaladas las dependencias puedes comenzar a añadir Prisma, rutas API y pantallas según las fases del documento.
