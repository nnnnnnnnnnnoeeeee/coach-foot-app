/**
 * planning.js — Planning des événements
 *
 * Gère :
 * - L'affichage des matchs et entraînements
 * - L'ajout et la suppression d'événements (coach)
 * - Les réponses de disponibilité des joueurs (présent/absent/incertain)
 */

// ── Afficher la liste des événements ──────────────────────────────
function renderPlanning() {
  const today = new Date().toISOString().slice(0, 10);

  // Séparer : à venir et passés
  const upcoming = events.filter(e => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past      = events.filter(e => e.event_date <  today).sort((a, b) => b.event_date.localeCompare(a.event_date));
  const all = [...upcoming, ...past];

  if (!all.length) {
    document.getElementById('eventsList').innerHTML = `
      <div class="empty"><div class="empty-icon">📅</div><div class="empty-text">Aucun événement prévu</div></div>`;
    return;
  }

  document.getElementById('eventsList').innerHTML = all.map(e => {
    // Calcul des voitures pour cet événement
    const eventCars = (cars || []).filter(c => c.event_id === e.id);
    const carHtml = eventCars.length 
      ? `<div style="margin-top:10px; padding:8px; background:var(--bg); border-radius:8px; font-size:12px;">
           <div style="font-weight:600; margin-bottom:4px">🚗 Covoiturage</div>
           ${eventCars.map(c => `• ${c.driver_name} (${(c.passengers||[]).length}/${c.seats} places)`).join('<br>')}
         </div>` 
      : '';

    return `
    <div class="event-card ec-${e.type}">
      <div class="event-header">
        <div>
          <span class="badge b-${e.type}">${e.type === 'match' ? 'Match' : 'Entraînement'}</span>
          <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:600;margin-top:5px">${e.title}</div>
          ${e.opponent ? `<div class="event-meta">vs ${e.opponent}</div>` : ''}
          <div class="event-meta">📅 ${fmtDate(e.event_date, e.event_time)} · 📍 ${e.location || 'À définir'}</div>
          ${e.chores ? `<div class="event-meta" style="color:var(--amber); font-weight:500">🧹 Corvées : ${e.chores}</div>` : ''}
          ${e.notes ? `<div class="event-meta">💬 ${e.notes}</div>` : ''}
        </div>
      </div>
      
      ${carHtml}

      <div style="margin-top:12px; display:flex; gap:8px">
        <button class="btn btn-sm btn-outline" style="flex:1" onclick="exportICal('${e.id}')">🗓️ Ajouter au calendrier</button>
        <button class="btn btn-sm btn-outline" style="flex:1" onclick="addCar('${e.id}')">🚗 Proposer ma voiture</button>
      </div>

      ${isCoach() && e.type === 'match' && e.event_date < today ? `
      <div class="event-actions" style="margin-top:12px">
        <button class="btn btn-sm btn-outline" onclick="openResultModal('${e.id}')">Saisir résultat</button>
        <button class="btn btn-sm btn-red"     onclick="deleteEvent('${e.id}')">Supprimer</button>
      </div>` : ''}
      ${isCoach() && (e.type !== 'match' || e.event_date >= today) ? `
      <div class="event-actions" style="margin-top:12px">
        <button class="btn btn-sm btn-red" onclick="deleteEvent('${e.id}')">Supprimer l'événement</button>
      </div>` : ''}
      
      ${!isCoach() && e.event_date >= today ? renderAvailBtns(e.id) : ''}
    </div>`;
  }).join('');

  // Charger les disponibilités déjà saisies par le joueur
  if (!isCoach()) loadMyAvailabilities();
}

// ── Boutons de disponibilité pour un événement ────────────────────
function renderAvailBtns(eventId) {
  return `
    <div class="avail-btns" id="avail_${eventId}">
      <button class="avail-btn yes"   onclick="setAvail('${eventId}','confirmed')">✓ Présent</button>
      <button class="avail-btn no"    onclick="setAvail('${eventId}','declined')">✗ Absent</button>
      <button class="avail-btn maybe" onclick="setAvail('${eventId}','pending')">? Incertain</button>
      <button class="avail-btn late"  onclick="setAvail('${eventId}','late')">⏳ Retard</button>
    </div>`;
}

// ── Charger les disponibilités du joueur connecté ─────────────────
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

// ── Enregistrer la disponibilité d'un joueur ──────────────────────
async function setAvail(eventId, status) {
  const { data: myPlayer } = await sb.from('players').select('id').eq('profile_id', user.id).single();
  if (!myPlayer) {
    toast("Ton profil joueur n'est pas encore lié. Demande au coach.");
    return;
  }

  await sb.from('availabilities').upsert(
    { event_id: eventId, player_id: myPlayer.id, status },
    { onConflict: 'event_id,player_id' }
  );

  // Mettre à jour visuellement le bouton sélectionné
  const wrap = document.getElementById('avail_' + eventId);
  wrap.querySelectorAll('.avail-btn').forEach(b => b.classList.remove('active'));
  const map = { confirmed: '.yes', declined: '.no', pending: '.maybe', late: '.late' };
  wrap.querySelector(map[status]).classList.add('active');

  let msg = 'Réponse enregistrée';
  if (status === 'confirmed') msg = 'Présence confirmée ✓';
  else if (status === 'declined') msg = 'Absence signalée';
  else if (status === 'late') msg = 'Retard signalé au coach ⏳';
  toast(msg);
}

// ── Ajouter un événement (formulaire modal) ─────────────────────────
async function saveEvent() {
  const type = document.getElementById('eType').value;
  const isLeague = (type === 'league_match');
  const d = document.getElementById('eDate').value;
  if (!d) { toast('Sélectionne une date'); return; }

  let opponentName = null;
  let opponentId = null;

  if (isLeague) {
      const sel = document.getElementById('eLeagueOpponent');
      opponentName = sel.options[sel.selectedIndex]?.text;
      opponentId = sel.value;
  } else if (type === 'match') {
      opponentName = document.getElementById('eOpponent').value.trim();
  }

  const dataA = {
    title:      document.getElementById('eTitle').value.trim() || 'Match',
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

  // Si c'est un match de ligue, on le pousse dans le championnat et on le crée pour l'adversaire
  if (isLeague && opponentId) {
      // 1. Ajouter l'entrée dans la ligue
      const { data: leagueMatch } = await sb.from('league_matches').insert({
          home_team_id: profile.team_id,
          away_team_id: opponentId,
          match_date: d,
          match_time: document.getElementById('eTime').value || '00:00',
          location: document.getElementById('eLieu').value.trim()
      }).select().single();

      if (leagueMatch) {
          const lList = store.get('league_matches') || [];
          store.set('league_matches', [...lList, leagueMatch]);
      }

      // 2. Créer l'événement miroir pour l'équipe adverse (planification auto)
      const tName = store.get('league_teams').find(t => t.id === profile.team_id)?.name || 'Équipe adverse';
      const dataB = { ...dataA, team_id: opponentId, opponent: tName, notes: 'Ce match a été planifié par ' + tName };
      await sb.from('events').insert(dataB);
  }

  const list = store.get('events') || [];
  store.set('events', [...list, evA]);
  renderPlanning();
  closeModal('modalEvent');
  toast(isLeague ? 'Défi envoyé ! Match de ligue créé ✓' : 'Événement ajouté ✓');
}

// ── Ajouter une voiture (Covoiturage) ──────────────────────────────
async function addCar(eventId) {
    const seats = prompt("Combien de places passagers as-tu de dispo ?");
    if (!seats || isNaN(seats)) return;
    
    // On trouve le nom de l'utilisateur (soit via 'players', soit via 'profiles')
    let driverName = profile.full_name;
    const pl = players.find(p => p.profile_id === profile.id);
    if(pl) driverName = pl.name;

    const { data: car, error } = await sb.from('event_cars').insert({
        team_id: profile.team_id,
        event_id: eventId,
        driver_name: driverName,
        seats: parseInt(seats),
        passengers: []
    }).select().single();

    if (car) {
        const cList = store.get('cars') || [];
        store.set('cars', [...cList, car]);
        renderPlanning();
        toast('Voiture ajoutée ! 🚗');
    }
}

// ── Supprimer un événement ─────────────────────────────────────────
async function deleteEvent(id) {
  if (!confirm('Supprimer cet événement ?')) return;
  await sb.from('events').delete().eq('id', id);
  events = events.filter(e => e.id !== id);
  renderPlanning();
  toast('Supprimé');
}
