import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";

import {
  createUser,
  deleteUser,
  fetchAdminProfiles,
  fetchSkillsCatalog,
  replaceProfileSkills,
  setUserBanned,
  updateProfilePhoto,
  uploadProfilePhoto,
  type AdminProfileRow,
  type SkillOption,
} from "@/lib/admin";
import { useIsAdmin, useSession } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  developer: "Developer",
  designer: "Designer",
  entrepreneur: "Entrepreneur",
  marketing: "Marketing",
  consultant: "Consultant",
  lender: "Lender",
  logistics: "Logistics",
  recruiter: "Recruiter",
  influencer: "Influencer",
};

export const Route = createFileRoute("/admin/users/")({
  head: () => ({
    meta: [{ title: "Usuarios — Panel admin Connect-it" }],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AdminProfileRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    age: "",
    role: "",
    role_sought: "",
    profession: "",
    description: "",
    portfolio_url: "",
    country: "",
    marketing_consent: false,
    radar_enabled: false,
  });
  const [createSkillIds, setCreateSkillIds] = useState<string[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillOption[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [createFormKey, setCreateFormKey] = useState(0); // fuerza remount para limpiar el <input type="file">

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [blockedFilter, setBlockedFilter] = useState<"" | "true" | "false">("");
  const [reportedFilter, setReportedFilter] = useState<"" | "true" | "false">("");
  const [skillFilter, setSkillFilter] = useState("");
  const [radarFilter, setRadarFilter] = useState<"" | "true" | "false">("");

  useEffect(() => {
    fetchSkillsCatalog()
      .then(setSkillsCatalog)
      .catch(() => {
        // Silencioso: si falla, el selector de skills simplemente sale vacío.
      });
  }, []);

  // Debounce de la búsqueda por texto: evita disparar una consulta por
  // cada tecla pulsada.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filters = {
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    country: countryFilter || undefined,
    blocked: blockedFilter === "" ? undefined : blockedFilter === "true",
    reported: reportedFilter === "" ? undefined : reportedFilter === "true",
    skillId: skillFilter || undefined,
    radar: radarFilter === "" ? undefined : radarFilter === "true",
  };
  // Clave estable para saber cuándo han cambiado los filtros de verdad
  // (evita comparar el objeto por referencia en las dependencias del efecto).
  const filtersKey = JSON.stringify(filters);

  function loadPage() {
    if (isAdmin !== true) return;
    setLoadingRows(true);
    setError(null);

    fetchAdminProfiles(PAGE_SIZE, page * PAGE_SIZE, filters)
      .then((data) => {
        setRows(data);
        setTotalCount(data[0]?.total_count ?? 0);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar la lista.");
      })
      .finally(() => setLoadingRows(false));
  }

  useEffect(() => {
    if (!loadingSession && !session) {
      navigate({ to: "/admin/login" });
    }
  }, [loadingSession, session, navigate]);

  useEffect(() => {
    if (isAdmin !== true) return;

    let cancelled = false;
    setLoadingRows(true);
    setError(null);

    fetchAdminProfiles(PAGE_SIZE, page * PAGE_SIZE, filters)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setTotalCount(data[0]?.total_count ?? 0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la lista.");
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filtersKey]);

  // Si cambian los filtros, vuelve a la página 1 (si ya estabas en la 1, el
  // efecto de arriba ya se dispara solo por filtersKey).
  useEffect(() => {
    setPage(0);
  }, [filtersKey]);

  if (loadingSession || (session && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Comprobando acceso…</p>
      </div>
    );
  }

  if (!session) return null;

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">No tienes acceso de admin</h1>
        <Link to="/admin" className="text-sm text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function handleToggleBlocked(row: AdminProfileRow) {
    const nextBlocked = !row.is_blocked;
    if (
      nextBlocked &&
      !window.confirm(`¿Bloquear a ${row.name ?? row.email}? No podrá volver a entrar.`)
    ) {
      return;
    }

    setTogglingId(row.id);
    setError(null);
    try {
      await setUserBanned(row.id, nextBlocked);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_blocked: nextBlocked } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(row: AdminProfileRow) {
    if (
      !window.confirm(`¿Borrar a ${row.name ?? row.email} definitivamente? No se puede deshacer.`)
    ) {
      return;
    }

    setDeletingId(row.id);
    setError(null);
    try {
      await deleteUser(row.id);
      loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar el usuario.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (createSkillIds.length === 0) {
      setCreateError("Elige al menos una skill.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createUser({
        email: createForm.email,
        name: createForm.name || undefined,
        age: createForm.age ? Number(createForm.age) : undefined,
        role: createForm.role || undefined,
        role_sought: createForm.role_sought || undefined,
        profession: createForm.profession || undefined,
        description: createForm.description || undefined,
        portfolio_url: createForm.portfolio_url || undefined,
        country: createForm.country || undefined,
        marketing_consent: createForm.marketing_consent,
        radar_enabled: createForm.radar_enabled,
      });

      const newUserId = (result as { user_id?: string } | null)?.user_id;
      if (newUserId && photoFile) {
        const photoUrl = await uploadProfilePhoto(newUserId, photoFile);
        await updateProfilePhoto(newUserId, photoUrl);
      }
      if (newUserId && createSkillIds.length > 0) {
        await replaceProfileSkills(newUserId, createSkillIds);
      }

      setCreateForm({
        email: "",
        name: "",
        age: "",
        role: "",
        role_sought: "",
        profession: "",
        description: "",
        portfolio_url: "",
        country: "",
        marketing_consent: false,
        radar_enabled: false,
      });
      setCreateSkillIds([]);
      setPhotoFile(null);
      setCreateFormKey((k) => k + 1);
      setShowCreateForm(false);
      setPage(0);
      loadPage();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
              ← Panel
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">Usuarios</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">{totalCount} en total</p>
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {showCreateForm ? "Cancelar" : "+ Crear usuario"}
            </button>
          </div>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input
              required
              type="email"
              placeholder="Email *"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              required
              placeholder="Nombre"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              required
              type="number"
              min={18}
              max={120}
              placeholder="Edad"
              value={createForm.age}
              onChange={(e) => setCreateForm((f) => ({ ...f, age: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <select
              required
              value={createForm.country}
              onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">País… *</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              required
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Rol… *</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              required
              value={createForm.role_sought}
              onChange={(e) => setCreateForm((f) => ({ ...f, role_sought: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Busca… *</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              required
              maxLength={20}
              placeholder="Profesión (máx. 20)"
              value={createForm.profession}
              onChange={(e) => setCreateForm((f) => ({ ...f, profession: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              required
              placeholder="Portfolio (URL)"
              value={createForm.portfolio_url}
              onChange={(e) => setCreateForm((f) => ({ ...f, portfolio_url: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:col-span-2 lg:col-span-1"
            />
            <textarea
              required
              maxLength={200}
              placeholder="Descripción (máx. 200)"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:col-span-2 lg:col-span-3"
              rows={3}
            />

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="mb-2 text-xs text-muted-foreground">Skills (mín. 1, máx. 3) *</p>
              <div className="flex flex-wrap gap-2">
                {skillsCatalog.map((s) => {
                  const selected = createSkillIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() =>
                        setCreateSkillIds((prev) => {
                          if (prev.includes(s.id)) return prev.filter((id) => id !== s.id);
                          if (prev.length >= 3) return prev;
                          return [...prev, s.id];
                        })
                      }
                      className={
                        selected
                          ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                          : "rounded-full border border-input px-3 py-1 text-xs text-foreground hover:bg-accent"
                      }
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div key={createFormKey} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Foto de perfil *</label>
              <input
                required
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              />
            </div>

            <label className="flex items-center gap-2 self-center text-sm text-foreground sm:col-span-2 lg:col-span-3">
              <input
                type="checkbox"
                checked={createForm.marketing_consent}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, marketing_consent: e.target.checked }))
                }
                className="h-4 w-4 rounded border-input"
              />
              Consentimiento para recibir comunicaciones comerciales (opcional, desmarcado por
              defecto)
            </label>

            <label className="flex items-center gap-2 self-center text-sm text-foreground sm:col-span-2 lg:col-span-3">
              <input
                type="checkbox"
                checked={createForm.radar_enabled}
                onChange={(e) => setCreateForm((f) => ({ ...f, radar_enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              🔌 Radar: visible para el admin (tipo Randstad) para oportunidades
            </label>

            {createError && (
              <p className="sm:col-span-2 lg:col-span-3 text-sm text-destructive">{createError}</p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-span-2 lg:col-span-3"
            >
              {creating ? "Creando…" : "Guardar usuario"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Todos los países</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={blockedFilter}
            onChange={(e) => setBlockedFilter(e.target.value as "" | "true" | "false")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Cualquier estado</option>
            <option value="false">Solo activos</option>
            <option value="true">Solo bloqueados</option>
          </select>
          <select
            value={reportedFilter}
            onChange={(e) => setReportedFilter(e.target.value as "" | "true" | "false")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Reportados y no reportados</option>
            <option value="true">Solo reportados</option>
            <option value="false">Solo no reportados</option>
          </select>
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Cualquier habilidad</option>
            {skillsCatalog.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={radarFilter}
            onChange={(e) => setRadarFilter(e.target.value as "" | "true" | "false")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Radar: cualquiera</option>
            <option value="true">🔌 Solo con Radar</option>
            <option value="false">Sin Radar</option>
          </select>
          {(search ||
            roleFilter ||
            countryFilter ||
            blockedFilter ||
            reportedFilter ||
            skillFilter ||
            radarFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                setCountryFilter("");
                setBlockedFilter("");
                setReportedFilter("");
                setSkillFilter("");
                setRadarFilter("");
              }}
              className="text-sm text-muted-foreground hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Foto</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Edad</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Busca</th>
                <th className="px-4 py-3 font-medium">Profesión</th>
                <th className="px-4 py-3 font-medium">País</th>
                <th className="px-4 py-3 font-medium">Marketing</th>
                <th className="px-4 py-3 font-medium">Radar</th>
                <th className="px-4 py-3 font-medium">Onboarding</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Reportado</th>
                <th className="px-4 py-3 font-medium">Alta</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-muted-foreground">
                    No hay usuarios todavía.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {row.photo_url ? (
                        <img
                          src={row.photo_url}
                          alt={row.name ?? row.email ?? "Usuario"}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.name ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{row.email ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{row.age ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">
                      {row.role ? (ROLE_LABELS[row.role] ?? row.role) : "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {row.role_sought ? (ROLE_LABELS[row.role_sought] ?? row.role_sought) : "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.profession ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{row.country ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.marketing_consent
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
                            : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {row.marketing_consent ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.radar_enabled && (
                        <span
                          title="Radar activado"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-sm"
                        >
                          🔌
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.onboarding_completed
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
                            : "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600"
                        }
                      >
                        {row.onboarding_completed ? "Completo" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.is_blocked
                            ? "rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
                            : "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
                        }
                      >
                        {row.is_blocked ? "Bloqueado" : "Activo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.is_reported && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                          Reportado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: row.id }}
                          search={{ edit: false }}
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          Ver
                        </Link>
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: row.id }}
                          search={{ edit: true }}
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          disabled={togglingId === row.id}
                          onClick={() => handleToggleBlocked(row)}
                          className={
                            row.is_blocked
                              ? "rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                              : "rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                          }
                        >
                          {togglingId === row.id
                            ? "…"
                            : row.is_blocked
                              ? "Desbloquear"
                              : "Bloquear"}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row)}
                          className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === row.id ? "…" : "Borrar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page === 0 || loadingRows}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Anterior
          </button>
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <button
            type="button"
            disabled={page + 1 >= totalPages || loadingRows}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
