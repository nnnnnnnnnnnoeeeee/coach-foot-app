-- ==============================================================================
-- 🔒 SUPABASE RLS & LEAGUE SCRIPT (COACHFOOT V4)
-- A EXECUTER DANS L'EDITEUR SQL DE SUPABASE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATION DE LA TABLE CHAMPIONNAT (LEAGUE_MATCHES)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.league_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    match_date DATE NOT NULL,
    match_time TIME NOT NULL,
    location TEXT,
    score_home INTEGER DEFAULT null,
    score_away INTEGER DEFAULT null,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'played'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. VUE SÉCURISÉE DES ÉQUIPES POUR LA LIGUE
-- (Permet de lister les adversaires sans exposer les "invite_codes" secrets)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.league_teams AS
SELECT id, name, created_at FROM public.teams;

-- ------------------------------------------------------------------------------
-- 3. ACTIVATION DU ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;

-- Les matchs de la ligue sont publics (tout le monde lit tout le calendrier et le classement)
CREATE POLICY "Voir les matchs de ligue" ON public.league_matches
FOR SELECT USING (true);

-- Seul le coach d'une des deux équipes impliquées peut créer, modifier ou supprimer un match,
-- OU on autorise n'importe quel coach à defier n'importe qui (plus simple).
-- Vérifions que l'utilisateur est un coach.
CREATE POLICY "Gerer ses matchs de ligue" ON public.league_matches
FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);
