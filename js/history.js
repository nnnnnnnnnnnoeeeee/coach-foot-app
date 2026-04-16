/**
 * history.js — Historique des matchs et résultats
 */

// ── Top buteurs de la saison ──────────────────────────────────────
function renderTopScorers() {
  const scorers = {};
  results.forEach(r => {
    (r.player_match_stats || []).forEach(s => {
      if (!scorers[s.player_id]) {
        const pl = players.find(p => p.id === s.player_id);
        scorers[s.player_id] = { name: pl?.name || 'Inconnu', pos: pl?.position || '', goals: 0, assists: 0 };
      }
      scorers[s.player_id].goals   += (s.goals   || 0);
      scorers[s.player_id].assists += (s.assists  || 0);
    });
  });

  const leaderboard = Object.values(scorers)
    .filter(s => s.goals > 0 || s.assists > 0)
    .sort((a, b) => b.goals !== a.goals ? b.goals - a.goals : b.assists - a.assists);

  if (!leaderboard.length) return '';

  const medals = ['🥇', '🥈', '🥉'];
  return `
    <div class="section-label">Meilleurs Buteurs</div>
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">
      ${leaderboard.slice(0, 8).map((s, i) => `
        <div class="scorer-row">
          <span class="scorer-rank">${medals[i] || i + 1}</span>
          <span class="scorer-name">${s.name} <span style="font-size:11px;color:var(--muted)">${s.pos}</span></span>
          <span class="scorer-stat" style="color:var(--g)">⚽ ${s.goals}</span>
          ${s.assists > 0 ? `<span class="scorer-stat" style="color:var(--blue)">🅰 ${s.assists}</span>` : ''}
        </div>`).join('')}
    </div>`;
}

// ── Ouvrir le formulaire de saisie d'un résultat ─────────────────
function openResultModal(eventId) {
  document.getElementById('resultEventId').value = eventId;
  const disponibles = players.filter(p => p.status === 'dispo');
  document.getElementById('playerRatingsForm').innerHTML = disponibles.map(p => `
    <div class="player-stat-row">
      <div class="avatar av-${p.position}" style="width:30px;height:30px;font-size:11px">${initials(p.name)}</div>
      <div class="info" style="font-size:13px">${p.name}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <input type="number" min="0" max="20" placeholder="⚽" title="Buts"
          style="width:40px;padding:4px;border:1px solid var(--border2);border-radius:6px;font-size:12px;text-align:center"
          id="goals_${p.id}"/>
        <input type="number" min="0" max="20" placeholder="🅰" title="Passes décisives"
          style="width:40px;padding:4px;border:1px solid var(--border2);border-radius:6px;font-size:12px;text-align:center"
          id="assists_${p.id}"/>
        <div style="display:flex;gap:3px">
          <button onclick="toggleCard('${p.id}','yellow')" id="ycard_${p.id}"
            style="width:22px;height:28px;background:#fef08a;border:1px solid #eab308;border-radius:3px;cursor:pointer;font-size:10px;opacity:0.5">🟨</button>
          <button onclick="toggleCard('${p.id}','red')" id="rcard_${p.id}"
            style="width:22px;height:28px;background:#fca5a5;border:1px solid #ef4444;border-radius:3px;cursor:pointer;font-size:10px;opacity:0.5">🟥</button>
        </div>
        <div class="star-rating" id="stars_${p.id}">
          ${[1,2,3,4,5].map(s => `<span class="star" onclick="setStar('${p.id}', ${s})">★</span>`).join('')}
        </div>
      </div>
    </div>`).join('');
  openModal('modalResult');
}

// ── Toggle carton ─────────────────────────────────────────────────
function toggleCard(playerId, color) {
  const btn = document.getElementById(`${color[0]}card_${playerId}`);
  if (!btn) return;
  const isActive = btn.style.opacity === '1';
  btn.style.opacity = isActive ? '0.5' : '1';
  btn.dataset.active = isActive ? '' : '1';
}

// ── Clic sur une étoile ────────────────────────────────────────────
function setStar(playerId, value) {
  document.querySelectorAll(`#stars_${playerId} .star`).forEach((s, i) =>
    s.classList.toggle('active', i < value)
  );
  document.getElementById(`stars_${playerId}`).dataset.val = value;
}

// ── Enregistrer le résultat ────────────────────────────────────────
async function saveResult() {
  const eventId = document.getElementById('resultEventId').value;
  const us      = +document.getElementById('rUs').value;
  const them    = +document.getElementById('rThem').value;
  const outcome = us > them ? 'win' : us < them ? 'loss' : 'draw';

  const { data: res } = await sb.from('match_results').insert({
    event_id: eventId, score_us: us, score_them: them,
    result: outcome, notes: document.getElementById('rNotes').value,
    team_id: profile.team_id
  }).select().single();

  if (res) {
    const disponibles = players.filter(p => p.status === 'dispo');
    const stats = disponibles.map(p => ({
      result_id:    res.id,
      player_id:    p.id,
      goals:        +document.getElementById('goals_' + p.id)?.value  || 0,
      assists:      +document.getElementById('assists_' + p.id)?.value || 0,
      yellow_cards: document.getElementById('ycard_' + p.id)?.dataset.active ? 1 : 0,
      red_cards:    document.getElementById('rcard_' + p.id)?.dataset.active  ? 1 : 0,
      rating:       +document.getElementById('stars_' + p.id)?.dataset.val    || null
    })).filter(s => s.goals > 0 || s.assists > 0 || s.yellow_cards || s.red_cards || s.rating);

    if (stats.length) await sb.from('player_match_stats').insert(stats);
    await loadAll();
    renderHistory();
    closeModal('modalResult');
    toast('Résultat enregistré ✓');
  }
}

// ── Afficher l'historique ─────────────────────────────────────────
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
    ${renderTopScorers()}
    ${results.map(r => {
      const eventVotes = store.get('mvp_votes').filter(v => v.event_id === r.event_id);
      let mvpHtml = '';
      if (eventVotes.length > 0) {
        const counts = {};
        eventVotes.forEach(v => counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1);
        const winnerId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        const winner = players.find(p => p.id === winnerId);
        if (winner) {
          mvpHtml = `<div style="margin-top:12px;padding:10px;background:linear-gradient(to right,#fef3c7,#fde68a);border-radius:8px;display:flex;align-items:center;gap:10px">
            <div style="font-size:24px">👑</div>
            <div><div style="font-size:12px;color:#b45309;font-weight:700">HOMME DU MATCH</div>
            <div style="font-weight:600;color:#92400e">${winner.name} (${counts[winnerId]} vote${counts[winnerId] > 1 ? 's' : ''})</div></div>
          </div>`;
        }
      }
      const hasVoted = eventVotes.some(v => v.voter_profile_id === profile.id);
      if (!hasVoted) {
        mvpHtml += `<div style="margin-top:12px"><button class="btn btn-sm btn-outline" style="width:100%" onclick="openMvpModal('${r.event_id}')">⭐ Voter pour l'homme du match</button></div>`;
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
        <div class="score-display">${r.score_us} — ${r.score_them}</div>
      </div>
      ${r.notes ? `<div style="font-size:13px;color:var(--muted);margin-top:4px;font-style:italic">"${r.notes}"</div>` : ''}
      ${mvpHtml}
      ${(r.player_match_stats || []).length ? `
      <div class="divider"></div>
      ${r.player_match_stats.map(s => {
        const pl = players.find(p => p.id === s.player_id);
        if (!pl) return '';
        const cards = [s.yellow_cards ? '🟨'.repeat(s.yellow_cards) : '', s.red_cards ? '🟥'.repeat(s.red_cards) : ''].filter(Boolean).join(' ');
        return `<div class="player-stat-row">
          <div class="info" style="font-size:13px">${pl.name}</div>
          ${s.goals   > 0 ? `<span style="font-size:12px;color:var(--g);font-weight:600">⚽ ${s.goals}</span>` : ''}
          ${s.assists  > 0 ? `<span style="font-size:12px;color:var(--blue);font-weight:600">🅰 ${s.assists}</span>` : ''}
          ${cards ? `<span style="font-size:12px">${cards}</span>` : ''}
          ${s.rating  ? `<span style="font-size:12px;color:var(--amber)">⭐ ${s.rating}/5</span>` : ''}
        </div>`;
      }).join('')}` : ''}
    </div>`;
    }).join('')}`;
}

// ── Vote MVP ──────────────────────────────────────────────────────
function openMvpModal(eventId) {
  document.getElementById('mvpEventId').value = eventId;
  document.getElementById('mvpPlayer').innerHTML =
    players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  openModal('modalMvp');
}

async function saveMvpVote() {
  const eventId = document.getElementById('mvpEventId').value;
  const votedId = document.getElementById('mvpPlayer').value;
  const { data: vote, error } = await sb.from('mvp_votes').insert({
    team_id: profile.team_id, event_id: eventId,
    voter_profile_id: profile.id, voted_player_id: votedId
  }).select().single();
  if (vote) {
    store.set('mvp_votes', [...(store.get('mvp_votes') || []), vote]);
    renderHistory();
    closeModal('modalMvp');
    toast('À voté ! 👑');
  } else {
    toast(error?.message?.includes('duplicate') ? 'Tu as déjà voté.' : 'Erreur lors du vote.');
  }
}
