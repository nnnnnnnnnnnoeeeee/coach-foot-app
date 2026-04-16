/**
 * messages.js — Messages et convocations
 *
 * Gère :
 * - La génération automatique de textes de convocation
 * - L'affichage des messages envoyés
 * - La copie d'un message dans le presse-papiers
 * - La page d'accueil du joueur (prochain match + dernier message)
 */

// ── Générer et sauvegarder une convocation ─────────────────────────
async function genAndSaveMessage() {
  // Récupérer les données du formulaire
  const adversaire = document.getElementById('mAdv').value.trim()  || 'Adversaire';
  const date       = document.getElementById('mDate').value;
  const kickoff    = document.getElementById('mKO').value;
  const rdv        = document.getElementById('mRDV').value         || 'À confirmer';
  const lieu       = document.getElementById('mLieu').value         || 'À confirmer';
  const extra      = document.getElementById('mMsg').value.trim();

  // Formater la date en français
  const dateFormatee = date
    ? new Date(date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'À définir';

  // Liste des joueurs disponibles
  const convoqués = players.filter(p => p.status === 'dispo').map(p => p.name).join(', ');

  // Construire le texte du message
  const body = `⚽ CONVOCATION — Match vs ${adversaire}\n\n` +
    `📅 ${dateFormatee}\n` +
    `⏰ Coup d'envoi : ${kickoff}\n` +
    `🕐 RDV au stade : ${rdv}\n` +
    `📍 ${lieu}\n\n` +
    `Joueurs convoqués :\n${convoqués || 'À définir'}\n` +
    (extra ? `\n💬 ${extra}\n` : '') +
    `\nMerci de confirmer votre présence !\n— Le Coach`;

  const { data: msg } = await sb.from('messages').insert({
    title:   `Convocation vs ${adversaire}`,
    body,
    team_id: profile.team_id
  }).select().single();

  if (msg) {
    messages.unshift(msg); // ajouter en tête de liste
    renderMessages();
    closeModal('modalMessage');
    toast('Convocation générée ✓');
  }
}

// ── Afficher tous les messages ─────────────────────────────────────
function renderMessages() {
  if (!messages.length) {
    document.getElementById('messagesList').innerHTML = `
      <div class="empty"><div class="empty-icon">💬</div><div class="empty-text">Aucun message envoyé</div></div>`;
    return;
  }

  document.getElementById('messagesList').innerHTML = messages.map((m, i) => `
    <div class="msg-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:600">${m.title}</div>
        <button class="copy-btn" id="copy_${i}" onclick="copyMsg(${i})">Copier</button>
      </div>
      <div class="msg-body">${m.body}</div>
    </div>`).join('');
}

// ── Copier un message dans le presse-papiers ───────────────────────
function copyMsg(index) {
  navigator.clipboard && navigator.clipboard.writeText(messages[index].body);
  const btn = document.getElementById('copy_' + index);
  btn.textContent = '✓ Copié'; btn.classList.add('copied');
  setTimeout(() => { btn.textContent = 'Copier'; btn.classList.remove('copied'); }, 2000);
}

// ── Page d'accueil du joueur ───────────────────────────────────────
async function renderPlayerHome() {
  const today = new Date().toISOString().slice(0, 10);

  // Trouver le prochain match
  const nextMatch = events
    .filter(e => e.type === 'match' && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  const lastMessage = messages[0];

  document.getElementById('playerHome').innerHTML = `
    ${nextMatch ? `
    <div class="next-match-card">
      <div class="nmc-label">Prochain match</div>
      <div class="nmc-title">${nextMatch.title}</div>
      <div class="nmc-meta">📅 ${fmtDate(nextMatch.event_date, nextMatch.event_time)}</div>
      <div class="nmc-meta" style="margin-top:3px">📍 ${nextMatch.location || 'Lieu à confirmer'}</div>
      <div style="margin-top:14px">
        <div style="font-size:12px;opacity:.8;margin-bottom:8px">Ta disponibilité :</div>
        ${renderAvailBtns(nextMatch.id)}
      </div>
    </div>` : `
    <div class="card" style="text-align:center;padding:20px;color:var(--muted)">Aucun match prévu 🏖</div>`}

    ${lastMessage ? `
    <div class="msg-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:600">Dernier message du coach</div>
        <button class="copy-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText(messages[0].body);toast('Copié ✓')">Copier</button>
      </div>
      <div class="msg-body">${lastMessage.body}</div>
    </div>` : ''}`;

  // Charger les disponibilités si un match est affiché
  if (nextMatch) loadMyAvailabilities();
}
