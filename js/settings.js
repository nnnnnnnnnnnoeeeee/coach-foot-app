/**
 * settings.js — Page des paramètres
 *
 * Gère :
 * - L'affichage des informations de l'équipe
 * - Le code d'invitation (visible et copiable par le coach)
 * - Le bouton de déconnexion
 */

// ── Afficher la page des paramètres ───────────────────────────────
function renderSettings() {
  if (!isCoach()) return; // seul le coach a accès aux paramètres

  const code = currentTeam?.invite_code || '—';

  document.getElementById('settingsContent').innerHTML = `
    <!-- Code d'invitation mis en avant -->
    <div class="invite-code-card">
      <div class="invite-code-card-label">Code d'invitation de l'équipe</div>
      <div class="invite-code-card-code">${code}</div>
      <div class="invite-code-card-hint">Partage ce code à tes joueurs pour qu'ils rejoignent ton équipe</div>
      <button class="btn-white" onclick="copyInviteCode()">📋 Copier le code</button>
    </div>

    <!-- Informations de l'équipe -->
    <div class="settings-section">
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Équipe</div>
          <div class="settings-row-value">${currentTeam?.name || '—'}</div>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Rôle</div>
          <div class="settings-row-value">Coach 🎯</div>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Joueurs dans l'équipe</div>
          <div class="settings-row-value">${players.length}</div>
        </div>
      </div>
    </div>

    <!-- Section Caisse Noire -->
    <button class="btn btn-outline" style="width:100%; margin-bottom:16px" onclick="switchPage('fines')">💰 Ouvrir la Caisse (Amendes)</button>

    <!-- Déconnexion -->
    <button class="btn btn-red" style="width:100%" onclick="doLogout()">Se déconnecter</button>`;
}

// ── Copier le code d'invitation ────────────────────────────────────
function copyInviteCode() {
  const code = currentTeam?.invite_code || '';
  navigator.clipboard && navigator.clipboard.writeText(code);
  toast('Code copié : ' + code + ' ✓');
}
