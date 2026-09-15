-- Connect-it — 10ª categoría profesional: "Apprentice" (Aprendiz).
-- En su propia migración: Postgres no permite usar un valor de enum recién
-- añadido (ALTER TYPE ... ADD VALUE) dentro de la misma transacción en la
-- que se añade.
alter type public.professional_role add value if not exists 'apprentice';
