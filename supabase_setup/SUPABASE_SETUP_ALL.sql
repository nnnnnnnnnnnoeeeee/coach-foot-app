-- ==============================================================================
-- 🔒 SUPABASE RLS & CONSTRAINTS SCRIPT (COACHFOOT TOUTES VERSIONS)
-- A EXECUTER DANS L'EDITEUR SQL DE SUPABASE
-- ==============================================================================

-- ==============================================================================
-- VERSION 2
-- ==============================================================================

-- 1. CONTRAINTE D'UNICITÉ SUR LE CODE D'INVITATION
-- Empêche deux équipes d'avoir accidentellement le même code
ALTER TABLE public.teams ADD CONSTRAINT unique_invite_code UNIQUE (invite_code);

-- 2. ACTIVATION DU ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composition_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. FONCTION UTILITAIRE : OBTENIR LE TEAM_ID DE L'UTILISATEUR CONNECTÉ
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS uuid AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. POLITIQUES DE SÉCURITÉ (POLICIES)

-- --- PROFILES ---
-- Un utilisateur peut lire son propre profil et les profils de sa propre équipe
CREATE POLICY "Voir les profils de son equipe" ON public.profiles
FOR SELECT USING (
  id = auth.uid() OR team_id = get_user_team_id()
);
-- Un utilisateur peut modifier uniquement son propre profil
CREATE POLICY "Modifier son profil" ON public.profiles
FOR UPDATE USING (id = auth.uid());
-- L'insertion est gérée par Supabase Auth (trigger), on permet l'insert par l'user lui meme
CREATE POLICY "Inserer son profil" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- --- TEAMS ---
-- Un utilisateur peut voir son équipe, ou chercher une équipe par code d'invitation (besoin avant d'être lié)
CREATE POLICY "Voir son equipe ou par code" ON public.teams
FOR SELECT USING (
  id = get_user_team_id() OR true -- "Ou true" car le joueur n'a pas encore de team_id au moment de rejoindre.
);
-- Seul le coach peut créer une équipe
CREATE POLICY "Creer equipe" ON public.teams
FOR INSERT WITH CHECK (auth.uid() = coach_id);
-- Seul le coach peut modifier son équipe
CREATE POLICY "Modifier equipe" ON public.teams
FOR UPDATE USING (auth.uid() = coach_id);

-- --- PLAYERS ---
-- Tout le monde peut voir les joueurs de son équipe
CREATE POLICY "Voir joueurs equipe" ON public.players
FOR SELECT USING (team_id = get_user_team_id());
-- Tout le monde (coach et joueurs) peut modifier les joueurs de son équipe (ex: statut de dispo)
CREATE POLICY "Modifier joueurs equipe" ON public.players
FOR UPDATE USING (team_id = get_user_team_id());
CREATE POLICY "Ajouter joueurs equipe" ON public.players
FOR INSERT WITH CHECK (team_id = get_user_team_id());
CREATE POLICY "Supprimer joueurs equipe" ON public.players
FOR DELETE USING (team_id = get_user_team_id());

-- --- EVENTS (Matchs et Entraînements) ---
-- Tout le monde voit les événements de l'équipe
CREATE POLICY "Voir events equipe" ON public.events
FOR SELECT USING (team_id = get_user_team_id());
-- Seul le coach peut gérer (créer, modifier, supprimer) les événements
CREATE POLICY "Gerer events equipe" ON public.events
FOR ALL USING (
  team_id = get_user_team_id() AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);

-- --- AVAILABILITIES (Présences) ---
CREATE POLICY "Voir presences equipe" ON public.availabilities
FOR SELECT USING (
  event_id IN (SELECT id FROM public.events WHERE team_id = get_user_team_id())
);
-- Un joueur/coach peut insérer ou mettre à jour une présence
CREATE POLICY "Gerer presences" ON public.availabilities
FOR ALL USING (
  event_id IN (SELECT id FROM public.events WHERE team_id = get_user_team_id())
);

-- --- COMPOSITIONS ---
CREATE POLICY "Voir compos" ON public.compositions
FOR SELECT USING (team_id = get_user_team_id());
CREATE POLICY "Gerer compos (coach)" ON public.compositions
FOR ALL USING (
  team_id = get_user_team_id() AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);

-- --- COMPOSITION SLOTS ---
CREATE POLICY "Voir slots" ON public.composition_slots
FOR SELECT USING (
  composition_id IN (SELECT id FROM public.compositions WHERE team_id = get_user_team_id())
);
CREATE POLICY "Gerer slots (coach)" ON public.composition_slots
FOR ALL USING (
  composition_id IN (SELECT id FROM public.compositions WHERE team_id = get_user_team_id()) AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);

-- --- MATCH RESULTS ---
CREATE POLICY "Voir resultats" ON public.match_results
FOR SELECT USING (team_id = get_user_team_id());
CREATE POLICY "Gerer resultats (coach)" ON public.match_results
FOR ALL USING (
  team_id = get_user_team_id() AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);

-- --- PLAYER MATCH STATS (Notes et Buts) ---
CREATE POLICY "Voir stats joueurs" ON public.player_match_stats
FOR SELECT USING (
  result_id IN (SELECT id FROM public.match_results WHERE team_id = get_user_team_id())
);
CREATE POLICY "Gerer stats joueurs (coach)" ON public.player_match_stats
FOR ALL USING (
  result_id IN (SELECT id FROM public.match_results WHERE team_id = get_user_team_id()) AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);

-- --- MESSAGES (Convocations) ---
CREATE POLICY "Voir messages" ON public.messages
FOR SELECT USING (team_id = get_user_team_id());
CREATE POLICY "Gerer messages (coach)" ON public.messages
FOR ALL USING (
  team_id = get_user_team_id() AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach'
);


-- ==============================================================================
-- VERSION 3
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


-- ==============================================================================
-- VERSION 4
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
