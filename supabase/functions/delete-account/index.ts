// Edge Function delete-account: autoservicio de "Eliminar cuenta" (Ajustes).
// SIEMPRE borra la cuenta de quien llama (nunca acepta un user_id externo
// en el payload) — a diferencia de admin-users, que exige rol admin y
// borra un user_id arbitrario. Aquí la única autorización que importa es
// "eres tú mismo", que ya la da el JWT.
//
// Vía Admin API (auth.admin.deleteUser), lo que cascada a public.profiles
// (profiles_id_fkey ON DELETE CASCADE) y de ahí en cascada a
// profile_skills, likes, matches, chat_messages, global_chat_messages,
// global_chat_rate_limits y reports (ver supabase/migrations/*_init_schema.sql
// y *_country_and_blocking.sql). También borra la foto de perfil en
// Storage, que no está atada a esa cascada de la base de datos.
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const callerId = ctx.userClaims?.id;
    if (!callerId) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    try {
      // 1) Borra los archivos de la foto de perfil del bucket. Errores aquí
      // no deben impedir borrar la cuenta (un archivo huérfano es un
      // problema menor comparado con no poder eliminar tu cuenta).
      try {
        const { data: files } = await ctx.supabaseAdmin.storage
          .from("profile-photos")
          .list(callerId);
        if (files && files.length > 0) {
          await ctx.supabaseAdmin.storage
            .from("profile-photos")
            .remove(files.map((f) => `${callerId}/${f.name}`));
        }
      } catch {
        // Ignorado a propósito, ver comentario de arriba.
      }

      // 2) Borra al usuario de auth.users. La cascada de Postgres se
      // encarga del resto de tablas.
      const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(callerId);
      if (error) throw error;

      return Response.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};
