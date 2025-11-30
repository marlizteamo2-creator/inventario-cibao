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
    servers: [{ url: "http://localhost:4000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            nombre: { type: "string" },
            apellido: { type: "string" },
            email: { type: "string", format: "email" },
            rol: { type: "string" },
            activo: { type: "boolean" },
            fechaCreacion: { type: "string", format: "date-time" }
          }
        },
        UserCreateInput: {
          type: "object",
          required: ["nombre", "apellido", "email", "password", "roleName"],
          properties: {
            nombre: { type: "string" },
            apellido: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
            roleName: { type: "string" }
          }
        },
        UserUpdateInput: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            apellido: { type: "string" },
            password: { type: "string", format: "password" },
            roleName: { type: "string" },
            activo: { type: "boolean" }
          }
        }
      }
    }
  },
  apis: [routesTsPath, routesJsPath]
};

export const swaggerSpec = swaggerJsdoc(options);
