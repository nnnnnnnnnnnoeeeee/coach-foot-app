/**
 * fines.js — La Caisse Noire (Module des amendes)
 *
 * Gère :
 * - L'affichage du classement des amendes (pires payeurs)
 * - L'ajout d'une amende par le coach
 * - Le total de la cagnotte
 */

function renderFines() {
  const fines = store.get('fines') || [];
  
  // Calculer le total de chaque joueur
  const playersMap = {};
  fines.forEach(f => {
    if (!playersMap[f.player_id]) {
        const p = players.find(player => player.id === f.player_id);
        playersMap[f.player_id] = { name: p ? p.name : 'Joueur inconnu', total: 0, list: [] };
    }
    playersMap[f.player_id].total += parseFloat(f.amount);
    playersMap[f.player_id].list.push(f);
  });

  // Trier par montant (les pires en haut)
  const leaderboard = Object.values(playersMap).sort((a,b) => b.total - a.total);
  const totalCagnotte = leaderboard.reduce((sum, p) => sum + p.total, 0);

  let html = `
    <div style="background:var(--red); color:white; border-radius:12px; padding:20px; text-align:center; margin-bottom:20px;">
        <div style="font-size:12px; opacity:0.8; text-transform:uppercase; letter-spacing:1px">Cagnotte de l'Équipe</div>
        <div style="font-family:'Syne', sans-serif; font-size:36px; font-weight:700">${totalCagnotte} €</div>
    </div>
  `;

  if (isCoach()) {
    html += `<button class="btn btn-outline" style="width:100%; margin-bottom:16px" onclick="openAddFineModal()">💰 Infliger une amende</button>`;
  }

  html += `<div class="section-label">Pires Payeurs</div>`;

  if (leaderboard.length === 0) {
      html += `<div class="card" style="text-align:center; color:var(--muted)">Aucune amende ! Quelle équipe disciplinée...</div>`;
  } else {
      leaderboard.forEach((p, index) => {
          let badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
          html += `
            <div class="result-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-size:20px; width:24px; text-align:center">${badge}</div>
                    <div>
                        <div style="font-weight:600; font-family:'Syne', sans-serif">${p.name}</div>
                        <div style="font-size:12px; color:var(--muted)">${p.list.length} sanction(s)</div>
                    </div>
                </div>
                <div style="font-size:20px; font-weight:700; color:var(--red)">${p.total} €</div>
            </div>
          `;
      });
  }

  // Injecter dans un block parent (qui sera soit le Dashboard du joueur, soit le menu Settings du coach)
  // Plutôt que d'écraser la page, on va ouvrir ça comme une page "pleine", on créera l'ID page-fines.
  document.getElementById('finesContent').innerHTML = html;
}

// ── OUVIR LE MODAL D'AJOUT D'AMENDE (Coach uniquement) ───────────
function openAddFineModal() {
    const pList = players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('fPlayer').innerHTML = pList;
    openModal('modalFine');
}

// ── SAUVEGARDER L'AMENDE ─────────────────────────────────────────
async function saveFine() {
    const playerId = document.getElementById('fPlayer').value;
    const amount = document.getElementById('fAmount').value;
    const reason = document.getElementById('fReason').value.trim() || 'Raison non précisée';

    if (!playerId || !amount) { toast('Sélectionne un joueur et un montant.'); return; }

    const { data: fine, error } = await sb.from('fines').insert({
        team_id: profile.team_id,
        player_id: playerId,
        amount: parseFloat(amount),
        reason: reason
    }).select().single();

    if (fine) {
        const fList = store.get('fines') || [];
        store.set('fines', [fine, ...fList]);
        renderFines();
        closeModal('modalFine');
        toast('Amende validée 💸');
    } else {
        toast('Erreur, vérifie tes accès coach.');
    }
}
