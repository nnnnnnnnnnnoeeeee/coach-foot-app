/**
 * planning.js — Planning des événements
 */

let _editingEventId = null; // null = ajout, string = modification

// ── Afficher la liste des événements ──────────────────────────────
async function renderPlanning() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past     = events.filter(e => e.event_date <  today).sort((a, b) => b.event_date.localeCompare(a.event_date));
  const all = [...upcoming, ...past];

  if (!all.length) {
    document.getElementById('eventsList').innerHTML = `
      <div class="empty"><div class="empty-icon">📅</div><div class="empty-text">Aucun événement prévu</div></div>`;
    return;
  }

  // Pré-charger la météo des 3 prochains événements avec lieu
  const wxPromises = upcoming.slice(0, 3).map(e =>
    e.location ? fetchWeather(e.event_date, e.location) : Promise.resolve(null)
  );
  const wxResults = await Promise.all(wxPromises);
  const wxMap = {};
  upcoming.slice(0, 3).forEach((e, i) => { wxMap[e.id] = wxResults[i]; });

  const avails = store.get('availabilities') || [];

  document.getElementById('eventsList').innerHTML = all.map(e => {
    // Covoiturage
    const eventCars = (cars || []).filter(c => c.event_id === e.id);
    const carHtml = eventCars.length
      ? `<div style="margin-top:10px;padding:8px;background:var(--bg);border-radius:8px;font-size:12px">
           <div style="font-weight:600;margin-bottom:4px">🚗 Covoiturage</div>
           ${eventCars.map(c => `• ${c.driver_name} (${(c.passengers||[]).length}/${c.seats} places)`).join('<br>')}
         </div>`
      : '';

    // Résumé présences (coach) ou boutons dispo (joueur)
    let availHtml = '';
    if (isCoach()) {
      const ev = avails.filter(a => a.event_id === e.id);
      if (ev.length) {
        const confirmed = ev.filter(a => a.status === 'confirmed').length;
        const declined  = ev.filter(a => a.status === 'declined').length;
        const pending   = ev.filter(a => a.status === 'pending').length;
        const late      = ev.filter(a => a.status === 'late').length;
        availHtml = `
          <div class="avail-summary">
            <span style="color:var(--g)">✓ ${confirmed} présents</span>
            <span style="color:var(--red)">✗ ${declined} absents</span>
            <span style="color:var(--amber)">? ${pending} incertains</span>
            ${late ? `<span style="color:var(--muted)">⏳ ${late} retards</span>` : ''}
          </div>
          <button class="btn btn-sm btn-outline" style="margin-top:6px;font-size:11px"
            onclick="showAvailDetail('${e.id}')">Voir les réponses détaillées</button>`;
      } else if (e.event_date >= today) {
        availHtml = `<div class="avail-summary"><span style="color:var(--muted)">En attente des réponses…</span></div>`;
      }
    } else if (e.event_date >= today) {
      availHtml = renderAvailBtns(e.id);
    }

    // Météo (uniquement pour les événements à venir avec lieu)
    const wx = wxMap[e.id];
    const wxHtml = wx ? weatherHtml(wx) : '';

    // Type badge
    const typeBadge = e.type === 'training'
      ? `<span class="badge b-training">Entraînement</span>`
      : `<span class="badge b-match">Match</span>`;

    return `
    <div class="event-card ec-${e.type}" id="event_${e.id}">
      <div class="event-header">
        <div>
          ${typeBadge}
          <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:600;margin-top:5px">${e.title}</div>
          ${e.opponent ? `<div class="event-meta">vs ${e.opponent}</div>` : ''}
          <div class="event-meta">📅 ${fmtDate(e.event_date, e.event_time)} · 📍 ${e.location || 'À définir'}</div>
          ${e.chores ? `<div class="event-meta" style="color:var(--amber);font-weight:500">🧹 ${e.chores}</div>` : ''}
          ${e.notes  ? `<div class="event-meta">💬 ${e.notes}</div>` : ''}
        </div>
      </div>

      ${wxHtml}
      ${availHtml}
      ${carHtml}

      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="exportICal('${e.id}')">🗓️ Calendrier</button>
        <button class="btn btn-sm btn-outline" onclick="addCar('${e.id}')">🚗 Covoiturage</button>
        <button class="btn btn-sm btn-outline" onclick="toggleChat('${e.id}')">💬 Chat</button>
        ${isCoach() ? `<button class="btn btn-sm btn-outline" onclick="openEditEvent('${e.id}')">✏️ Modifier</button>` : ''}
      </div>

      <!-- Chat fil de discussion -->
      <div id="chat_${e.id}" class="chat-thread" style="display:none">
        <div class="chat-messages" id="chatMsgs_${e.id}"></div>
        <div class="chat-input-wrap">
          <input class="chat-input" id="chatInput_${e.id}" placeholder="Écris un message…"
            onkeydown="if(event.key==='Enter')sendChat('${e.id}')"/>
          <button class="btn btn-green btn-sm" onclick="sendChat('${e.id}')">Envoyer</button>
        </div>
      </div>

      ${isCoach() && e.type === 'match' && e.event_date < today ? `
      <div class="event-actions" style="margin-top:12px">
        <button class="btn btn-sm btn-outline" onclick="openResultModal('${e.id}')">Saisir résultat</button>
        <button class="btn btn-sm btn-red" onclick="deleteEvent('${e.id}')">Supprimer</button>
      </div>` : ''}
      ${isCoach() && (e.type !== 'match' || e.event_date >= today) ? `
      <div class="event-actions" style="margin-top:12px">
        <button class="btn btn-sm btn-red" onclick="deleteEvent('${e.id}')">Supprimer</button>
      </div>` : ''}
    </div>`;
  }).join('');

  if (!isCoach()) loadMyAvailabilities();
}

// ── Afficher le détail des présences (coach) ──────────────────────
function showAvailDetail(eventId) {
  const avails = (store.get('availabilities') || []).filter(a => a.event_id === eventId);
  const statusLabel = { confirmed: '✓ Présent', declined: '✗ Absent', pending: '? Incertain', late: '⏳ Retard' };
  const statusColor = { confirmed: 'var(--g)', declined: 'var(--red)', pending: 'var(--amber)', late: 'var(--muted)' };

  // Trouver le nom de chaque joueur depuis leur player_id
  const rows = avails.map(a => {
    const pl = players.find(p => p.id === a.player_id);
    const name = pl?.name || 'Joueur inconnu';
    const pos  = pl?.position || '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-weight:500">${name} <span style="font-size:11px;color:var(--muted)">${pos}</span></div>
      <span style="color:${statusColor[a.status]};font-weight:600;font-size:13px">${statusLabel[a.status] || a.status}</span>
    </div>`;
  }).join('');

  // On réutilise une zone dans le planning
  const el = document.getElementById('availDetail_' + eventId);
  if (el) { el.style.display = el.style.display === 'none' ? '' : 'none'; return; }

  const card = document.getElementById('event_' + eventId);
  if (!card) return;
  const detail = document.createElement('div');
  detail.id = 'availDetail_' + eventId;
  detail.style.cssText = 'margin-top:10px;border-top:1px solid var(--border);padding-top:10px';
  detail.innerHTML = rows || '<div style="color:var(--muted);font-size:13px">Aucune réponse enregistrée.</div>';
  card.appendChild(detail);
}

// ── Chat par événement ─────────────────────────────────────────────
function toggleChat(eventId) {
  const el = document.getElementById('chat_' + eventId);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : '';
  if (!isOpen) renderChatMessages(eventId);
}

function renderChatMessages(eventId) {
  const msgs = (store.get('event_messages') || []).filter(m => m.event_id === eventId);
  const el = document.getElementById('chatMsgs_' + eventId);
  if (!el) return;
  if (!msgs.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px">Aucun message. Sois le premier !</div>';
  } else {
    el.innerHTML = msgs.map(m => {
      const isMe = m.profile_id === profile.id;
      return `<div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'}">
        <div class="chat-author">${isMe ? 'Moi' : m.author_name}</div>
        <div class="chat-bubble ${isMe ? 'me' : 'other'}">${m.content}</div>
      </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }
}

async function sendChat(eventId) {
  const input = document.getElementById('chatInput_' + eventId);
  const content = input?.value.trim();
  if (!content) return;

  const authorName = profile.full_name || profile.email;
  const { data: msg, error } = await sb.from('event_messages').insert({
    team_id: profile.team_id,
    event_id: eventId,
    profile_id: profile.id,
    author_name: authorName,
    content
  }).select().single();

  if (!error && msg) {
    input.value = '';
    const current = store.get('event_messages') || [];
    if (!current.find(m => m.id === msg.id)) {
      store.set('event_messages', [...current, msg]);
    }
    renderChatMessages(eventId);
  } else {
    toast('Erreur envoi message');
  }
}

// ── Boutons de disponibilité ───────────────────────────────────────
function renderAvailBtns(eventId) {
  return `
    <div class="avail-btns" id="avail_${eventId}">
      <button class="avail-btn yes"   onclick="setAvail('${eventId}','confirmed')">✓ Présent</button>
      <button class="avail-btn no"    onclick="setAvail('${eventId}','declined')">✗ Absent</button>
      <button class="avail-btn maybe" onclick="setAvail('${eventId}','pending')">? Incertain</button>
      <button class="avail-btn late"  onclick="setAvail('${eventId}','late')">⏳ Retard</button>
    </div>`;
}

async function loadMyAvailabilities() {
  const { data: myPlayer } = await sb.from('players').select('id').eq('profile_id', user.id).single();
  if (!myPlayer) return;
  const { data: avails } = await sb.from('availabilities').select('*').eq('player_id', myPlayer.id);
  (avails || []).forEach(a => {
    const wrap = document.getElementById('avail_' + a.event_id);
    if (!wrap) return;
    wrap.querySelectorAll('.avail-btn').forEach(b => b.classList.remove('active'));
    const map = { confirmed: '.yes', declined: '.no', pending: '.maybe', late: '.late' };
    const btn = wrap.querySelector(map[a.status]);
    if (btn) btn.classList.add('active');
  });
}

async function setAvail(eventId, status) {
  const { data: myPlayer } = await sb.from('players').select('id').eq('profile_id', user.id).single();
  if (!myPlayer) { toast("Ton profil joueur n'est pas encore lié. Demande au coach."); return; }

  await sb.from('availabilities').upsert(
    { event_id: eventId, player_id: myPlayer.id, status },
    { onConflict: 'event_id,player_id' }
  );

  // MAJ optimiste du store
  const avails = store.get('availabilities') || [];
  const existing = avails.find(a => a.event_id === eventId && a.player_id === myPlayer.id);
  if (existing) existing.status = status;
  else avails.push({ event_id: eventId, player_id: myPlayer.id, status });
  store.set('availabilities', [...avails]);

  const wrap = document.getElementById('avail_' + eventId);
  if (wrap) {
    wrap.querySelectorAll('.avail-btn').forEach(b => b.classList.remove('active'));
    const map = { confirmed: '.yes', declined: '.no', pending: '.maybe', late: '.late' };
    wrap.querySelector(map[status])?.classList.add('active');
  }

  const msgs = { confirmed: 'Présence confirmée ✓', declined: 'Absence signalée', pending: 'Marqué comme incertain', late: 'Retard signalé ⏳' };
  toast(msgs[status] || 'Réponse enregistrée');
}

// ── Ajouter un événement ───────────────────────────────────────────
async function saveEvent() {
  if (_editingEventId) { await updateEvent(); return; }
  await createEvent();
}

async function createEvent() {
  const type = document.getElementById('eType').value;
  const isLeague = (type === 'league_match');
  const d = document.getElementById('eDate').value;
  if (!d) { toast('Sélectionne une date'); return; }

  let opponentName = null, opponentId = null;
  if (isLeague) {
    const sel = document.getElementById('eLeagueOpponent');
    opponentName = sel.options[sel.selectedIndex]?.text;
    opponentId = sel.value;
  } else if (type === 'match') {
    opponentName = document.getElementById('eOpponent').value.trim();
  }

  const dataA = {
    title:      document.getElementById('eTitle').value.trim() || 'Événement',
    type:       isLeague ? 'match' : type,
    opponent:   opponentName,
    event_date: d,
    event_time: document.getElementById('eTime').value || '00:00',
    location:   document.getElementById('eLieu').value.trim(),
    notes:      document.getElementById('eNotes').value.trim(),
    chores:     document.getElementById('eChores').value.trim(),
    team_id:    profile.team_id
  };

  const { data: evA, error } = await sb.from('events').insert(dataA).select().single();
  if (error) { toast('Erreur: ' + error.message); return; }

  if (isLeague && opponentId) {
    const { data: leagueMatch } = await sb.from('league_matches').insert({
      home_team_id: profile.team_id,
      away_team_id: opponentId,
      match_date: d,
      match_time: document.getElementById('eTime').value || '00:00',
      location: document.getElementById('eLieu').value.trim(),
      phase: document.getElementById('eLeaguePhase')?.value || 'league',
      group_name: document.getElementById('eLeagueGroup')?.value || null,
      round_name: document.getElementById('eLeagueRound')?.value || null
    }).select().single();
    if (leagueMatch) store.set('league_matches', [...(store.get('league_matches') || []), leagueMatch]);

    const tName = store.get('league_teams').find(t => t.id === profile.team_id)?.name || 'Équipe adverse';
    await sb.from('events').insert({ ...dataA, team_id: opponentId, opponent: tName, notes: 'Planifié par ' + tName });
  }

  store.set('events', [...(store.get('events') || []), evA]);
  renderPlanning();
  closeModal('modalEvent');
  resetEventModal();
  toast(isLeague ? 'Match de ligue créé ✓' : 'Événement ajouté ✓');
}

// ── Modifier un événement ──────────────────────────────────────────
function openEditEvent(eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  _editingEventId = eventId;

  document.getElementById('eTitle').value    = ev.title;
  document.getElementById('eType').value     = ev.type;
  document.getElementById('eDate').value     = ev.event_date;
  document.getElementById('eTime').value     = ev.event_time || '';
  document.getElementById('eLieu').value     = ev.location || '';
  document.getElementById('eNotes').value    = ev.notes || '';
  document.getElementById('eChores').value   = ev.chores || '';
  document.getElementById('eOpponent').value = ev.opponent || '';
  document.getElementById('eOpponentField').style.display = ev.type === 'match' ? '' : 'none';
  document.getElementById('eLeagueOpponentField').style.display = 'none';

  document.querySelector('#modalEvent .modal-title').textContent = 'Modifier l\'événement';
  document.querySelector('#modalEvent .btn-green').textContent = 'Enregistrer';
  openModal('modalEvent');
}

async function updateEvent() {
  const d = document.getElementById('eDate').value;
  if (!d) { toast('Sélectionne une date'); return; }

  const data = {
    title:      document.getElementById('eTitle').value.trim() || 'Événement',
    type:       document.getElementById('eType').value,
    opponent:   document.getElementById('eOpponent').value.trim() || null,
    event_date: d,
    event_time: document.getElementById('eTime').value || '00:00',
    location:   document.getElementById('eLieu').value.trim(),
    notes:      document.getElementById('eNotes').value.trim(),
    chores:     document.getElementById('eChores').value.trim(),
  };

  const { data: updated, error } = await sb.from('events').update(data).eq('id', _editingEventId).select().single();
  if (!error) {
    store.set('events', events.map(e => e.id === _editingEventId ? updated : e));
    renderPlanning();
    closeModal('modalEvent');
    resetEventModal();
    toast('Événement modifié ✓');
  } else {
    toast('Erreur: ' + error.message);
  }
}

function resetEventModal() {
  _editingEventId = null;
  document.querySelector('#modalEvent .modal-title').textContent = 'Ajouter un événement';
  document.querySelector('#modalEvent .btn-green').textContent = 'Ajouter';
  ['eTitle','eLieu','eNotes','eChores','eOpponent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── Ajouter une voiture (Covoiturage) ──────────────────────────────
async function addCar(eventId) {
  const seats = prompt('Combien de places passagers as-tu de dispo ?');
  if (!seats || isNaN(seats)) return;
  let driverName = profile.full_name;
  const pl = players.find(p => p.profile_id === profile.id);
  if (pl) driverName = pl.name;

  const { data: car, error } = await sb.from('event_cars').insert({
    team_id: profile.team_id, event_id: eventId,
    driver_name: driverName, seats: parseInt(seats), passengers: []
  }).select().single();

  if (car) {
    store.set('cars', [...(store.get('cars') || []), car]);
    renderPlanning();
    toast('Voiture ajoutée ! 🚗');
  }
}

// ── Supprimer un événement ─────────────────────────────────────────
async function deleteEvent(id) {
  if (!confirm('Supprimer cet événement ?')) return;
  await sb.from('events').delete().eq('id', id);
  store.set('events', events.filter(e => e.id !== id));
  renderPlanning();
  toast('Supprimé');
}
