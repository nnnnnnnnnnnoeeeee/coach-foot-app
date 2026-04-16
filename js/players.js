/**
 * players.js — Gestion des joueurs
 *
 * Gère :
 * - L'affichage de la liste des joueurs
 * - L'ajout, la modification et la suppression de joueurs
 * - Le changement de statut (disponible / absent / incertain)
 */

let _playerFilter = 'all';

// ── Afficher la liste des joueurs ──────────────────────────────────
function renderPlayers() {
  const disponibles = players.filter(p => p.status === 'dispo').length;
  const absents     = players.filter(p => p.status === 'absent').length;

  // Statistiques rapides en haut de page
  document.getElementById('playerStats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${players.length}</div><div class="stat-label">Joueurs</div></div>
    <div class="stat-card"><div class="stat-num green">${disponibles}</div><div class="stat-label">Dispos</div></div>
    <div class="stat-card"><div class="stat-num red">${absents}</div><div class="stat-label">Absents</div></div>`;

  if (!players.length) {
    document.getElementById('playersList').innerHTML = `
      <div class="empty"><div class="empty-icon">👥</div><div class="empty-text">Aucun joueur. Ajoutes-en un !</div></div>`;
    return;
  }

  // Filtre par poste
  const filtered = _playerFilter === 'all' ? players : players.filter(p => p.position === _playerFilter);
  const filterBar = `
    <div class="filter-bar">
      ${['all','GK','DEF','MID','ATT'].map(pos => `
        <button class="filter-pill ${_playerFilter === pos ? 'active' : ''}"
          onclick="_playerFilter='${pos}';renderPlayers()">
          ${pos === 'all' ? 'Tous' : pos}
        </button>`).join('')}
    </div>`;

  // Carte pour chaque joueur
  document.getElementById('playersList').innerHTML = filterBar + filtered.map(p => `
    <div class="card" onclick="openPlayerDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})">
      <div class="card-row">
        <div class="avatar av-${p.position}">${initials(p.name)}</div>
        <div class="info">
          <div class="info-name">
            ${p.name}
            ${p.jersey_number ? `<span style="color:var(--muted);font-weight:400;font-size:12px">#${p.jersey_number}</span>` : ''}
          </div>
          <div class="info-sub">${p.position}${p.rating ? ' · ⭐ ' + p.rating + '/10' : ''}</div>
          ${p.notes ? `<div class="notes-tag">📝 ${p.notes}</div>` : ''}
        </div>
        <div>
          <span class="badge b-${p.status}">
            ${p.status === 'dispo' ? 'Dispo' : p.status === 'absent' ? 'Absent' : 'Incertain'}
          </span>
          ${isCoach() ? `
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();toggleStatus('${p.id}','dispo')">✓</button>
            <button class="btn btn-sm btn-red" onclick="event.stopPropagation();toggleStatus('${p.id}','absent')">✗</button>
          </div>` : ''}
        </div>
      </div>
    </div>`).join('');
}

// ── Ouvrir le détail d'un joueur ───────────────────────────────────
function openPlayerDetail(p) {
  document.getElementById('playerDetailContent').innerHTML = `
    <div class="modal-title">${p.name}</div>
    <div class="card-row" style="margin-bottom:14px">
      <div class="avatar av-${p.position}" style="width:52px;height:52px;font-size:17px">${initials(p.name)}</div>
      <div class="info">
        <div class="info-name" style="font-size:16px">${p.name}</div>
        <div class="info-sub">${p.position} ${p.jersey_number ? '· N°' + p.jersey_number : ''}</div>
      </div>
      <span class="badge b-${p.status}">${p.status === 'dispo' ? 'Dispo' : p.status === 'absent' ? 'Absent' : 'Incertain'}</span>
    </div>
    ${p.rating ? `<div style="margin-bottom:10px"><span style="font-size:13px;color:var(--muted)">Note : </span><span style="font-weight:600">⭐ ${p.rating}/10</span></div>` : ''}
    ${p.notes  ? `<div style="margin-bottom:10px;font-size:13px;color:var(--muted)">"${p.notes}"</div>` : ''}
    ${isCoach() ? `
    <div class="divider"></div>
    <div class="section-label">Modifier le statut</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-green btn-sm" onclick="toggleStatus('${p.id}','dispo');closeModal('modalPlayerDetail')">Disponible</button>
      <button class="btn btn-sm" style="background:var(--amber2);color:var(--amber);border-color:#fcd34d" onclick="toggleStatus('${p.id}','incertain');closeModal('modalPlayerDetail')">Incertain</button>
      <button class="btn btn-red btn-sm" onclick="toggleStatus('${p.id}','absent');closeModal('modalPlayerDetail')">Absent</button>
    </div>` : ''}`;

  document.getElementById('deletePlayerBtn').style.display = isCoach() ? '' : 'none';
  document.getElementById('deletePlayerBtn').onclick = () => deletePlayer(p.id);
  openModal('modalPlayerDetail');
}

// ── Changer le statut d'un joueur ─────────────────────────────────
async function toggleStatus(id, status) {
  await sb.from('players').update({ status }).eq('id', id);
  const p = players.find(p => p.id === id);
  if (p) p.status = status;
  renderPlayers();
  toast('Statut mis à jour');
}

// ── Ajouter un joueur (formulaire modal) ──────────────────────────
async function savePlayer() {
  const name = document.getElementById('pName').value.trim();
  if (!name) { toast('Nom requis'); return; }

  const data = {
    name,
    position:       document.getElementById('pPos').value,
    jersey_number:  +document.getElementById('pNum').value    || null,
    rating:         +document.getElementById('pRating').value  || 0,
    notes:           document.getElementById('pNotes').value.trim(),
    status:          document.getElementById('pStatus').value,
    team_id:         profile.team_id
  };

  const { data: d, error } = await sb.from('players').insert(data).select().single();
  if (!error) {
    players.push(d);
    renderPlayers();
    closeModal('modalPlayer');
    toast('Joueur ajouté ✓');
    ['pName', 'pNum', 'pNotes', 'pRating'].forEach(id => document.getElementById(id).value = '');
  } else {
    toast('Erreur: ' + error.message);
  }
}

// ── Supprimer un joueur ────────────────────────────────────────────
async function deletePlayer(id) {
  if (!confirm('Supprimer ce joueur ?')) return;
  await sb.from('players').delete().eq('id', id);
  players = players.filter(p => p.id !== id);
  closeModal('modalPlayerDetail');
  renderPlayers();
  toast('Joueur supprimé');
}
