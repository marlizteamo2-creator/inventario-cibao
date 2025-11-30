import swaggerJsdoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";
import path from "path";

const routesTsPath = path.resolve(__dirname, "../routes/*.ts");
const routesJsPath = path.resolve(__dirname, "../routes/*.js");

const options: Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Inventario Cibao API",
      version: "0.1.0",
      description: "Documentación inicial del backend (autenticación, inventario, reportes)."
    },
    servers: [{ url: "http://localhost:4000" }]
  },
  apis: [routesTsPath, routesJsPath]
};

export const swaggerSpec = swaggerJsdoc(options);
