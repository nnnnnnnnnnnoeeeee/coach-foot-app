/**
 * store.js — Gestionnaire d'état central (State Management)
 *
 * Remplace les variables globales éparpillées en offrant une source unique de vérité.
 * Il implémente un système léger de Pub/Sub (Publish-Subscribe) pour que les
 * composants puissent réagir aux changements de données (Optimistic UI).
 */

class AppStore {
  constructor() {
    this.state = {
      user: null,
      profile: null,
      currentTeam: null,
      players: [],
      events: [],
      messages: [],
      results: [],
      fines: [],
      cars: [],
      mvp_votes: [],
      league_matches: [],
      league_teams: [],
      availabilities: [],
      event_messages: [],
      currentCompo: { schema: '4-3-3', slots: [], eventId: null },
      selectedRole: 'coach'
    };
    this.listeners = {};
  }

  // Obtenir la valeur actuelle d'une clé d'état
  get(key) {
    return this.state[key];
  }

  // Mettre à jour une clé d'état et notifier les abonné(e)s
  set(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  }

  // Mettre à jour l'état complet (fusion)
  update(newState) {
    for (const key in newState) {
      if (newState.hasOwnProperty(key)) {
        this.set(key, newState[key]);
      }
    }
  }

  // S'abonner aux changements d'une clé (ex: store.subscribe('players', renderPlayers))
  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
    // Retourner une fonction pour se désabonner
    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    };
  }

  // Notifier tous les abonnés d'une clé
  notify(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(value));
    }
  }
}

// Instance globale du Store (remplace les "let players = []" de config.js)
window.store = new AppStore();
