-- =====================================================================
-- Sécurisation RLS (Row Level Security) — my-links-page
-- =====================================================================
-- Problème corrigé : la clé publique (anon) du site pouvait écrire/modifier
-- n'importe quelle donnée. On verrouille : les visiteurs anonymes ne peuvent
-- que ce qui est nécessaire aux pages publiques ; le reste est réservé aux
-- comptes connectés. Les routes serveur (clé service_role) contournent le RLS
-- et continuent de fonctionner (tracking des clics, admin, export...).
--
-- À lancer dans : Supabase → SQL Editor → coller → Run.
-- Idempotent : peut être relancé sans risque.
-- =====================================================================

-- 1) Repartir propre : supprimer toute policy existante sur nos tables
--    (enlève d'éventuelles règles permissives laissées par défaut)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('pages','links','folders','page_views','clicks','profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) Activer RLS sur toutes les tables
ALTER TABLE public.pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;

-- 3) PAGES : lecture publique (pages publiques), écriture réservée aux connectés
CREATE POLICY pages_select_public ON public.pages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pages_write_auth ON public.pages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) LINKS : idem (les boutons s'affichent sur les pages publiques)
CREATE POLICY links_select_public ON public.links
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY links_write_auth ON public.links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5) FOLDERS : uniquement les connectés (jamais exposés au public)
CREATE POLICY folders_all_auth ON public.folders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) PAGE_VIEWS : les visiteurs anonymes peuvent enregistrer une vue,
--    seuls les connectés peuvent les lire (analytics)
CREATE POLICY page_views_insert ON public.page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY page_views_select_auth ON public.page_views
  FOR SELECT TO authenticated USING (true);

-- 7) CLICKS : écrits uniquement côté serveur (service_role, contourne le RLS).
--    Anon : aucun accès (ne peut PAS gonfler les clics). Connectés : lecture seule.
CREATE POLICY clicks_select_auth ON public.clicks
  FOR SELECT TO authenticated USING (true);

-- 8) PROFILES : verrouillée (aucun accès anon/connecté ; seul le serveur y touche)
--    -> RLS activé sans policy = tout est refusé sauf service_role.

-- =====================================================================
-- Vérification : liste les règles en place après exécution
-- =====================================================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- =====================================================================
-- ROLLBACK (si jamais quelque chose casse, à lancer pour tout rouvrir) :
-- ALTER TABLE public.pages      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.links      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.folders    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.page_views DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.clicks     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles   DISABLE ROW LEVEL SECURITY;
-- =====================================================================
