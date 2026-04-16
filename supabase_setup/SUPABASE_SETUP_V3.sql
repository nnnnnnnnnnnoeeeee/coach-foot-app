-- ==============================================================================
-- 🔒 SUPABASE RLS & CONSTRAINTS SCRIPT (COACHFOOT V3)
-- A EXECUTER DANS L'EDITEUR SQL DE SUPABASE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATION DES NOUVELLES TABLES V3
-- ------------------------------------------------------------------------------

-- Table des Amendes (Caisse Noire)
CREATE TABLE IF NOT EXISTS public.fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des votes pour l'Homme du Match (MVP)
CREATE TABLE IF NOT EXISTS public.mvp_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    voter_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    voted_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, voter_profile_id) -- Un vote max par événement par personne
);

-- Table du Covoiturage
CREATE TABLE IF NOT EXISTS public.event_cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    driver_name TEXT NOT NULL,
    seats NUMERIC NOT NULL,
    passengers JSONB DEFAULT '[]'::jsonb, -- Tableau de noms {"name": "Lucas"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Modification de la table EVENTS pour ajouter les tâches/corvées
-- "ADD COLUMN IF NOT EXISTS" pour ne pas casser l'existant
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS chores TEXT;

-- Modification de la table AVAILABILITIES pour gérer le status "late" (retard)
-- Pas besoin de modification stricte si c'est géré comme une string côté JS ('late'),
-- mais on s'assure que la colonne supporte des textes libres (c'est le cas = TEXT).

-- ------------------------------------------------------------------------------
-- 2. ACTIVATION DU ROW LEVEL SECURITY (RLS) SUR LES NOUVELLES TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cars ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. POLITIQUES DE SÉCURITÉ (POLICIES) V3
-- ------------------------------------------------------------------------------

-- --- FINES (Amendes) ---
-- Tout le monde peut voir les amendes de l'équipe
CREATE POLICY "Voir amendes de l'equipe" ON public.fines
FOR SELECT USING (team_id = get_user_team_id());

-- Seul le coach peut infliger ou gérer des amendes
CREATE POLICY "Gerer amendes (coach)" ON public.fines
FOR ALL USING (
  team_id = get_user_team_id() AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);


-- --- MVP VOTES ---
-- Tout le monde peut voir les votes
CREATE POLICY "Voir votes MVP de l'equipe" ON public.mvp_votes
FOR SELECT USING (team_id = get_user_team_id());

-- Tous les joueurs/coach reliers à l'équipe peuvent voter
CREATE POLICY "Voter MVP" ON public.mvp_votes
FOR INSERT WITH CHECK (
  team_id = get_user_team_id() AND
  voter_profile_id = auth.uid()
);


-- --- EVENT CARS (Covoiturage) ---
-- Voir les voitures
CREATE POLICY "Voir voitures de l'equipe" ON public.event_cars
FOR SELECT USING (team_id = get_user_team_id());

-- Gérer (insérer, modifier) sa voiture ou s'inscrire
CREATE POLICY "Gerer voitures equipe" ON public.event_cars
FOR ALL USING (team_id = get_user_team_id());
