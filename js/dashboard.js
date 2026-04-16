/**
 * dashboard.js — Profil individuel du joueur (Gamification)
 *
 * Gère :
 * - Le calcul des statistiques personnelles (matchs joués, buts, note moyenne)
 * - L'affichage de l'évolution du joueur sous forme de cartes
 */

function renderDashboard() {
  if (isCoach()) return; // Seulement pour les joueurs

  // L'utilisateur est un joueur, on trouve son ID dans la table des joueurs
  const myPlayer = players.find(p => p.profile_id === profile.id) || players.find(p => p.name === profile.full_name);

  if (!myPlayer) {
    document.getElementById('dashboardContent').innerHTML = `
      <div class="empty">
        <div class="empty-icon">🤷‍♂️</div>
        <div class="empty-text">Ton profil de joueur n'est pas encore lié à cette équipe. Demande au coach de t'ajouter avec le même nom, ou rafraîchis l'application.</div>
      </div>`;
    return;
  }

  // Calcul des statistiques
  let matchsJoues = 0, totalButs = 0, totalAssists = 0, yellowCards = 0, redCards = 0;
  let notes = [];

  results.forEach(res => {
    if (res.player_match_stats) {
      const s = res.player_match_stats.find(s => s.player_id === myPlayer.id);
      if (s) {
        matchsJoues++;
        totalButs    += (s.goals        || 0);
        totalAssists += (s.assists      || 0);
        yellowCards  += (s.yellow_cards || 0);
        redCards     += (s.red_cards    || 0);
        if (s.rating) notes.push(s.rating);
      }
    }
  });

  // Victoires MVP
  const mvpWins = (store.get('mvp_votes') || []).filter(v => v.voted_player_id === myPlayer.id).length;
  const noteMoyenne = notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : '-';

  // Construction du Dashboard
  document.getElementById('dashboardContent').innerHTML = `
    <!-- Carte principale de profil -->
    <div style="background:linear-gradient(135deg, var(--g2), var(--g)); color:white; border-radius:var(--r2); padding:24px 20px; display:flex; align-items:center; gap:16px; margin-bottom:20px; box-shadow:var(--shadow-lg)">
      <div class="av-${myPlayer.position}" style="width:70px; height:70px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; color:var(--g2); background:white; flex-shrink:0; border:4px solid rgba(255,255,255,0.3)">
        ${initials(myPlayer.name)}
      </div>
      <div>
        <div style="font-size:12px; opacity:0.9; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px">${myPlayer.position} ${myPlayer.jersey_number ? '#'+myPlayer.jersey_number : ''}</div>
        <div style="font-family:'Syne', sans-serif; font-size:24px; font-weight:700; line-height:1.1">${myPlayer.name}</div>
        <div style="margin-top:8px; display:inline-block; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:20px; font-size:12px; backdrop-filter:blur(4px)">
          Statut : ${myPlayer.status === 'dispo' ? '✅ Opérationnel' : myPlayer.status === 'absent' ? '❌ Indisponible' : '⚠️ Incertain'}
        </div>
      </div>
    </div>

    <!-- Statistiques de la saison -->
    <div class="section-label">Ma Saison</div>
    <div class="stats-row" style="margin-bottom:10px">
      <div class="stat-card" style="border-top:3px solid var(--blue)">
        <div class="stat-num" style="color:var(--blue)">${matchsJoues}</div>
        <div class="stat-label">Matchs</div>
      </div>
      <div class="stat-card" style="border-top:3px solid var(--g)">
        <div class="stat-num" style="color:var(--g)">${totalButs}</div>
        <div class="stat-label">Buts ⚽</div>
      </div>
      <div class="stat-card" style="border-top:3px solid var(--amber)">
        <div class="stat-num" style="color:var(--amber)">${noteMoyenne}</div>
        <div class="stat-label">Note Moy. ⭐</div>
      </div>
    </div>
    <div class="stats-row" style="margin-bottom:20px">
      <div class="stat-card" style="border-top:3px solid var(--blue)">
        <div class="stat-num" style="color:var(--blue)">${totalAssists}</div>
        <div class="stat-label">Passes 🅰</div>
      </div>
      <div class="stat-card" style="border-top:3px solid #eab308">
        <div class="stat-num" style="color:#b45309">${yellowCards}</div>
        <div class="stat-label">🟨 Jaunes</div>
      </div>
      <div class="stat-card" style="border-top:3px solid var(--red)">
        <div class="stat-num" style="color:var(--red)">${mvpWins}${mvpWins > 0 ? ' 👑' : ''}</div>
        <div class="stat-label">MVP</div>
      </div>
    </div>

    <!-- Compétences / Rôle -->
    <div class="card" style="margin-bottom:20px">
      <div class="section-label" style="margin-top:0">Notes du Coach</div>
      ${myPlayer.notes 
        ? `<div style="font-size:14px; font-style:italic; padding:10px; background:var(--bg); border-radius:8px; color:var(--text); border-left:3px solid var(--g)">"${myPlayer.notes}"</div>` 
        : `<div style="font-size:13px; color:var(--muted)">Le coach n'a pas encore ajouté de note personnelle sur ton profil.</div>`}
    </div>

    <!-- Accès à la caisse de l'équipe -->
    <button class="btn btn-outline" style="width:100%" onclick="switchPage('fines')">💰 L'Ardoise (Voir les amendes)</button>
  `;
}
