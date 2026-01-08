"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { X } from "lucide-react";
import { PedidoStatus } from "@/types";
import {
  createPedidoStatus,
  deletePedidoStatus,
  fetchPedidoStatuses,
  updatePedidoStatus,
} from "@/lib/api";

const initialForm = {
  id: null as string | null,
  nombre: "",
  descripcion: "",
  activo: true,
  posicion: "",
};

export default function PedidoStatusesPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
  const [statuses, setStatuses] = useState<PedidoStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<
    "info" | "success" | "error"
  >("info");
  const [form, setForm] = useState(initialForm);
  const [showFormModal, setShowFormModal] = useState(false);

  const showAlert = (
    text: string | null,
    variant: "info" | "success" | "error" = "info"
  ) => {
    setMessage(text);
    if (text) {
      setMessageVariant(variant);
    }
  };

  const loadStatuses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchPedidoStatuses(token);
      setStatuses(data);
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadStatuses();
    }
  }, [token, loadStatuses]);

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.nombre.trim()) {
      showAlert("Ingresa el nombre del estado", "error");
      return;
    }
    const posicionValue =
      form.posicion.toString().trim().length > 0
        ? Number(form.posicion)
        : undefined;
    if (posicionValue !== undefined && Number.isNaN(posicionValue)) {
      showAlert("La posición debe ser un número", "error");
      return;
    }
    try {
      if (form.id) {
        await updatePedidoStatus(token, form.id, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          activo: form.activo,
          posicion: posicionValue,
        });
        showAlert("Estado actualizado", "success");
      } else {
        await createPedidoStatus(token, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          activo: form.activo,
          posicion: posicionValue,
        });
        showAlert("Estado creado", "success");
      }
      setForm(initialForm);
      setShowFormModal(false);
      await loadStatuses();
    } catch (error) {
      showAlert((error as Error).message, "error");
    }
  };

  const handleEdit = (status: PedidoStatus) => {
    setForm({
      id: status.id,
      nombre: status.nombre,
      descripcion: status.descripcion ?? "",
      activo: status.activo,
      posicion: status.posicion?.toString() ?? "",
    });
    setShowFormModal(true);
  };

  const handleDelete = async (status: PedidoStatus) => {
    if (!token || !status.id) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`¿Eliminar el estado "${status.nombre}"?`)
    ) {
      return;
    }
    try {
      await deletePedidoStatus(token, status.id);
      showAlert("Estado eliminado", "success");
      if (form.id === status.id) {
        setForm(initialForm);
      }
      await loadStatuses();
    } catch (error) {
      showAlert((error as Error).message, "error");
    }
  };

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Estados de pedidos">
        <p className="text-sm text-slate-500">
          Solo los administradores pueden gestionar los estados de pedidos.
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Estados de pedidos">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant} onDismiss={() => showAlert(null)}>
            {message}
          </Alert>
        </div>
      )}
      <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Estados registrados
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Catálogo de estados de pedidos
            </h2>
          </div>
          <Button
            variant="accent"
            type="button"
            onClick={() => {
              setForm(initialForm);
              setShowFormModal(true);
            }}
          >
            Nuevo estado
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {loading && (
            <p className="text-sm text-slate-500">Cargando estados...</p>
          )}
          {!loading && !statuses.length && (
            <p className="text-sm text-slate-500">
              Aún no has registrado estados.
            </p>
          )}
          {!loading &&
            statuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {status.nombre}
                  </p>
                  <p className="text-xs text-slate-500">
                    {status.descripcion || "Sin descripción"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {status.activo ? "Activo" : "Inactivo"} · Posición:{" "}
                    {status.posicion ?? "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="subtle"
                    className="px-2 py-1 text-xs"
                    onClick={() => handleEdit(status)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="subtle"
                    className="px-2 py-1 text-xs text-rose-600"
                    onClick={() => handleDelete(status)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
      {showFormModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {form.id ? "Editar estado" : "Nuevo estado"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {form.id
                    ? "Actualizar estado de pedido"
                    : "Crear estado de pedido"}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={() => {
                  setForm(initialForm);
                  setShowFormModal(false);
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase text-slate-400">
                  Nombre
                </label>
                <Input
                  value={form.nombre}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nombre: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">
                  Descripción
                </label>
                <Input
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      descripcion: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 pt-5">
                  <input
                    id="pedido-status-active"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={form.activo}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        activo: event.target.checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="pedido-status-active"
                    className="text-sm text-slate-600"
                  >
                    Estado activo
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="subtle"
                className="border border-slate-200"
                onClick={() => {
                  setForm(initialForm);
                  setShowFormModal(false);
                }}
              >
                Cancelar
              </Button>
              <Button variant="accent" onClick={handleSubmit}>
                {form.id ? "Actualizar estado" : "Crear estado"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
