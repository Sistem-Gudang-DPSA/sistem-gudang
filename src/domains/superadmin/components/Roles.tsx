"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { deleteRole, listPermissions, listRoles, updateRolePermissions } from "@/domains/superadmin/api";
import type { Permission, Role } from "@/domains/superadmin/types";
import { ApiError } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";

const sortIds = (ids: number[]) => [...ids].sort((a, b) => a - b);

export default function RolesPage() {
  const { data: rolesData, loading: rolesLoading, error: rolesError, reload: reloadRoles } = useApiData(
    listRoles,
    "roles",
    "Gagal memuat daftar role.",
  );
  const { data: permData, loading: permLoading, error: permError } = useApiData(
    listPermissions,
    "permissions",
    "Gagal memuat daftar permission.",
  );
  const roles = rolesData ?? [];
  const permissions = permData ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const selected = roles.find((r) => r.id === selectedId);
  const locked = !selected || selected.isSuperadmin;
  const dirty = !!selected && !selected.isSuperadmin && sortIds(draft).join() !== sortIds(selected.permissionIds).join();
  const loadError = actionError || rolesError || permError;

  // Grouped by resource; both levels sorted.
  const groups = [...permissions]
    .sort((a, b) => a.resource.localeCompare(b.resource) || a.code.localeCompare(b.code))
    .reduce<Record<string, Permission[]>>((acc, p) => {
      (acc[p.resource] ??= []).push(p);
      return acc;
    }, {});

  const selectRole = (role: Role) => {
    setSelectedId(role.id);
    setDraft(role.permissionIds);
    setActionError("");
  };

  const togglePermission = (id: number) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setActionError("");
    try {
      await updateRolePermissions(selected.id, sortIds(draft));
      reloadRoles();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menyimpan permission role.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm(`Hapus role ${selected.name}?`)) return;
    setActionError("");
    try {
      await deleteRole(selected.id);
      setSelectedId(null);
      reloadRoles();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menghapus role.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Kelola Role</h1>
        <p className="text-gray-500 text-sm mt-1">Atur permission yang dimiliki tiap role.</p>
      </div>

      {loadError && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{loadError}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-1 h-fit">
          {rolesLoading && roles.length === 0 && <p className="px-3 py-6 text-center text-sm text-gray-400">Memuat data...</p>}
          {!rolesLoading && roles.length === 0 && <p className="px-3 py-6 text-center text-sm text-gray-400">Belum ada role.</p>}
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => selectRole(role)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                role.id === selectedId ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {role.isSuperadmin ? <ShieldCheck className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              {role.name}
            </button>
          ))}
        </div>

        {/* Permission panel */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {!selected && (
            <p className="py-12 text-center text-sm text-gray-400">Pilih role di sebelah kiri untuk melihat permission-nya.</p>
          )}

          {selected && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 capitalize">{selected.name}</h2>
                  {selected.isSuperadmin && (
                    <p className="text-xs text-gray-500 mt-1">Role superadmin memiliki semua akses dan tidak bisa diubah.</p>
                  )}
                </div>
                {!selected.isSuperadmin && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus Role
                  </button>
                )}
              </div>

              {permLoading && <p className="text-sm text-gray-400">Memuat permission...</p>}
              {!permLoading && permissions.length === 0 && <p className="text-sm text-gray-400">Belum ada permission.</p>}

              {!permLoading && Object.entries(groups).map(([resource, perms]) => (
                <div key={resource}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{resource}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draft.includes(p.id)}
                          disabled={locked || saving}
                          onChange={() => togglePermission(p.id)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="font-mono text-xs">{p.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {!selected.isSuperadmin && (
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Simpan mengganti seluruh daftar permission role ini. Perubahan berlaku setelah user refresh sesi berikutnya.
                  </p>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:shadow-none"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
