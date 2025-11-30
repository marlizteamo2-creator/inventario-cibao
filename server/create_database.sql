-- Script para crear la base de datos y usuario del proyecto Inventario Cibao
-- Ejecutar conectado como superusuario (por ejemplo postgres)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inventario_user') THEN
    CREATE ROLE inventario_user WITH LOGIN PASSWORD 'inventario_password';
  END IF;
END $$;

SELECT 'CREATE DATABASE inv_cibao OWNER inventario_user'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'inv_cibao')
\gexec
