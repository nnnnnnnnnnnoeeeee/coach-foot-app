-- ==============================================================================
-- COACHFOOT V5 — Mise à niveau majeure
-- Exécuter dans l'éditeur SQL de Supabase
-- ==============================================================================

-- 1. STATS AVANCÉES (passes décisives + cartons)
ALTER TABLE public.player_match_stats
  ADD COLUMN IF NOT EXISTS assists      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS red_cards    INTEGER DEFAULT 0;

-- 2. CHAT PAR ÉVÉNEMENT
CREATE TABLE IF NOT EXISTS public.event_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID REFERENCES public.teams(id)  ON DELETE CASCADE,
  event_id    UUID REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL,
  author_name TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir chat event"    ON public.event_messages FOR SELECT USING (team_id = get_user_team_id());
CREATE POLICY "Poster chat event"  ON public.event_messages FOR INSERT WITH CHECK (team_id = get_user_team_id() AND profile_id = auth.uid());
CREATE POLICY "Supprimer son msg"  ON public.event_messages FOR DELETE USING (profile_id = auth.uid());

-- 3. PHASES TOURNOI dans league_matches
ALTER TABLE public.league_matches
  ADD COLUMN IF NOT EXISTS phase      TEXT DEFAULT 'league',  -- 'league' | 'group' | 'qf' | 'sf' | 'final'
  ADD COLUMN IF NOT EXISTS group_name TEXT,                    -- 'A' | 'B' | 'C' | 'D'
  ADD COLUMN IF NOT EXISTS round_name TEXT;                    -- 'Quart de finale' | 'Demi-finale' | 'Finale'

-- 4. Activer le Realtime Supabase sur les tables nécessaires
-- (À faire dans Dashboard → Database → Replication → Tables)
-- Tables à activer: availabilities, event_messages, league_matches
