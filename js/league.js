/**
 * league.js — Le Championnat Inter-Équipes
 * 
 * Permet d'afficher :
 * 1. Le calendrier global de la ligue
 * 2. Le classement des équipes basé sur les matchs terminés
 */

function renderLeague() {
    const teams = store.get('league_teams') || [];
    const matches = store.get('league_matches') || [];

    // --- 1. CALCUL DU CLASSEMENT ---
    const stats = {};
    teams.forEach(t => {
        stats[t.id] = { id: t.id, name: t.name, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 };
    });

    matches.filter(m => m.status === 'played').forEach(m => {
        const hTeam = stats[m.home_team_id];
        const aTeam = stats[m.away_team_id];

        // Ignorer si les équipes n'existent plus dans la vue
        if (!hTeam || !aTeam) return;

        hTeam.p++; aTeam.p++;
        hTeam.gf += m.score_home; hTeam.ga += m.score_away;
        aTeam.gf += m.score_away; aTeam.ga += m.score_home;
        
        if (m.score_home > m.score_away) {
            hTeam.pts += 3; hTeam.w++; aTeam.l++;
        } else if (m.score_home < m.score_away) {
            aTeam.pts += 3; aTeam.w++; hTeam.l++;
        } else {
            hTeam.pts += 1; aTeam.pts += 1;
            hTeam.d++; aTeam.d++;
        }
    });

    Object.values(stats).forEach(t => t.gd = t.gf - t.ga);

    // Tri : Points, puis Différence de Buts, puis Buts marqués
    const leaderboard = Object.values(stats).sort((a,b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });


    // --- 2. AFFICHAGE DU CLASSEMENT ---
    let html = `
    <div class="card" style="padding:0; overflow:hidden; margin-bottom:24px">
        <div style="background:var(--card-bg); padding:16px;">
            <div class="section-label" style="margin:0">🏆 Classement Général</div>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:center; font-size:13px">
                <thead>
                    <tr style="background:rgba(0,0,0,0.02); color:var(--muted); font-size:11px; text-transform:uppercase">
                        <th style="padding:10px; text-align:left">Équipe</th>
                        <th style="padding:10px">Pts</th>
                        <th style="padding:10px">J</th>
                        <th style="padding:10px">V</th>
                        <th style="padding:10px">N</th>
                        <th style="padding:10px">D</th>
                        <th style="padding:10px">Diff</th>
                    </tr>
                </thead>
                <tbody>
    `;

    leaderboard.forEach((t, i) => {
        const isMyTeam = (t.id === profile.team_id);
        const bg = isMyTeam ? 'rgba(22, 163, 74, 0.1)' : 'transparent';
        const fontWeight = isMyTeam ? 'bold' : 'normal';
        let rankBadge = i + 1;
        if (i === 0) rankBadge = '🥇';
        if (i === 1) rankBadge = '🥈';
        if (i === 2) rankBadge = '🥉';

        html += `
            <tr style="background:${bg}; font-weight:${fontWeight}; border-top:1px solid var(--border)">
                <td style="padding:12px 10px; text-align:left; display:flex; align-items:center; gap:8px">
                    <span style="font-family:'Syne',sans-serif; width:20px; text-align:center; color:var(--muted)">${rankBadge}</span>
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px">${t.name}</span>
                </td>
                <td style="padding:12px 10px; font-weight:bold; color:var(--text)">${t.pts}</td>
                <td style="padding:12px 10px; color:var(--muted)">${t.p}</td>
                <td style="padding:12px 10px; color:var(--g)">${t.w}</td>
                <td style="padding:12px 10px; color:var(--amber)">${t.d}</td>
                <td style="padding:12px 10px; color:var(--red)">${t.l}</td>
                <td style="padding:12px 10px; color:var(--muted)">${t.gd > 0 ? '+'+t.gd : t.gd}</td>
            </tr>
        `;
    });
    html += `</tbody></table></div></div>`;


    // --- 3. AFFICHAGE DU CALENDRIER (LIGUE) ---
    html += `<div class="section-label">Affiches & Résultats</div>`;

    if (matches.length === 0) {
        html += `<div class="card" style="text-align:center; color:var(--muted)">Aucun match répertorié dans la ligue pour le moment.</div>`;
    } else {
        html += `<div style="display:flex; flex-direction:column; gap:12px">`;
        matches.forEach(m => {
            const hTeam = teams.find(t => t.id === m.home_team_id)?.name || 'Équipe inconnue';
            const aTeam = teams.find(t => t.id === m.away_team_id)?.name || 'Équipe inconnue';
            const isPlayed = m.status === 'played';
            
            html += `
            <div class="result-card" style="display:flex; flex-direction:column; gap:12px">
                <div style="font-size:12px; color:var(--muted); text-align:center; text-transform:uppercase; letter-spacing:1px">
                    📅 ${fmtDate(m.match_date)} ${m.match_time ? '· '+m.match_time.slice(0,5) : ''}
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1; text-align:right; font-weight:600; font-family:'Syne',sans-serif">${hTeam}</div>
                    
                    <div style="width:70px; text-align:center;">
                        ${isPlayed 
                            ? `<div style="font-size:24px; font-weight:700">${m.score_home} - ${m.score_away}</div>` 
                            : `<div style="font-size:12px; padding:4px 8px; background:var(--bg); border-radius:12px; color:var(--text)">VS</div>`}
                    </div>
                    
                    <div style="flex:1; text-align:left; font-weight:600; font-family:'Syne',sans-serif">${aTeam}</div>
                </div>

                <!-- Bouton pour saisir le score si je suis un coach impliqué -->
                ${isCoach() && !isPlayed && (m.home_team_id === profile.team_id || m.away_team_id === profile.team_id) ? `
                    <button class="btn btn-sm btn-outline" style="margin-top:8px" onclick="openLeagueResultModal('${m.id}')">Saisir le score</button>
                ` : ''}
            </div>
            `;
        });
        html += `</div>`;
    }

    document.getElementById('leagueContent').innerHTML = html;
}

// ── Saisie d'un résultat de ligue ──────────────────────────────────────
function openLeagueResultModal(matchId) {
    document.getElementById('lrMatchId').value = matchId;
    const match = store.get('league_matches').find(m => m.id === matchId);
    const teams = store.get('league_teams');
    const hTeam = teams.find(t => t.id === match.home_team_id)?.name || 'Home';
    const aTeam = teams.find(t => t.id === match.away_team_id)?.name || 'Away';
    
    document.getElementById('lrLabelHome').innerText = `Buts ${hTeam}`;
    document.getElementById('lrLabelAway').innerText = `Buts ${aTeam}`;
    
    openModal('modalLeagueResult');
}

async function saveLeagueResult() {
    const matchId = document.getElementById('lrMatchId').value;
    const sHome = document.getElementById('lrHome').value;
    const sAway = document.getElementById('lrAway').value;

    if (sHome === '' || sAway === '') { toast('Saisis les deux scores !'); return; }

    const { data: updatedMatch, error } = await sb.from('league_matches')
        .update({ score_home: parseInt(sHome), score_away: parseInt(sAway), status: 'played' })
        .eq('id', matchId)
        .select().single();

    if (updatedMatch) {
        // MAJ dans le store
        let mList = store.get('league_matches') || [];
        mList = mList.map(m => m.id === matchId ? updatedMatch : m);
        store.set('league_matches', mList);

        renderLeague();
        closeModal('modalLeagueResult');
        toast('Score validé ! Le classement est à jour 🏆');
    } else {
        toast('Erreur lors de la sauvegarde.');
    }
}
