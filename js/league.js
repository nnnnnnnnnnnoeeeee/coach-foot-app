/**
 * league.js — Championnat & Tournoi
 *
 * Onglets : Classement | Phases | Calendrier
 */

let _leagueTab = 'classement';

function renderLeague() {
  const teams   = store.get('league_teams')   || [];
  const matches = store.get('league_matches') || [];

  const tabsHtml = `
    <div class="tournament-tabs">
      <button class="tournament-tab ${_leagueTab==='classement'?'active':''}" onclick="_leagueTab='classement';renderLeague()">Classement</button>
      <button class="tournament-tab ${_leagueTab==='phases'    ?'active':''}" onclick="_leagueTab='phases';renderLeague()">Phases</button>
      <button class="tournament-tab ${_leagueTab==='calendrier'?'active':''}" onclick="_leagueTab='calendrier';renderLeague()">Calendrier</button>
    </div>`;

  let content = '';

  if (_leagueTab === 'classement') {
    content = renderLeagueStandings(teams, matches);
  } else if (_leagueTab === 'phases') {
    content = renderLeaguePhases(teams, matches);
  } else {
    content = renderLeagueCalendar(teams, matches);
  }

  document.getElementById('leagueContent').innerHTML = tabsHtml + content;
}

// ── Classement général ─────────────────────────────────────────────
function renderLeagueStandings(teams, matches) {
  const stats = {};
  teams.forEach(t => {
    stats[t.id] = { id: t.id, name: t.name, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  });

  matches.filter(m => m.status === 'played').forEach(m => {
    const h = stats[m.home_team_id], a = stats[m.away_team_id];
    if (!h || !a) return;
    h.p++; a.p++;
    h.gf += m.score_home; h.ga += m.score_away;
    a.gf += m.score_away; a.ga += m.score_home;
    if (m.score_home > m.score_away)      { h.pts += 3; h.w++; a.l++; }
    else if (m.score_home < m.score_away) { a.pts += 3; a.w++; h.l++; }
    else                                  { h.pts++; a.pts++; h.d++; a.d++; }
  });

  const leaderboard = Object.values(stats)
    .map(t => ({ ...t, gd: t.gf - t.ga }))
    .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf);

  if (!leaderboard.length) return `<div class="card" style="text-align:center;color:var(--muted)">Aucune équipe inscrite.</div>`;

  const medals = ['🥇','🥈','🥉'];
  return `
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
        <div class="section-label" style="margin:0">🏆 Classement Général</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;text-align:center;font-size:13px">
          <thead>
            <tr style="color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">
              <th style="padding:10px;text-align:left">Équipe</th>
              <th style="padding:10px">Pts</th><th style="padding:10px">J</th>
              <th style="padding:10px">V</th><th style="padding:10px">N</th>
              <th style="padding:10px">D</th><th style="padding:10px">Diff</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map((t, i) => {
              const isMe = t.id === profile.team_id;
              return `<tr style="background:${isMe?'rgba(22,163,74,.08)':'transparent'};font-weight:${isMe?'bold':'normal'};border-top:1px solid var(--border)">
                <td style="padding:12px 10px;text-align:left;white-space:nowrap">
                  <span style="color:var(--muted);margin-right:8px">${medals[i] || i+1}</span>${t.name}
                </td>
                <td style="padding:12px 10px;font-weight:700;color:var(--g)">${t.pts}</td>
                <td style="padding:12px 10px;color:var(--muted)">${t.p}</td>
                <td style="padding:12px 10px;color:var(--g)">${t.w}</td>
                <td style="padding:12px 10px;color:var(--amber)">${t.d}</td>
                <td style="padding:12px 10px;color:var(--red)">${t.l}</td>
                <td style="padding:12px 10px;color:var(--muted)">${t.gd > 0 ? '+'+t.gd : t.gd}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Phases du tournoi (groupes + élimination) ─────────────────────
function renderLeaguePhases(teams, matches) {
  const groupMatches    = matches.filter(m => m.phase === 'group');
  const knockoutMatches = matches.filter(m => ['qf','sf','final'].includes(m.phase));
  const leagueMatches   = matches.filter(m => !m.phase || m.phase === 'league');

  let html = '';

  // ── Phase de groupes ──
  if (groupMatches.length) {
    const groups = [...new Set(groupMatches.map(m => m.group_name).filter(Boolean))].sort();
    html += `<div class="section-label">Phase de groupes</div>`;
    groups.forEach(g => {
      const gMatches = groupMatches.filter(m => m.group_name === g);
      // Classement du groupe
      const gStats = {};
      const gTeamIds = [...new Set([...gMatches.map(m => m.home_team_id), ...gMatches.map(m => m.away_team_id)])];
      gTeamIds.forEach(id => {
        const t = teams.find(t => t.id === id);
        gStats[id] = { name: t?.name || 'Inconnu', pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      });
      gMatches.filter(m => m.status === 'played').forEach(m => {
        const h = gStats[m.home_team_id], a = gStats[m.away_team_id];
        if (!h || !a) return;
        h.p++; a.p++;
        h.gf += m.score_home; h.ga += m.score_away;
        a.gf += m.score_away; a.ga += m.score_home;
        if (m.score_home > m.score_away)      { h.pts += 3; h.w++; a.l++; }
        else if (m.score_home < m.score_away) { a.pts += 3; a.w++; h.l++; }
        else                                  { h.pts++; a.pts++; h.d++; a.d++; }
      });
      const sorted = Object.values(gStats)
        .map(t => ({ ...t, gd: t.gf - t.ga }))
        .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd - a.gd);

      html += `<div class="group-section">
        <div class="group-label">Groupe ${g}</div>
        <div class="card" style="padding:0;overflow:hidden;margin-bottom:12px">
          <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center">
            <thead><tr style="color:var(--muted);font-size:10px;text-transform:uppercase;border-bottom:1px solid var(--border)">
              <th style="padding:8px;text-align:left">Équipe</th>
              <th style="padding:8px">Pts</th><th style="padding:8px">J</th><th style="padding:8px">Diff</th>
            </tr></thead>
            <tbody>
              ${sorted.map((t, i) => {
                const isMe = gTeamIds[i] === profile.team_id;
                return `<tr style="background:${isMe?'rgba(22,163,74,.08)':'transparent'};border-top:1px solid var(--border)">
                  <td style="padding:8px;text-align:left;font-weight:${isMe?'bold':'normal'}">${i===0?'🥇':i===1?'🥈':''} ${t.name}</td>
                  <td style="padding:8px;font-weight:700;color:var(--g)">${t.pts}</td>
                  <td style="padding:8px;color:var(--muted)">${t.p}</td>
                  <td style="padding:8px;color:var(--muted)">${t.gd > 0 ? '+'+t.gd : t.gd}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${gMatches.slice(0, 3).map(m => renderMatchCard(m, teams)).join('')}
      </div>`;
    });
  }

  // ── Phase éliminatoire ──
  if (knockoutMatches.length) {
    html += `<div class="section-label">Phase éliminatoire</div>`;
    const rounds = [
      { key: 'qf',    label: 'Quarts de finale' },
      { key: 'sf',    label: 'Demi-finales' },
      { key: 'final', label: 'Finale' },
    ];
    rounds.forEach(({ key, label }) => {
      const rMatches = knockoutMatches.filter(m => m.phase === key);
      if (!rMatches.length) return;
      html += `<div class="bracket-round-label">${label}</div>`;
      html += rMatches.map(m => renderMatchCard(m, teams)).join('');
    });
  }

  // ── Ligue classique si aucune phase spéciale ──
  if (!groupMatches.length && !knockoutMatches.length) {
    if (leagueMatches.length) {
      html += `<div class="section-label">Matchs de ligue</div>`;
      html += leagueMatches.slice(0, 5).map(m => renderMatchCard(m, teams)).join('');
    } else {
      html += `<div class="card" style="text-align:center;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:8px">🏆</div>
        <div>Aucune phase de tournoi configurée.</div>
        <div style="font-size:12px;margin-top:6px">Crée un match de ligue depuis le Planning et choisis la phase correspondante.</div>
      </div>`;
    }
  }

  return html;
}

// ── Calendrier complet ─────────────────────────────────────────────
function renderLeagueCalendar(teams, matches) {
  if (!matches.length) return `<div class="card" style="text-align:center;color:var(--muted)">Aucun match répertorié.</div>`;
  return `<div style="display:flex;flex-direction:column;gap:12px">` +
    matches.map(m => renderMatchCard(m, teams)).join('') +
    `</div>`;
}

// ── Carte d'un match ───────────────────────────────────────────────
function renderMatchCard(m, teams) {
  const hName = teams.find(t => t.id === m.home_team_id)?.name || 'Équipe ?';
  const aName = teams.find(t => t.id === m.away_team_id)?.name || 'Équipe ?';
  const isPlayed = m.status === 'played';

  const phaseBadge = {
    group: `<span class="phase-badge phase-group">Groupe ${m.group_name || ''}</span>`,
    qf:    `<span class="phase-badge phase-qf">Quart de finale</span>`,
    sf:    `<span class="phase-badge phase-sf">Demi-finale</span>`,
    final: `<span class="phase-badge phase-final">Finale</span>`,
  }[m.phase] || '';

  const canScore = isCoach() && !isPlayed &&
    (m.home_team_id === profile.team_id || m.away_team_id === profile.team_id);

  return `
    <div class="result-card">
      <div style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:8px">
        📅 ${fmtDate(m.match_date)} ${m.match_time ? '· '+m.match_time.slice(0,5) : ''}
        ${phaseBadge}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1;text-align:right;font-weight:600;font-family:'Syne',sans-serif;font-size:14px">${hName}</div>
        <div style="width:80px;text-align:center">
          ${isPlayed
            ? `<div style="font-size:22px;font-weight:700">${m.score_home} – ${m.score_away}</div>`
            : `<div style="font-size:11px;padding:4px 8px;background:var(--bg);border-radius:12px;color:var(--muted)">VS</div>`}
        </div>
        <div style="flex:1;text-align:left;font-weight:600;font-family:'Syne',sans-serif;font-size:14px">${aName}</div>
      </div>
      ${canScore ? `<button class="btn btn-sm btn-outline" style="margin-top:10px;width:100%" onclick="openLeagueResultModal('${m.id}')">Saisir le score</button>` : ''}
    </div>`;
}

// ── Saisie résultat ligue ──────────────────────────────────────────
function openLeagueResultModal(matchId) {
  document.getElementById('lrMatchId').value = matchId;
  const m = store.get('league_matches').find(m => m.id === matchId);
  const teams = store.get('league_teams');
  document.getElementById('lrLabelHome').innerText = 'Buts ' + (teams.find(t => t.id === m.home_team_id)?.name || 'Domicile');
  document.getElementById('lrLabelAway').innerText = 'Buts ' + (teams.find(t => t.id === m.away_team_id)?.name || 'Extérieur');
  openModal('modalLeagueResult');
}

async function saveLeagueResult() {
  const matchId = document.getElementById('lrMatchId').value;
  const sHome   = document.getElementById('lrHome').value;
  const sAway   = document.getElementById('lrAway').value;
  if (sHome === '' || sAway === '') { toast('Saisis les deux scores !'); return; }

  const { data: updated, error } = await sb.from('league_matches')
    .update({ score_home: parseInt(sHome), score_away: parseInt(sAway), status: 'played' })
    .eq('id', matchId).select().single();

  if (updated) {
    store.set('league_matches', store.get('league_matches').map(m => m.id === matchId ? updated : m));
    renderLeague();
    closeModal('modalLeagueResult');
    toast('Score validé ! 🏆');
  } else {
    toast('Erreur: ' + (error?.message || 'inconnue'));
  }
}
