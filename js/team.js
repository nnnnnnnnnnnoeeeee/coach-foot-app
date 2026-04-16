/**
 * team.js — Gestion des équipes
 *
 * Gère :
 * - L'écran de création d'équipe (coach)
 * - L'écran pour rejoindre une équipe avec un code (joueur)
 * - La création / la jonction en base de données
 */

// ── Afficher le bon écran selon le rôle ───────────────────────────
function showSetupScreen() {
  document.getElementById('authWrap').style.display = 'none';
  document.getElementById('app').classList.remove('show');
  const wrap = document.getElementById('teamSetupWrap');
  wrap.style.display = 'block';
  if (isCoach()) renderCreateTeamScreen();
  else renderJoinTeamScreen();
}

// ── Écran : Créer une équipe (coach) ──────────────────────────────
function renderCreateTeamScreen() {
  const code = genInviteCode(); // code d'invitation généré aléatoirement
  document.getElementById('teamSetupWrap').innerHTML = `
    <div class="setup-wrap">
      <div class="setup-card">
        <div class="setup-emoji">🎯</div>
        <div class="setup-title">Crée ton équipe</div>
        <div class="setup-sub">Choisis un nom — tes joueurs te rejoindront avec le code</div>
        <div class="field">
          <label>Nom de l'équipe</label>
          <input type="text" id="teamNameInput" placeholder="FC Les Lions" autofocus/>
        </div>
        <div class="code-preview-box">
          <div class="code-preview-label">Code d'invitation</div>
          <div class="code-preview-text">${code}</div>
          <div class="code-preview-hint">Tes joueurs utilisent ce code pour te rejoindre</div>
        </div>
        <input type="hidden" id="pendingCode" value="${code}"/>
        <div id="setupError" class="auth-error"></div>
        <button class="btn-primary" onclick="createTeam()">Créer l'équipe →</button>
        <div style="text-align:center;margin-top:14px">
          <span style="font-size:13px;color:var(--muted)">Tu es joueur ? </span>
          <button onclick="renderJoinTeamScreen()" style="font-size:13px;color:var(--g);background:none;border:none;cursor:pointer;font-weight:500">Rejoindre une équipe →</button>
        </div>
      </div>
    </div>`;
}

// ── Écran : Rejoindre une équipe (joueur) ─────────────────────────
function renderJoinTeamScreen() {
  document.getElementById('teamSetupWrap').innerHTML = `
    <div class="setup-wrap">
      <div class="setup-card">
        <div class="setup-emoji">🔑</div>
        <div class="setup-title">Rejoins ton équipe</div>
        <div class="setup-sub">Demande le code d'invitation à ton coach</div>
        <div class="field" style="margin-bottom:8px">
          <label>Code d'invitation</label>
          <input class="code-input-field" type="text" id="teamCodeInput" placeholder="LION7X" maxlength="6" autocomplete="off"/>
        </div>
        <div id="setupError" class="auth-error"></div>
        <button class="btn-primary" onclick="joinTeam()">Rejoindre l'équipe →</button>
        <div style="text-align:center;margin-top:14px">
          <span style="font-size:13px;color:var(--muted)">Tu es coach ? </span>
          <button onclick="renderCreateTeamScreen()" style="font-size:13px;color:var(--g);background:none;border:none;cursor:pointer;font-weight:500">Créer une équipe →</button>
        </div>
      </div>
    </div>`;
  // Forcer la saisie en majuscules
  document.getElementById('teamCodeInput').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
  });
}

// ── Créer l'équipe en base de données ─────────────────────────────
async function createTeam() {
  const name   = document.getElementById('teamNameInput').value.trim();
  const code   = document.getElementById('pendingCode').value;
  const errEl  = document.getElementById('setupError');
  if (!name) { errEl.textContent = "Entre le nom de ton équipe"; errEl.classList.add('show'); return; }

  const btn = document.querySelector('#teamSetupWrap .btn-primary');
  btn.disabled = true; btn.textContent = 'Création…';

  const { data: team, error } = await sb
    .from('teams')
    .insert({ name, coach_id: user.id, invite_code: code })
    .select()
    .single();

  if (error) {
    errEl.textContent = 'Erreur : ' + error.message; errEl.classList.add('show');
    btn.disabled = false; btn.textContent = "Créer l'équipe →"; return;
  }

  // Associer le coach à cette équipe dans son profil
  await sb.from('profiles').update({ team_id: team.id }).eq('id', user.id);
  profile.team_id = team.id;
  currentTeam = team;

  document.getElementById('teamSetupWrap').style.display = 'none';
  await initApp();
}

// ── Rejoindre une équipe avec le code d'invitation ─────────────────
async function joinTeam() {
  const code  = document.getElementById('teamCodeInput').value.trim().toUpperCase();
  const errEl = document.getElementById('setupError');
  if (code.length < 4) { errEl.textContent = "Entre le code d'invitation"; errEl.classList.add('show'); return; }

  const btn = document.querySelector('#teamSetupWrap .btn-primary');
  btn.disabled = true; btn.textContent = 'Recherche…';

  const { data: team, error } = await sb
    .from('teams')
    .select('*')
    .eq('invite_code', code)
    .single();

  if (error || !team) {
    errEl.textContent = 'Code invalide. Vérifie avec ton coach.'; errEl.classList.add('show');
    btn.disabled = false; btn.textContent = "Rejoindre l'équipe →"; return;
  }

  // Associer le joueur à cette équipe
  await sb.from('profiles').update({ team_id: team.id }).eq('id', user.id);
  profile.team_id = team.id;
  currentTeam = team;

  document.getElementById('teamSetupWrap').style.display = 'none';
  await initApp();
}
