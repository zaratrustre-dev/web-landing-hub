-- ============================================================================
-- Connect-it — Chat global: activar Realtime para moderación en vivo
-- Por defecto, Postgres/Supabase NO transmite cambios de una tabla por
-- Realtime hasta que se añade explícitamente a la publicación
-- `supabase_realtime`. Sin esto, el panel de moderación en vivo no
-- recibiría los mensajes nuevos según van llegando.
-- ============================================================================

alter publication supabase_realtime add table public.global_chat_messages;
