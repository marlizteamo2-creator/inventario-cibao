export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Inventario Cibao
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Sistema de Inventario Web</h1>
        <p className="text-lg text-slate-600">
          Base inicial lista para integrarse con el backend Express externo y construir todas las
          funciones del inventario descritas en el documento del proyecto.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Siguientes pasos sugeridos</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
            <li>Configurar el backend Express (carpeta server) y la conexión a PostgreSQL.</li>
            <li>Crear endpoints protegidos con JWT para usuarios, productos y movimientos.</li>
            <li>Consumir la API desde este frontend usando React Query u otra librería.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
