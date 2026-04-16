/**
 * auth.js — Authentification utilisateur
 *
 * Gère :
 * - La connexion (login)
 * - L'inscription (signup)
 * - La déconnexion (logout)
 * - La réinitialisation de mot de passe (forgot password)
 */

// ── Onglets Connexion / Inscription ────────────────────────────────
function switchAuthTab(tab) {
  document.getElementById('loginForm').style.display   = tab === 'login'  ? '' : 'none';
  document.getElementById('signupForm').style.display  = tab === 'signup' ? '' : 'none';
  document.getElementById('forgotForm').style.display  = 'none';
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active',
      (tab === 'login' && i === 0) || (tab === 'signup' && i === 1)
    )
  );
  document.getElementById('authError').classList.remove('show');
}

// ── Sélecteur de rôle lors de l'inscription ────────────────────────
function selectRole(role) {
  selectedRole = role;
  document.getElementById('roleCoach').classList.toggle('active', role === 'coach');
  document.getElementById('rolePlayer').classList.toggle('active', role === 'player');
  // Afficher le champ "poste" seulement pour les joueurs
  document.getElementById('posField').style.display = role === 'player' ? '' : 'none';
}

function showAuthError(message) {
  const el = document.getElementById('authError');
  el.textContent = message;
  el.classList.add('show');
}

// ── Connexion ──────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pwd   = document.getElementById('loginPwd').value;
  if (!email || !pwd) { showAuthError('Remplis tous les champs'); return; }

  const btn = document.querySelector('#loginForm .btn-primary');
  btn.disabled = true; btn.textContent = 'Connexion…';

  const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
  btn.disabled = false; btn.textContent = 'Se connecter';

  if (error) showAuthError('Email ou mot de passe incorrect');
}

// ── Inscription ────────────────────────────────────────────────────
async function doSignup() {
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pwd   = document.getElementById('signupPwd').value;

  if (!name || !email || !pwd) { showAuthError('Remplis tous les champs'); return; }
  if (pwd.length < 6) { showAuthError('Mot de passe trop court (min. 6 caractères)'); return; }

  const btn = document.querySelector('#signupForm .btn-primary');
  btn.disabled = true; btn.textContent = 'Création…';

  // Données sauvegardées dans le profil utilisateur
  const meta = { full_name: name, role: selectedRole };
  if (selectedRole === 'player') meta.position = document.getElementById('signupPos').value;

  const { error } = await sb.auth.signUp({ email, password: pwd, options: { data: meta } });
  btn.disabled = false; btn.textContent = 'Créer mon compte';

  if (error) showAuthError(error.message);
  else { showAuthError(''); toast('Compte créé ! Vérifie tes emails.'); }
}

// ── Déconnexion ────────────────────────────────────────────────────
async function doLogout() {
  await sb.auth.signOut();
  // Réinitialiser toutes les données
  user = null; profile = null; currentTeam = null;
  players = []; events = []; messages = []; results = [];
  // Retourner à l'écran de connexion
  document.getElementById('app').classList.remove('show');
  document.getElementById('teamSetupWrap').style.display = 'none';
  document.getElementById('changePasswordWrap').style.display = 'none';
  document.getElementById('authWrap').style.display = 'flex';
  switchAuthTab('login');
}

// ── Mot de passe oublié ────────────────────────────────────────────
function showForgotPassword() {
  document.getElementById('loginForm').style.display  = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = '';
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('authError').classList.remove('show');
  document.getElementById('resetSuccessMsg').style.display = 'none';
  document.getElementById('resetErrorMsg').classList.remove('show');
}

async function sendResetEmail() {
  const email  = document.getElementById('resetEmail').value.trim();
  const errEl  = document.getElementById('resetErrorMsg');
  const okEl   = document.getElementById('resetSuccessMsg');

  if (!email) { errEl.textContent = 'Entre ton adresse email'; errEl.classList.add('show'); return; }

  const btn = document.querySelector('#forgotForm .btn-primary');
  btn.disabled = true; btn.textContent = 'Envoi…';

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://nnnnnnnnnnnoeeeee.github.io/coach-foot-app/'
  });

  btn.disabled = false; btn.textContent = 'Envoyer le lien →';

  if (error) {
    errEl.textContent = error.message; errEl.classList.add('show');
  } else {
    errEl.classList.remove('show');
    okEl.textContent = '📧 Email envoyé ! Vérifie ta boîte mail et clique sur le lien.';
    okEl.style.display = 'block';
    btn.disabled = true; // empêche d'envoyer plusieurs fois
  }
}

// ── Changement de mot de passe (après clic sur le lien reçu par email) ──
function showChangePasswordScreen() {
  document.getElementById('authWrap').style.display      = 'none';
  document.getElementById('teamSetupWrap').style.display = 'none';
  document.getElementById('app').classList.remove('show');
  document.getElementById('changePasswordWrap').style.display = 'block';
  document.getElementById('changePwdError').classList.remove('show');
  document.getElementById('newPwd').value     = '';
  document.getElementById('confirmPwd').value = '';
}

async function changePassword() {
  const pwd     = document.getElementById('newPwd').value;
  const confirm = document.getElementById('confirmPwd').value;
  const errEl   = document.getElementById('changePwdError');

  if (pwd.length < 6) { errEl.textContent = 'Minimum 6 caractères'; errEl.classList.add('show'); return; }
  if (pwd !== confirm) { errEl.textContent = 'Les mots de passe ne correspondent pas'; errEl.classList.add('show'); return; }

  const btn = document.querySelector('#changePasswordWrap .btn-primary');
  btn.disabled = true; btn.textContent = 'Modification…';

  const { error } = await sb.auth.updateUser({ password: pwd });
  btn.disabled = false; btn.textContent = 'Changer le mot de passe';

  if (error) {
    errEl.textContent = error.message; errEl.classList.add('show');
  } else {
    document.getElementById('changePasswordWrap').style.display = 'none';
    toast('🔒 Mot de passe modifié avec succès !', 3000);
    // Recharger la session et redémarrer l'app
    const { data } = await sb.auth.getSession();
    if (data.session) await boot(data.session.user);
    else { document.getElementById('authWrap').style.display = 'flex'; switchAuthTab('login'); }
  }
}
