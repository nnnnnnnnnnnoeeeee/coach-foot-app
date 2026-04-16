-- ==============================================================================
-- 🔒 SUPABASE RLS & CONSTRAINTS SCRIPT (COACHFOOT V2)
-- A EXECUTER DANS L'EDITEUR SQL DE SUPABASE
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
