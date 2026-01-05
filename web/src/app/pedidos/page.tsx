"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ClipboardCheck, Clock4, CheckCircle2, XCircle } from "lucide-react";
import { Pedido, Product, Supplier } from "@/types";
import { createPedido, fetchPedidos, fetchProducts, fetchSuppliers, updatePedido } from "@/lib/api";
import Alert from "@/components/ui/Alert";

const statusClasses: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  recibido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-rose-100 text-rose-700"
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-DO");
};

export default function PedidosPage() {
  const { hydrated } = useRequireAuth();
  const { token, role } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"info" | "success" | "error">("info");
  const [form, setForm] = useState({ productId: "", supplierId: "", cantidad: 1, fechaEsperada: "" });

  const showAlert = (text: string | null, variant: "info" | "success" | "error" = "info") => {
    setMessage(text);
    if (text) {
      setMessageVariant(variant);
    }
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pedidosData, productsData, suppliersData] = await Promise.all([
        fetchPedidos(token),
        fetchProducts(token),
        fetchSuppliers(token)
      ]);
      setPedidos(pedidosData);
      setProducts(productsData);
      setSuppliers(suppliersData);
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && token) {
      void loadData();
    }
  }, [hydrated, token, loadData]);

  const canManage = role === "Administrador";

  const stats = useMemo(() => {
    const pending = pedidos.filter((p) => p.estado === "pendiente").length;
    const received = pedidos.filter((p) => p.estado === "recibido").length;
    const canceled = pedidos.filter((p) => p.estado === "cancelado").length;
    const overdue = pedidos.filter(
      (p) => p.estado === "pendiente" && p.fechaEsperada && new Date(p.fechaEsperada) < new Date()
    ).length;

    return [
      { label: "Pendientes", value: pending.toString(), caption: "Por recibir", icon: ClipboardCheck },
      {
        label: "Recibidos",
        value: received.toString(),
        caption: "Últimos pedidos",
        icon: CheckCircle2,
        iconClassName: "bg-emerald-50 text-emerald-600"
      },
      {
        label: "Cancelados",
        value: canceled.toString(),
        caption: "Rechazados",
        icon: XCircle,
        iconClassName: "bg-rose-50 text-rose-600"
      },
      {
        label: "Pendientes vencidos",
        value: overdue.toString(),
        caption: "Fecha superada",
        icon: Clock4,
        iconClassName: "bg-amber-50 text-amber-600"
      }
    ];
  }, [pedidos]);

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.productId || !form.supplierId) {
      return showAlert("Selecciona un producto y suplidor", "error");
    }
    if (form.cantidad <= 0) {
      return showAlert("La cantidad debe ser mayor a 0", "error");
    }
    setSaving(true);
    showAlert(null);
    try {
      await createPedido(token, {
        productId: form.productId,
        supplierId: form.supplierId,
        cantidadSolicitada: form.cantidad,
        fechaEsperada: form.fechaEsperada || undefined
      });
      setForm({ productId: "", supplierId: "", cantidad: 1, fechaEsperada: "" });
      showAlert("Pedido registrado correctamente", "success");
      await loadData();
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, estado: "recibido" | "cancelado") => {
    if (!token) return;
    setUpdatingId(id);
    showAlert(null);
    try {
      await updatePedido(token, id, { estado });
      showAlert(`Pedido marcado como ${estado}`, "success");
      await loadData();
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!hydrated) {
    return null;
  }

  return (
    <AdminLayout active="Pedidos">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant} onDismiss={() => showAlert(null)}>
            {message}
          </Alert>
        </div>
      )}
      <StatsGrid stats={stats} />
      {canManage && (
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Crear pedido</h2>
          <p className="text-sm text-slate-500">Solicita reposición de inventario a tus suplidores.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <div>
              <label className="text-xs uppercase text-slate-400">Producto</label>
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                value={form.productId}
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
              >
                <option value="">Selecciona producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">Suplidor</label>
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                value={form.supplierId}
                onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))}
              >
                <option value="">Selecciona suplidor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.nombreEmpresa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">Cantidad</label>
              <Input
                type="number"
                min={1}
                value={form.cantidad}
                onChange={(e) => setForm((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">Fecha esperada</label>
              <Input
                type="date"
                value={form.fechaEsperada}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaEsperada: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleSubmit} className="mt-4" disabled={saving}>
            {saving ? "Guardando..." : "Registrar pedido"}
          </Button>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pedidos registrados</h2>
            <p className="text-sm text-slate-500">Últimos movimientos de compra realizados por el equipo.</p>
          </div>
          <Button variant="subtle" onClick={() => void loadData()} className="text-slate-600">
            Actualizar lista
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no registras pedidos a suplidores.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Suplidor</th>
                  <th className="px-4 py-2">Cantidad</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Esperado</th>
                  <th className="px-4 py-2">Recibido</th>
                  <th className="px-4 py-2">Solicitud</th>
                  <th className="px-4 py-2">Solicitado por</th>
                  {canManage && <th className="px-4 py-2 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{pedido.producto}</td>
                    <td className="px-4 py-2 text-slate-600">{pedido.suplidor}</td>
                    <td className="px-4 py-2 text-slate-600">{pedido.cantidadSolicitada}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[pedido.estado] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(pedido.fechaEsperada)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(pedido.fechaRecibido)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(pedido.fechaPedido)}</td>
                    <td className="px-4 py-2 text-slate-600">{pedido.solicitadoPor ?? "—"}</td>
                    {canManage && (
                      <td className="px-4 py-2">
                        {pedido.estado === "pendiente" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                              onClick={() => void handleUpdate(pedido.id, "recibido")}
                              disabled={updatingId === pedido.id}
                            >
                              Marcar recibido
                            </button>
                            <button
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                              onClick={() => void handleUpdate(pedido.id, "cancelado")}
                              disabled={updatingId === pedido.id}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin acciones</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
