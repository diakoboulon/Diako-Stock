-- =====================================================================
-- DIAKO STOCK — MIGRATION 6 : nouvelles limites de produits
--   Gratuit  : 10 produits
--   Standard : 100 produits
--   Pro      : 500 produits (inchangé)
--   Business : illimité (inchangé)
-- À exécuter UNE fois dans Supabase > SQL Editor.
-- Ne supprime aucune donnée : un commerce qui dépasse la nouvelle limite
-- garde ses produits, mais ne peut plus en ajouter avant de changer de plan.
-- =====================================================================
create or replace function public.limite_produits(p_plan text)
returns int language sql immutable as $$
  select case p_plan
    when 'standard' then 100
    when 'pro'      then 500
    when 'business' then null
    else 10
  end
$$;
