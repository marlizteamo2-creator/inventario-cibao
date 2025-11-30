export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Inventario Cibao
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Sistema de Inventario Web</h1>
        <p className="text-lg text-slate-600">
          Base inicial lista para integrar autenticación, gestión de productos y reportes según la
          especificación del proyecto.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Siguientes pasos sugeridos</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
            <li>Configurar variables de entorno y conexión a PostgreSQL.</li>
            <li>Agregar Prisma y los modelos de base de datos.</li>
            <li>Crear rutas API para autenticación y CRUDs.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
