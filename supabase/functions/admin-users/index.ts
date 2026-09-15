// Edge Function admin-users: operaciones de administrador sobre usuarios que
// requieren la Admin API de Supabase (no se pueden hacer con RLS normal):
//   - create:      crea el usuario en auth.users + rellena su perfil
//   - delete:      borra al usuario de verdad (cascada a profiles)
//   - set_banned:  bloquea/desbloquea el LOGIN (ban_duration en auth.users),
//                  además de sincronizar public.profiles.is_blocked
//
// auth: 'user' -> el llamante debe tener un JWT válido (admin autenticado).
// Autorización real (¿es admin?) se comprueba a mano contra user_roles con
// el cliente admin, porque este paquete solo gestiona autenticación, no roles.
import { withSupabase } from "@supabase/server";

interface CreateUserPayload {
  action: "create";
  email: string;
  name?: string;
  age?: number;
  role?: string;
  role_sought?: string;
  profession?: string;
  description?: string;
  portfolio_url?: string;
  country?: string;
  marketing_consent?: boolean;
  radar_enabled?: boolean;
  bulk_imported?: boolean;
}

interface DeleteUserPayload {
  action: "delete";
  user_id: string;
}

interface SetBannedPayload {
  action: "set_banned";
  user_id: string;
  banned: boolean;
  reason?: string;
}

interface UpdateEmailPayload {
  action: "update_email";
  user_id: string;
  new_email: string;
}

type Payload = CreateUserPayload | DeleteUserPayload | SetBannedPayload | UpdateEmailPayload;

// ~100 años: no hay "ban permanente" real en GoTrue, se aproxima con una
// duración muy larga. "none" quita el baneo.
const PERMANENT_BAN_DURATION = "876000h";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const callerId = ctx.userClaims?.id;
    if (!callerId) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    // Comprobación de admin con el cliente admin (bypasa RLS, resultado fiable).
    const { data: roleRow, error: roleError } = await ctx.supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      return Response.json({ error: roleError.message }, { status: 500 });
    }
    if (!roleRow) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    try {
      switch (payload.action) {
        case "create": {
          if (!payload.email) {
            return Response.json({ error: "email es obligatorio" }, { status: 400 });
          }

          const { data: created, error: createError } =
            await ctx.supabaseAdmin.auth.admin.createUser({
              email: payload.email,
              email_confirm: true,
            });
          if (createError) throw createError;

          const newUserId = created.user.id;

          // El trigger handle_new_user ya insertó una fila vacía en profiles;
          // aquí solo completamos los campos que mandó el admin.
          // NOTA: cast puntual, mismo motivo que en src/lib/auth.ts — sin
          // tipos Database generados de verdad (necesita Docker), el cliente
          // de supabase-js no infiere bien .update()/.rpc() en este paquete.
          const { error: updateError } = await (
            ctx.supabaseAdmin.from("profiles") as unknown as {
              update: (v: Record<string, unknown>) => {
                eq: (col: string, val: string) => Promise<{ error: unknown }>;
              };
            }
          )
            .update({
              name: payload.name ?? null,
              age: payload.age ?? null,
              role: payload.role ?? null,
              role_sought: payload.role_sought ?? null,
              profession: payload.profession ?? null,
              description: payload.description ?? null,
              portfolio_url: payload.portfolio_url ?? null,
              country: payload.country ?? null,
              marketing_consent: payload.marketing_consent ?? false,
              radar_enabled: payload.radar_enabled ?? false,
              bulk_imported: payload.bulk_imported ?? false,
            })
            .eq("id", newUserId);
          if (updateError) throw updateError;

          return Response.json({ success: true, user_id: newUserId });
        }

        case "delete": {
          if (!payload.user_id) {
            return Response.json({ error: "user_id es obligatorio" }, { status: 400 });
          }
          const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(
            payload.user_id,
          );
          if (deleteError) throw deleteError;
          return Response.json({ success: true });
        }

        case "set_banned": {
          if (!payload.user_id) {
            return Response.json({ error: "user_id es obligatorio" }, { status: 400 });
          }

          // 1) Bloqueo a nivel de login (Admin API).
          const { error: banError } = await ctx.supabaseAdmin.auth.admin.updateUserById(
            payload.user_id,
            { ban_duration: payload.banned ? PERMANENT_BAN_DURATION : "none" },
          );
          if (banError) throw banError;

          // 2) Sincroniza el estado visible en profiles (usa el RPC ya
          // existente, que también valida is_admin() a su manera).
          const { error: profileError } = await (
            ctx.supabase.rpc as unknown as (
              fn: string,
              args: Record<string, unknown>,
            ) => Promise<{ error: unknown }>
          )("admin_set_user_blocked", {
            target_user_id: payload.user_id,
            new_is_blocked: payload.banned,
            reason: payload.reason ?? null,
          });
          if (profileError) throw profileError;

          return Response.json({ success: true });
        }

        case "update_email": {
          if (!payload.user_id || !payload.new_email) {
            return Response.json(
              { error: "user_id y new_email son obligatorios" },
              { status: 400 },
            );
          }

          const { error: emailError } = await ctx.supabaseAdmin.auth.admin.updateUserById(
            payload.user_id,
            { email: payload.new_email, email_confirm: true },
          );
          if (emailError) throw emailError;

          return Response.json({ success: true });
        }

        default:
          return Response.json({ error: "Acción no reconocida" }, { status: 400 });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};

