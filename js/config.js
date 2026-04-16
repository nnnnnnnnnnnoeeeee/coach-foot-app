/**
 * config.js — Configuration Supabase et données globales
 *
 * Ce fichier contient :
 * - La connexion à la base de données (Supabase)
 * - Les variables globales partagées entre tous les fichiers
 * - Les schémas de formations tactiques
 */

// ── Connexion Supabase ──────────────────────────────────────────────
const SUPA_URL = 'https://qlngdmsocnphssyrbdxt.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmdkbXNvY25waHNzeXJiZHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzIyOTQsImV4cCI6MjA5MTc0ODI5NH0.PrndskK62Xi8SC4SmTqI6KQIot27WHQiDLId3Jx-KAE';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── Variables globales (Proxy vers Store central) ─────────────────
// On redirige les anciennes variables globales vers le store pour ne rien casser
// tout en profitant du système réactif (Pub/Sub) de store.js.
['user', 'profile', 'currentTeam', 'players', 'events', 'messages', 'results', 'fines', 'cars', 'mvp_votes', 'league_matches', 'league_teams', 'availabilities', 'event_messages', 'currentCompo', 'selectedRole'].forEach(key => {
  Object.defineProperty(window, key, {
    get: () => store.get(key),
    set: (val) => store.set(key, val)
  });
});

// ── Formations tactiques par format de jeu ─────────────────────────
// x et y sont des pourcentages (0-100) depuis le coin supérieur gauche
const FORMAT_SCHEMAS = {

  // ── 11 vs 11 ──────────────────────────────────────────────────────
  11: {
    '4-3-3': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'RB',  x: 20, y: 75 }, { role: 'CB', x: 38, y: 75 },
      { role: 'CB',  x: 62, y: 75 }, { role: 'LB', x: 80, y: 75 },
      { role: 'CM',  x: 25, y: 55 }, { role: 'CM', x: 50, y: 52 }, { role: 'CM', x: 75, y: 55 },
      { role: 'RW',  x: 20, y: 30 }, { role: 'ST', x: 50, y: 22 }, { role: 'LW', x: 80, y: 30 }
    ],
    '4-4-2': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'RB',  x: 20, y: 75 }, { role: 'CB', x: 38, y: 75 },
      { role: 'CB',  x: 62, y: 75 }, { role: 'LB', x: 80, y: 75 },
      { role: 'RM',  x: 18, y: 54 }, { role: 'CM', x: 38, y: 54 },
      { role: 'CM',  x: 62, y: 54 }, { role: 'LM', x: 82, y: 54 },
      { role: 'ST',  x: 35, y: 28 }, { role: 'ST', x: 65, y: 28 }
    ],
    '3-5-2': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 27, y: 75 }, { role: 'CB',  x: 50, y: 75 }, { role: 'CB',  x: 73, y: 75 },
      { role: 'RWB', x: 13, y: 55 }, { role: 'CM',  x: 32, y: 52 },
      { role: 'CM',  x: 50, y: 52 }, { role: 'CM',  x: 68, y: 52 }, { role: 'LWB', x: 87, y: 55 },
      { role: 'ST',  x: 35, y: 28 }, { role: 'ST',  x: 65, y: 28 }
    ],
    '4-2-3-1': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'RB',  x: 20, y: 75 }, { role: 'CB',  x: 38, y: 75 },
      { role: 'CB',  x: 62, y: 75 }, { role: 'LB',  x: 80, y: 75 },
      { role: 'DM',  x: 35, y: 62 }, { role: 'DM',  x: 65, y: 62 },
      { role: 'RAM', x: 20, y: 44 }, { role: 'CAM', x: 50, y: 42 }, { role: 'LAM', x: 80, y: 44 },
      { role: 'ST',  x: 50, y: 24 }
    ]
  },

  // ── 8 vs 8 ────────────────────────────────────────────────────────
  8: {
    '3-3-1': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 25, y: 74 }, { role: 'CB',  x: 50, y: 74 }, { role: 'CB',  x: 75, y: 74 },
      { role: 'RM',  x: 18, y: 52 }, { role: 'CM',  x: 50, y: 52 }, { role: 'LM',  x: 82, y: 52 },
      { role: 'ST',  x: 50, y: 24 }
    ],
    '3-2-2': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 25, y: 74 }, { role: 'CB',  x: 50, y: 74 }, { role: 'CB',  x: 75, y: 74 },
      { role: 'CM',  x: 35, y: 54 }, { role: 'CM',  x: 65, y: 54 },
      { role: 'ST',  x: 33, y: 26 }, { role: 'ST',  x: 67, y: 26 }
    ],
    '2-4-1': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 35, y: 74 }, { role: 'CB',  x: 65, y: 74 },
      { role: 'RM',  x: 15, y: 52 }, { role: 'CM',  x: 38, y: 52 },
      { role: 'CM',  x: 62, y: 52 }, { role: 'LM',  x: 85, y: 52 },
      { role: 'ST',  x: 50, y: 24 }
    ],
    '2-3-2': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 35, y: 74 }, { role: 'CB',  x: 65, y: 74 },
      { role: 'RM',  x: 20, y: 54 }, { role: 'CM',  x: 50, y: 54 }, { role: 'LM',  x: 80, y: 54 },
      { role: 'ST',  x: 33, y: 26 }, { role: 'ST',  x: 67, y: 26 }
    ]
  },

  // ── 5 vs 5 ────────────────────────────────────────────────────────
  5: {
    '2-1-1': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 33, y: 71 }, { role: 'CB',  x: 67, y: 71 },
      { role: 'CM',  x: 50, y: 48 },
      { role: 'ST',  x: 50, y: 24 }
    ],
    '1-2-1': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 50, y: 71 },
      { role: 'CM',  x: 30, y: 50 }, { role: 'CM',  x: 70, y: 50 },
      { role: 'ST',  x: 50, y: 24 }
    ],
    '1-1-2': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 50, y: 72 },
      { role: 'CM',  x: 50, y: 52 },
      { role: 'ST',  x: 33, y: 26 }, { role: 'ST',  x: 67, y: 26 }
    ],
    '2-2': [
      { role: 'GK',  x: 50, y: 91 },
      { role: 'CB',  x: 33, y: 71 }, { role: 'CB',  x: 67, y: 71 },
      { role: 'ST',  x: 33, y: 26 }, { role: 'ST',  x: 67, y: 26 }
    ]
  }
};

// Alias pour la compatibilité avec l'ancien code (compo.js)
const SCHEMAS = FORMAT_SCHEMAS[11];
