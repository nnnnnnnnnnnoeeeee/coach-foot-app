/**
 * history.js — Historique des matchs et résultats
 *
 * Gère :
 * - L'affichage des résultats passés (victoires / nuls / défaites)
 * - La saisie du résultat d'un match avec les notes individuelles des joueurs
 * - Les étoiles de notation par joueur (1 à 5 étoiles)
 */

// ── Ouvrir le formulaire de saisie d'un résultat ─────────────────
function openResultModal(eventId) {
  document.getElementById('resultEventId').value = eventId;

  // Afficher les joueurs disponibles pour noter chacun
  const disponibles = players.filter(p => p.status === 'dispo');
  document.getElementById('playerRatingsForm').innerHTML = disponibles.map(p => `
    <div class="player-stat-row">
      <div class="avatar av-${p.position}" style="width:30px;height:30px;font-size:11px">${initials(p.name)}</div>
      <div class="info" style="font-size:13px">${p.name}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" min="0" max="10" placeholder="0"
          style="width:44px;padding:4px;border:1px solid var(--border2);border-radius:6px;font-size:13px;text-align:center"
          id="goals_${p.id}"/>
        <span style="font-size:12px;color:var(--muted)">buts</span>
        <div class="star-rating" id="stars_${p.id}">
          ${[1,2,3,4,5].map(s => `<span class="star" onclick="setStar('${p.id}', ${s})">★</span>`).join('')}
        </div>
      </div>
    </div>`).join('');

  openModal('modalResult');
}

// ── Clic sur une étoile de notation ───────────────────────────────
function setStar(playerId, value) {
  document.querySelectorAll(`#stars_${playerId} .star`).forEach((s, i) =>
    s.classList.toggle('active', i < value)
  );
  document.getElementById(`stars_${playerId}`).dataset.val = value;
}

// ── Enregistrer le résultat d'un match ────────────────────────────
async function saveResult() {
  const eventId = document.getElementById('resultEventId').value;
  const us      = +document.getElementById('rUs').value;
  const them    = +document.getElementById('rThem').value;
  const outcome = us > them ? 'win' : us < them ? 'loss' : 'draw';

  const { data: res } = await sb.from('match_results').insert({
    event_id:  eventId,
    score_us:  us,
    score_them: them,
    result:    outcome,
    notes:     document.getElementById('rNotes').value,
    team_id:   profile.team_id
  }).select().single();

  if (res) {
    // Sauvegarder les stats individuelles (buts + note) pour chaque joueur disponible
    const disponibles = players.filter(p => p.status === 'dispo');
    const stats = disponibles.map(p => ({
      result_id: res.id,
      player_id: p.id,
      goals:     +document.getElementById('goals_' + p.id).value || 0,
      rating:    +document.getElementById('stars_' + p.id).dataset.val || null
    })).filter(s => s.goals > 0 || s.rating); // ne sauvegarder que s'il y a des données

    if (stats.length) await sb.from('player_match_stats').insert(stats);

    await loadAll();
    renderHistory();
    closeModal('modalResult');
    toast('Résultat enregistré ✓');
  }
}

// ── Afficher l'historique des résultats ───────────────────────────
function renderHistory() {
  if (!results.length) {
    document.getElementById('historyList').innerHTML = `
      <div class="empty"><div class="empty-icon">📊</div><div class="empty-text">Aucun résultat enregistré</div></div>`;
    return;
  }

  const wins   = results.filter(r => r.result === 'win').length;
  const draws  = results.filter(r => r.result === 'draw').length;
  const losses = results.filter(r => r.result === 'loss').length;

  document.getElementById('historyList').innerHTML = `
    <div class="stats-row" style="margin-bottom:16px">
      <div class="stat-card"><div class="stat-num green">${wins}</div><div class="stat-label">Victoires</div></div>
      <div class="stat-card"><div class="stat-num">${draws}</div><div class="stat-label">Nuls</div></div>
      <div class="stat-card"><div class="stat-num red">${losses}</div><div class="stat-label">Défaites</div></div>
    </div>
    ${results.map(r => {
      
      // -- LOGIQUE MVP (Homme du match) --
      const eventVotes = store.get('mvp_votes').filter(v => v.event_id === r.event_id);
      let mvpHtml = '';
      
      // Si votes terminés (arbitraire : + de 3 votes enregistrés ou date passée depuis longtemps)
      // Pour faire simple, affichons juste les votes en direct ou le gagnant si > 0
      if (eventVotes.length > 0) {
          // Trouver le joueur avec le max de votes
          const counts = {};
          eventVotes.forEach(v => counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1);
          const winnerId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
          const winner = players.find(p => p.id === winnerId);
          if (winner) {
              mvpHtml = `<div style="margin-top:12px; padding:10px; background:linear-gradient(to right, #fef3c7, #fde68a); border-radius:8px; display:flex; align-items:center; gap:10px;">
                            <div style="font-size:24px">👑</div>
                            <div>
                                <div style="font-size:12px; color:#b45309; font-weight:700">HOMME DU MATCH</div>
                                <div style="font-weight:600; color:#92400e">${winner.name} (${counts[winnerId]} votes)</div>
                            </div>
                         </div>`;
          }
      }

      // Bouton voter (si pas encore voté et joueur)
      const hasVoted = eventVotes.some(v => v.voter_profile_id === profile.id);
      if (!isCoach() && !hasVoted) {
          mvpHtml += `<div style="margin-top:12px"><button class="btn btn-sm btn-outline" style="width:100%" onclick="openMvpModal('${r.event_id}')">⭐ Votons pour l'homme du match !</button></div>`;
      }

      return `
    <div class="result-card">
      <div class="event-header">
        <div>
          <span class="badge b-${r.result}">${r.result === 'win' ? 'Victoire' : r.result === 'draw' ? 'Nul' : 'Défaite'}</span>
          <div style="font-size:13px;color:var(--muted);margin-top:4px">
            ${r.events ? r.events.title : ''} · ${r.events ? fmtDate(r.events.event_date) : ''}
          </div>
        </div>
        <div class="score-display" style="font-size:22px">${r.score_us} — ${r.score_them}</div>
      </div>
      ${r.notes ? `<div style="font-size:13px;color:var(--muted);margin-top:4px;font-style:italic">"${r.notes}"</div>` : ''}
      
      ${mvpHtml}
      
      ${(r.player_match_stats || []).length ? `
      <div class="divider"></div>
      ${r.player_match_stats.map(s => {
        const pl = players.find(p => p.id === s.player_id);
        return pl ? `
          <div class="player-stat-row">
            <div class="info" style="font-size:13px">${pl.name}</div>
            ${s.goals  ? `<span style="font-size:12px;color:var(--g);font-weight:600">⚽ ${s.goals}</span>` : ''}
            ${s.rating ? `<span style="font-size:12px;color:var(--amber)">⭐ ${s.rating}/5</span>` : ''}
          </div>` : '';
      }).join('')}` : ''}
    </div>`;
    }).join('')}`;
}

// ── VOTE MVP ──────────────────────────────────────────────────────────
function openMvpModal(eventId) {
    document.getElementById('mvpEventId').value = eventId;
    const pList = players.filter(p => p.status === 'dispo').map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('mvpPlayer').innerHTML = pList;
    openModal('modalMvp');
}

async function saveMvpVote() {
    const eventId = document.getElementById('mvpEventId').value;
    const votedId = document.getElementById('mvpPlayer').value;

    const { data: vote, error } = await sb.from('mvp_votes').insert({
        team_id: profile.team_id,
        event_id: eventId,
        voter_profile_id: profile.id,
        voted_player_id: votedId
    }).select().single();

    if (vote) {
        const currentVotes = store.get('mvp_votes') || [];
        store.set('mvp_votes', [...currentVotes, vote]);
        renderHistory();
        closeModal('modalMvp');
        toast('À voté ! 👑');
    } else {
        toast('Erreur, tu as peut-être déjà voté.');
    }
}
