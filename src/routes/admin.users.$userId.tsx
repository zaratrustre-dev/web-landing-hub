import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  fetchAdminProfile,
  fetchChatMessages,
  fetchSkillsCatalog,
  fetchUserReports,
  replaceProfileSkills,
  setUserBanned,
  updateProfileAdmin,
  updateProfilePhoto,
  updateUserEmail,
  uploadProfilePhoto,
  type AdminProfileDetail,
  type ChatMessageRow,
  type SkillOption,
  type UserReport,
} from "@/lib/admin";
import { useIsAdmin, useSession } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";

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

export const Route = createFileRoute("/admin/users/$userId")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: search["edit"] === true || search["edit"] === "true",
  }),
  head: () => ({
    meta: [{ title: "Usuario — Panel admin Connect-it" }],
  }),
  component: AdminUserDetailPage,
});

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const { edit: editFromUrl } = Route.useSearch();
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AdminProfileDetail | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillOption[]>([]);

  const [editing, setEditing] = useState(editFromUrl);

  // useState solo lee editFromUrl la primera vez que se monta el componente.
  // Si navegas de /admin/users/X?edit=false a /admin/users/X?edit=true (o al
  // revés) sin que el componente se remonte, hay que sincronizarlo a mano.
  useEffect(() => {
    setEditing(editFromUrl);
  }, [editFromUrl]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [reports, setReports] = useState<UserReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [openChatMatchId, setOpenChatMatchId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageRow[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [form, setForm] = useState({
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
    skill_ids: [] as string[],
  });

  useEffect(() => {
    if (!loadingSession && !session) navigate({ to: "/admin/login" });
  }, [loadingSession, session, navigate]);

  useEffect(() => {
    if (isAdmin !== true) return;
    let cancelled = false;

    Promise.all([fetchAdminProfile(userId), fetchSkillsCatalog()])
      .then(([p, catalog]) => {
        if (cancelled) return;
        setProfile(p);
        setSkillsCatalog(catalog);
        if (p) {
          setForm({
            email: p.email ?? "",
            name: p.name ?? "",
            age: p.age?.toString() ?? "",
            role: p.role ?? "",
            role_sought: p.role_sought ?? "",
            profession: p.profession ?? "",
            description: p.description ?? "",
            portfolio_url: p.portfolio_url ?? "",
            country: p.country ?? "",
            marketing_consent: p.marketing_consent,
            radar_enabled: p.radar_enabled,
            skill_ids: p.skill_ids,
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "No se pudo cargar el usuario.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, userId]);

  useEffect(() => {
    if (isAdmin !== true) return;
    let cancelled = false;
    setLoadingReports(true);

    fetchUserReports(userId)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch(() => {
        // Silencioso: si falla, simplemente no se muestra la sección de
        // reports, no bloquea el resto de la ficha.
      })
      .finally(() => {
        if (!cancelled) setLoadingReports(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, userId]);

  async function handleOpenChat(matchId: string) {
    if (openChatMatchId === matchId) {
      setOpenChatMatchId(null);
      return;
    }
    setOpenChatMatchId(matchId);
    setLoadingChat(true);
    try {
      const messages = await fetchChatMessages(matchId);
      setChatMessages(messages);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo cargar la conversación.");
    } finally {
      setLoadingChat(false);
    }
  }

  function toggleSkill(skillId: string) {
    setForm((f) => {
      const has = f.skill_ids.includes(skillId);
      if (has) return { ...f, skill_ids: f.skill_ids.filter((id) => id !== skillId) };
      if (f.skill_ids.length >= 3) return f; // máximo 3
      return { ...f, skill_ids: [...f.skill_ids, skillId] };
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (profile && form.email.trim() && form.email.trim() !== profile.email) {
        await updateUserEmail(userId, form.email.trim());
      }

      await updateProfileAdmin(userId, {
        name: form.name || null,
        age: form.age ? Number(form.age) : null,
        role: form.role || null,
        role_sought: form.role_sought || null,
        profession: form.profession || null,
        description: form.description || null,
        portfolio_url: form.portfolio_url || null,
        country: form.country || null,
        marketing_consent: form.marketing_consent,
        radar_enabled: form.radar_enabled,
      });

      await replaceProfileSkills(userId, form.skill_ids);

      if (photoFile) {
        const photoUrl = await uploadProfilePhoto(userId, photoFile);
        await updateProfilePhoto(userId, photoUrl);
      }

      const refreshed = await fetchAdminProfile(userId);
      setProfile(refreshed);
      setPhotoFile(null);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleBlocked() {
    if (!profile) return;
    const nextBlocked = !profile.is_blocked;
    if (nextBlocked && !window.confirm(`¿Bloquear a ${profile.name ?? profile.email}?`)) return;

    setSaveError(null);
    try {
      await setUserBanned(userId, nextBlocked);
      setProfile((p) => (p ? { ...p, is_blocked: nextBlocked } : p));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    }
  }

  if (loadingSession || (session && isAdmin === null) || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
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

  if (loadError || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/admin/users" className="text-sm text-muted-foreground hover:underline">
          ← Usuarios
        </Link>
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {loadError ?? "Usuario no encontrado."}
        </p>
      </div>
    );
  }

  const inputClass =
    "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/admin/users" className="text-sm text-muted-foreground hover:underline">
          ← Usuarios
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name ?? profile.email ?? "Usuario"}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                —
              </div>
            )}
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                {profile.name ?? "(sin nombre)"}
                {profile.radar_enabled && (
                  <span
                    title="Radar activado: visible para el admin"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-sm"
                  >
                    🔌
                  </span>
                )}
                {profile.is_reported && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                    Reportado
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleToggleBlocked}
              className={
                profile.is_blocked
                  ? "rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                  : "rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              }
            >
              {profile.is_blocked ? "Desbloquear" : "Bloquear"}
            </button>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {editing ? "Cancelar" : "Editar"}
            </button>
          </div>
        </div>

        {saveError && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {saveError}
          </p>
        )}

        {!editing ? (
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-border p-5 text-sm sm:grid-cols-2">
            <Field label="Edad" value={profile.age?.toString()} />
            <Field label="País" value={profile.country} />
            <Field label="Rol" value={profile.role ? ROLE_LABELS[profile.role] : undefined} />
            <Field
              label="Busca"
              value={profile.role_sought ? ROLE_LABELS[profile.role_sought] : undefined}
            />
            <Field label="Profesión" value={profile.profession} />
            <Field label="Portfolio" value={profile.portfolio_url} />
            <Field label="Skills" value={profile.skill_names.join(", ") || undefined} />
            <Field
              label="Onboarding"
              value={profile.onboarding_completed ? "Completo" : "Pendiente"}
            />
            <Field label="Marketing" value={profile.marketing_consent ? "Sí" : "No"} />
            <Field label="Radar" value={profile.radar_enabled ? "Activado" : "Desactivado"} />
            <Field label="Alta" value={new Date(profile.created_at).toLocaleString()} />
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Descripción</dt>
              <dd className="mt-1 text-foreground">{profile.description || "—"}</dd>
            </div>
          </dl>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border p-5 sm:grid-cols-2">
            <input
              type="email"
              placeholder="Email (de login)"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={`${inputClass} sm:col-span-2`}
            />
            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Edad"
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              className={inputClass}
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className={inputClass}
            >
              <option value="">Rol…</option>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={form.role_sought}
              onChange={(e) => setForm((f) => ({ ...f, role_sought: e.target.value }))}
              className={inputClass}
            >
              <option value="">Busca…</option>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              maxLength={20}
              placeholder="Profesión (máx. 20)"
              value={form.profession}
              onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}
              className={inputClass}
            />
            <select
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              className={inputClass}
            >
              <option value="">País…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              placeholder="Portfolio (URL)"
              value={form.portfolio_url}
              onChange={(e) => setForm((f) => ({ ...f, portfolio_url: e.target.value }))}
              className={`${inputClass} sm:col-span-2`}
            />
            <textarea
              maxLength={200}
              placeholder="Descripción (máx. 200)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${inputClass} sm:col-span-2`}
              rows={3}
            />

            <div className="sm:col-span-2">
              <p className="mb-2 text-xs text-muted-foreground">Skills (máx. 3)</p>
              <div className="flex flex-wrap gap-2">
                {skillsCatalog.map((s) => {
                  const selected = form.skill_ids.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSkill(s.id)}
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

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Foto de perfil</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              />
            </div>

            <label className="flex items-center gap-2 self-center text-sm text-foreground sm:col-span-2">
              <input
                type="checkbox"
                checked={form.marketing_consent}
                onChange={(e) => setForm((f) => ({ ...f, marketing_consent: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Consentimiento para comunicaciones comerciales
            </label>

            <label className="flex items-center gap-2 self-center text-sm text-foreground sm:col-span-2">
              <input
                type="checkbox"
                checked={form.radar_enabled}
                onChange={(e) => setForm((f) => ({ ...f, radar_enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              🔌 Radar: visible para el admin (tipo Randstad) para oportunidades
            </label>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-span-2"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Reportes {reports.length > 0 && `(${reports.length})`}
          </h2>

          {loadingReports ? (
            <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
          ) : reports.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Este usuario no tiene reportes.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {reports.map((r) => (
                <div key={r.report_id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground">
                      Reportado por <strong>{r.reporter_name ?? r.reporter_email}</strong>{" "}
                      <span className="text-muted-foreground">
                        ({r.target_type === "chat" ? "conversación" : "perfil"})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>

                  {r.target_type === "chat" && r.match_id && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenChat(r.match_id as string)}
                        className="mt-2 text-sm text-primary underline"
                      >
                        {openChatMatchId === r.match_id
                          ? "Ocultar conversación"
                          : "Ver conversación"}
                      </button>

                      {openChatMatchId === r.match_id && (
                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-md bg-muted/40 p-3">
                          {loadingChat ? (
                            <p className="text-sm text-muted-foreground">Cargando mensajes…</p>
                          ) : chatMessages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin mensajes.</p>
                          ) : (
                            chatMessages.map((m) => (
                              <div key={m.id} className="text-sm">
                                <span className="font-medium text-foreground">
                                  {m.sender_name ?? "—"}:
                                </span>{" "}
                                <span className="text-foreground">{m.content}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {new Date(m.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value || "—"}</dd>
    </div>
  );
}
