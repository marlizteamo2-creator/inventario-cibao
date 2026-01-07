ALTER TABLE pedidos_suplidores
  ADD COLUMN nombre_producto VARCHAR(200),
  ADD COLUMN id_tipo_producto UUID REFERENCES tipos_producto(id_tipo),
  ADD COLUMN id_marca UUID REFERENCES marcas(id_marca),
  ADD COLUMN id_modelo UUID REFERENCES modelos(id_modelo);

ALTER TABLE pedidos_suplidores
  ALTER COLUMN id_producto DROP NOT NULL;

UPDATE pedidos_suplidores p
SET nombre_producto = prod.nombre,
    id_tipo_producto = prod.id_tipo_producto,
    id_marca = prod.id_marca,
    id_modelo = prod.id_modelo
FROM productos prod
WHERE p.id_producto = prod.id_producto;

ALTER TABLE pedidos_suplidores
  ALTER COLUMN id_tipo_producto SET NOT NULL;
