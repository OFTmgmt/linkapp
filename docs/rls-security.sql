-- =====================================================================
-- Sécurisation RLS (Row Level Security) — my-links-page
-- =====================================================================
-- Verrouille l'accès base : les visiteurs anonymes ne peuvent que ce qui est
-- nécessaire aux pages publiques ; le reste est réservé aux comptes connectés.
-- Les routes serveur (clé service_role) contournent le RLS et continuent de
-- fonctionner (tracking des clics, admin, export...).
--
-- À lancer dans : Supabase → SQL Editor → coller → Run.
-- Version sans bloc DO (compatible éditeur). Idempotent : relançable.
-- =====================================================================

-- 1) Activer RLS sur toutes les tables
ALTER TABLE public.pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;

-- 2) Supprimer nos policies si elles existent déjà (permet de relancer sans erreur)
DROP POLICY IF EXISTS pages_select_public     ON public.pages;
DROP POLICY IF EXISTS pages_write_auth        ON public.pages;
DROP POLICY IF EXISTS links_select_public     ON public.links;
DROP POLICY IF EXISTS links_write_auth        ON public.links;
DROP POLICY IF EXISTS folders_all_auth        ON public.folders;
DROP POLICY IF EXISTS page_views_insert       ON public.page_views;
DROP POLICY IF EXISTS page_views_select_auth  ON public.page_views;
DROP POLICY IF EXISTS clicks_select_auth      ON public.clicks;

-- 3) PAGES : lecture publique (pages publiques), écriture réservée aux connectés
CREATE POLICY pages_select_public ON public.pages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pages_write_auth ON public.pages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) LINKS : idem
CREATE POLICY links_select_public ON public.links
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY links_write_auth ON public.links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5) FOLDERS : uniquement les connectés
CREATE POLICY folders_all_auth ON public.folders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) PAGE_VIEWS : anon peut enregistrer une vue, connectés peuvent lire
CREATE POLICY page_views_insert ON public.page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY page_views_select_auth ON public.page_views
  FOR SELECT TO authenticated USING (true);

-- 7) CLICKS : écrits côté serveur uniquement (service_role). Connectés : lecture seule.
CREATE POLICY clicks_select_auth ON public.clicks
  FOR SELECT TO authenticated USING (true);

-- 8) PROFILES : RLS activé sans policy = verrouillée (seul le serveur y accède)

-- =====================================================================
-- ROLLBACK (si besoin de tout rouvrir) :
-- ALTER TABLE public.pages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.links DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.page_views DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.clicks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- =====================================================================
