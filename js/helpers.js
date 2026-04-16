/**
 * helpers.js — Fonctions utilitaires
 *
 * Petites fonctions réutilisées partout dans l'application.
 */

/** Génère les initiales d'un nom (ex: "Lucas Martin" → "LM") */
function initials(name) {
  return (name || '?')
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

/** Formate une date + heure en français (ex: "sam. 20 avril — 15:00") */
function fmtDate(date, time) {
  const dt = new Date(date + 'T' + (time || '12:00'));
  return dt.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long'
  }) + (time ? ' — ' + time.slice(0, 5) : '');
}

/** Génère un code d'invitation aléatoire à 6 caractères (ex: "LION7X") */
function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Gérer les "Toast" (notifications en bas d'écran) ───────────────
function toast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── Exporter un événement au format iCal (.ics) ────────────────────
function exportICal(eventId) {
    const ev = store.get('events').find(e => e.id === eventId);
    if (!ev) return;

    // Formater la date en YYYYMMDDTHHMMSSZ
    const d = new Date(ev.event_date + 'T' + ev.event_time);
    const formatDateObj = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const start = formatDateObj(d);
    // Supposons une durée de 2 heures
    d.setHours(d.getHours() + 2);
    const end = formatDateObj(d);

    const title = ev.title + (ev.opponent ? ' vs ' + ev.opponent : '');
    
    // Contenu du fichier .ics
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CoachFoot//App//FR
BEGIN:VEVENT
UID:${ev.id}@coachfoot
DTSTAMP:${formatDateObj(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:${title}
LOCATION:${ev.location || 'À définir'}
DESCRIPTION:${ev.notes || ''}
END:VEVENT
END:VCALENDAR`;

    // Lancer le téléchargement
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Calendrier généré 🗓️');
}

/** Ouvre un modal (fenêtre pop-up) */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

/** Ferme un modal */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

/** Vérifie si l'utilisateur connecté est un coach */
function isCoach() {
  return profile && profile.role === 'coach';
}
