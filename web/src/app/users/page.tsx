"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createUser, deleteUser, fetchRoles, fetchUsers, updateUser } from "@/lib/api";
import type { Role, User } from "@/types";
import Alert from "@/components/ui/Alert";

const emptyForm = {
  nombre: "",
  apellido: "",
  email: "",
  roleName: "",
  password: ""
};

const emptyEditForm = {
  nombre: "",
  apellido: "",
  roleName: "",
  activo: true,
  password: ""
};

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export default function UsersPage() {
  const { hydrated } = useRequireAuth();
  const { role, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"info" | "success" | "error">("info");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [filterRole, setFilterRole] = useState("todos");
  const [search, setSearch] = useState("");

  const showMessage = (text: string | null, variant: "info" | "success" | "error" = "info") => {
    setMessage(text);
    if (text) {
      setMessageVariant(variant);
    }
  };

  const loadData = useCallback(async () => {
    if (!token || role !== "Administrador") return;
    setLoading(true);
    try {
      const [rolesData, usersData] = await Promise.all([fetchRoles(token), fetchUsers(token)]);
      setRoles(rolesData);
      setUsers(usersData);
      if (rolesData.length > 0) {
        setForm((prev) => ({ ...prev, roleName: prev.roleName || rolesData[0].nombre }));
      }
    } catch (error) {
      showMessage((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [token, role]);

  useEffect(() => {
    if (hydrated && role === "Administrador") {
      void loadData();
    }
  }, [hydrated, role, loadData]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = filterRole === "todos" || user.rol === filterRole;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        `${user.nombre} ${user.apellido}`.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      return matchesRole && matchesSearch;
    });
  }, [users, filterRole, search]);

  const rows = useMemo(
    () =>
      filteredUsers.map((user) => [
        `${user.nombre} ${user.apellido}`.trim(),
        user.email,
        user.rol,
        user.activo ? "Activo" : "Inactivo",
        new Date(user.fechaCreacion).toLocaleDateString(),
        <div key={user.id} className="flex gap-2">
          <Button
            variant="subtle"
            className="px-3 py-1 text-xs"
            onClick={() => {
              setEditingUser(user);
              setEditForm({
                nombre: user.nombre,
                apellido: user.apellido,
                roleName: user.rol,
                activo: user.activo,
                password: ""
              });
            }}
          >
            Editar
          </Button>
          <Button
            variant="subtle"
            className="px-3 py-1 text-xs text-rose-600"
            onClick={async () => {
              if (!token) return;
              if (typeof window !== "undefined" && !window.confirm(`¿Eliminar a ${user.email}?`)) {
                return;
              }
              try {
                await deleteUser(token, user.id);
                showMessage("Usuario eliminado.", "success");
                await loadData();
              } catch (error) {
                showMessage((error as Error).message, "error");
              }
            }}
          >
            Eliminar
          </Button>
        </div>
      ]),
    [filteredUsers, token, loadData]
  );

  const getDefaultRole = () => {
    const allowed = roles.filter((r) => ["Administrador", "Vendedor"].includes(r.nombre));
    return allowed[0]?.nombre ?? "";
  };

  const closeModal = () => {
    setShowModal(false);
    setForm((prev) => ({
      ...emptyForm,
      roleName: getDefaultRole()
    }));
  };

  const openModal = () => {
    setForm((prev) => ({ ...emptyForm, roleName: getDefaultRole() }));
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!token) return;
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim() || !form.roleName || !form.password) {
      showMessage("Completa todos los campos obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await createUser(token, {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        password: form.password,
        roleName: form.roleName
      });
      showMessage(
        result.emailSent
          ? "Usuario creado y credenciales enviadas por correo."
          : "Usuario creado, pero el correo no pudo enviarse. Verifica la configuración SMTP.",
        result.emailSent ? "success" : "info"
      );
      setForm((prev) => ({ ...emptyForm, roleName: roles[0]?.nombre ?? "" }));
      setShowModal(false);
      await loadData();
    } catch (error) {
      showMessage((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Usuarios">
        <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm">
          Solo el administrador puede gestionar usuarios.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Usuarios">
      <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Equipo</p>
            <h1 className="text-2xl font-semibold text-slate-900">Usuarios del sistema</h1>
            <p className="text-sm text-slate-500">
              Cada cuenta recibe sus credenciales por correo y debe cambiar la contraseña al ingresar.
            </p>
          </div>
          <Button variant="accent" onClick={openModal} disabled={!getDefaultRole()}>
            Crear usuario
          </Button>
        </div>
        {!getDefaultRole() && (
          <p className="mt-2 text-xs text-amber-600">
            No hay roles válidos configurados (solo Administrador o Vendedor). Revisa la base de datos.
          </p>
        )}
        {message && (
          <div className="mt-4">
            <Alert variant={messageVariant} onDismiss={() => showMessage(null)}>
              {message}
            </Alert>
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-xs uppercase text-slate-500">Buscar</label>
            <Input
              placeholder="Nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Filtrar por rol</label>
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="todos">Todos</option>
              {Array.from(new Set(users.map((user) => user.rol))).map((roleItem) => (
                <option key={roleItem} value={roleItem}>
                  {roleItem}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6">
          {message && <p className="mb-3 text-sm text-slate-500">{message}</p>}
          <DataTable headers={["Nombre", "Email", "Rol", "Estado", "Creado", "Acciones"]} rows={rows} loading={loading} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Nuevo usuario</p>
                <h3 className="text-lg font-semibold text-slate-900">Registra un colaborador</h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Apellido"
                    value={form.apellido}
                    onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                    value={form.roleName}
                    onChange={(e) => setForm((prev) => ({ ...prev, roleName: e.target.value }))}
                  >
                    {roles
                      .filter((roleItem) => ["Administrador", "Vendedor"].includes(roleItem.nombre))
                      .map((roleItem) => (
                        <option key={roleItem.id} value={roleItem.nombre}>
                          {roleItem.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500">
                  Contraseña temporal <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex gap-3">
                  <Input
                    type="text"
                    placeholder="Contraseña temporal"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <Button type="button" variant="subtle" className="border border-slate-200" onClick={() => setForm((prev) => ({ ...prev, password: generatePassword() }))}>
                    Generar
                  </Button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Se enviará esta contraseña por correo y el usuario podrá cambiarla en Configuración.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="subtle" className="border border-slate-200" onClick={closeModal}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Creando..." : "Guardar usuario"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Editar usuario</p>
                <h3 className="text-lg font-semibold text-slate-900">{editingUser.email}</h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={() => {
                  setEditingUser(null);
                  setEditForm(emptyEditForm);
                }}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editForm.apellido}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, apellido: e.target.value }))}
                    placeholder="Apellido"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                    value={editForm.roleName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, roleName: e.target.value }))}
                  >
                    {roles
                      .filter((roleItem) => ["Administrador", "Vendedor"].includes(roleItem.nombre))
                      .map((roleItem) => (
                        <option key={roleItem.id} value={roleItem.nombre}>
                          {roleItem.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Estado</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                    value={editForm.activo ? "true" : "false"}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, activo: e.target.value === "true" }))}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500">Nueva contraseña (opcional)</label>
                <Input
                  type="password"
                  placeholder="Deja en blanco para mantener la actual"
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="subtle"
                className="border border-slate-200"
                onClick={() => {
                  setEditingUser(null);
                  setEditForm(emptyEditForm);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!token || !editingUser) return;
                  if (!editForm.nombre.trim() || !editForm.apellido.trim()) {
                    showMessage("Nombre y apellido son obligatorios.", "error");
                    return;
                  }
                  setSavingEdit(true);
                  try {
                    await updateUser(token, editingUser.id, {
                      nombre: editForm.nombre.trim(),
                      apellido: editForm.apellido.trim(),
                      roleName: editForm.roleName,
                      activo: editForm.activo,
                      password: editForm.password || undefined
                    });
                    showMessage("Usuario actualizado.", "success");
                    setEditingUser(null);
                    setEditForm(emptyEditForm);
                    await loadData();
                  } catch (error) {
                    showMessage((error as Error).message, "error");
                  } finally {
                    setSavingEdit(false);
                  }
                }}
                disabled={savingEdit}
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
