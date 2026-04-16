/**
 * compo.js — Composition tactique (terrain interactif et banc)
 *
 * Gère :
 * - L'affichage du terrain avec les joueurs positionnés
 * - Le banc de touche
 * - Le glisser-déposer des joueurs (drag & drop) entre terrain et banc
 * - Le changement de formation (4-3-3, 4-4-2, etc.)
 * - La génération automatique d'une compo
 * - La sauvegarde et l'export en image
 */

let benchPlayers = []; // Joueurs sur le banc (non assignés)

// ── Afficher le terrain et le banc ──────────────────────────────
function renderPitch() {
  const wrap      = document.getElementById('pitchWrap');
  const dotsEl    = document.getElementById('pitchDots');
  const benchEl   = document.getElementById('benchZone');
  const format    = currentCompo.format || 11;
  const positions = FORMAT_SCHEMAS[format][currentCompo.schema] || FORMAT_SCHEMAS[11]['4-3-3'];
  const disponibles = players.filter(p => p.status === 'dispo');

  // Si aucun slot défini, placer automatiquement les joueurs par poste
  if (!currentCompo.slots.length) {
    const gks  = [...disponibles.filter(p => p.position === 'GK')];
    const defs = [...disponibles.filter(p => p.position === 'DEF')];
    const mids = [...disponibles.filter(p => p.position === 'MID')];
    const atts = [...disponibles.filter(p => p.position === 'ATT')];

    currentCompo.slots = positions.map(pos => {
      let player = null;
      if (pos.role === 'GK') player = gks.shift();
      else if (['RB','CB','LB','RCB','LCB'].includes(pos.role))                  player = defs.shift();
      else if (['CM','DM','RM','LM','CAM','RAM','LAM','RWB','LWB'].includes(pos.role)) player = mids.shift();
      else player = atts.shift() || mids.shift() || defs.shift();

      return { role: pos.role, x: pos.x, y: pos.y, playerId: player ? player.id : null };
    });

    // Les joueurs restants vont sur le banc
    benchPlayers = [...gks, ...defs, ...mids, ...atts];
  } else {
    // Calculer qui est sur le banc d'après les slots actuels
    const assignedIds = currentCompo.slots.map(s => s.playerId).filter(id => id);
    benchPlayers = disponibles.filter(p => !assignedIds.includes(p.id));
  }

  // Dessiner les points sur le terrain
  dotsEl.innerHTML = currentCompo.slots.map((slot, i) => {
    const player = players.find(p => p.id === slot.playerId);
    return `
      <div class="pdot" id="pdot_${i}" style="left:${slot.x}%;top:${slot.y}%" data-idx="${i}" data-type="pitch">
        <div class="pdot-circle ${player ? '' : 'empty'}">${player ? initials(player.name) : slot.role}</div>
        <div class="pdot-label">${player ? player.name.split(' ')[0] : ''}</div>
      </div>`;
  }).join('');

  // Dessiner le banc
  if (!benchPlayers.length) {
    benchEl.innerHTML = `<div style="font-size:12px; color:var(--muted); text-align:center; padding:8px;">
      Aucun joueur disponible.<br>
      ${isCoach() ? `<button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="openModal('modalPlayer')">+ Ajouter un joueur</button>` : ''}
    </div>`;
  } else {
    let benchHtml = benchPlayers.map((p, i) => `
      <div class="pdot bench-dot" id="bdot_${i}" style="position:relative; transform:none; cursor:grab" data-idx="${i}" data-type="bench">
        <div class="pdot-circle" style="background:#f1f5f9; color:#475569; border-color:#cbd5e1; box-shadow:none">${initials(p.name)}</div>
        <div class="pdot-label" style="color:var(--text); text-shadow:none">${p.name.split(' ')[0]}</div>
      </div>`).join('');
      
      
    if (isCoach()) {
      benchHtml += `
      <div onclick="openModal('modalPlayer')" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;width:44px;margin:2px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'">
        <div style="width:38px;height:38px;border-radius:50%;border:2px dashed var(--g);background:#f0fdf4;color:var(--g);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:300;margin-bottom:2px;box-shadow:0 2px 5px rgba(0,0,0,.05)">+</div>
        <div style="color:var(--g);font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:0.5px">Nouveau</div>
      </div>`;
    }
    
    benchEl.innerHTML = benchHtml;
  }

  // Drag & drop uniquement pour le coach
  if (isCoach()) setupDrag(wrap, dotsEl, benchEl);

  // Le bouton "sauvegarder" n'est visible que pour le coach
  document.getElementById('saveCompoBtn').style.display = isCoach() ? 'block' : 'none';

  // Afficher le nom du prochain match dans le sous-titre
  const nextMatch = events
    .filter(e => e.type === 'match' && new Date(e.event_date) >= new Date())
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  document.getElementById('compoSub').textContent = nextMatch
    ? `Compo pour : ${nextMatch.title}`
    : 'Glisse les joueurs sur le terrain';
}

// ── Drag & Drop ──────────────────────────────────────────────────
function setupDrag(pitchWrap, dotsEl, benchEl) {
  // Sélectionner tous les points (terrain et banc)
  const allDots = document.querySelectorAll('.pdot');

  allDots.forEach(dot => {
    const startDrag = (e, startX, startY) => {
      e.preventDefault();
      const dotType = dot.dataset.type; // "pitch" ou "bench"
      const idx     = +dot.dataset.idx;
      dot.classList.add('dragging');
      
      // Placer le point en absolu pour le déplacement fluide s'il vient du banc
      if(dotType === 'bench') {
        const rect = dot.getBoundingClientRect();
        dot.style.position = 'fixed';
        dot.style.left = startX + 'px';
        dot.style.top = startY + 'px';
        dot.style.zIndex = 1000;
        dot.style.transform = 'translate(-50%, -50%)';
      }

      let lastX, lastY;

      const onMove = (cx, cy) => {
        lastX = cx; lastY = cy;
        if(dotType === 'bench') {
          dot.style.left = cx + 'px';
          dot.style.top = cy + 'px';
        } else {
          const rect = pitchWrap.getBoundingClientRect();
          const x = Math.max(5, Math.min(95, ((cx - rect.left) / rect.width)  * 100));
          const y = Math.max(5, Math.min(95, ((cy - rect.top)  / rect.height) * 100));
          dot.style.left = x + '%';
          dot.style.top  = y + '%';
        }
      };

      const handleMove = e => { const t = e.touches ? e.touches[0] : e; onMove(t.clientX, t.clientY); };
      
      const handleEnd = () => {
        dot.classList.remove('dragging');
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup',   handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend',  handleEnd);

        // Si on a juste cliqué sans bouger
        if (lastX === undefined || lastY === undefined) {
          renderPitch();
          return;
        }

        // --- Logique métier de l'échange (Swap) ---
        // Vérifier si déposé sur le terrain ou sur un autre joueur
        // Cache temporairement le point en cours de drag
        dot.style.visibility = 'hidden';
        const dropPoint = document.elementFromPoint(lastX, lastY);
        const targetDot = dropPoint ? dropPoint.closest('.pdot') : null;
        dot.style.visibility = ''; // On le réaffiche

        const targetBenchZone = dropPoint ? dropPoint.closest('#benchZone') : null;
        
        // Si on lâche un joueur du terrain dans la zone du banc (mais pas sur un joueur)
        if (!targetDot && dotType === 'pitch' && targetBenchZone) {
             currentCompo.slots[idx].playerId = null;
             renderPitch();
             return;
        }

        if (targetDot && targetDot !== dot) {
           const targetType = targetDot.dataset.type;
           const targetIdx  = +targetDot.dataset.idx;

           if (dotType === 'pitch' && targetType === 'pitch') {
             // Echange Terrain <-> Terrain
             const tempId = currentCompo.slots[idx].playerId;
             currentCompo.slots[idx].playerId = currentCompo.slots[targetIdx].playerId;
             currentCompo.slots[targetIdx].playerId = tempId;
           } 
           else if (dotType === 'bench' && targetType === 'pitch') {
             // Banc -> Terrain
             const benchPlayer = benchPlayers[idx];
             const pitchPlayerId = currentCompo.slots[targetIdx].playerId;
             currentCompo.slots[targetIdx].playerId = benchPlayer.id;
             // L'ancien joueur du terrain va sur le banc (ou disparait si null)
           }
           else if (dotType === 'pitch' && targetType === 'bench') {
             // Terrain -> Banc
             currentCompo.slots[idx].playerId = benchPlayers[targetIdx].id;
           }
           // On re-render pour nettoyer les positions
           renderPitch();
           return;
        }

        // Si relâché sur le terrain mais pas sur un remplaçant spécifique,
        // on sauvegarde juste ses nouvelles coordonnées
        if (dotType === 'pitch' && lastX && lastY) {
          const rect = pitchWrap.getBoundingClientRect();
          if (lastX >= rect.left && lastX <= rect.right && lastY >= rect.top && lastY <= rect.bottom) {
             const x = Math.max(5, Math.min(95, ((lastX - rect.left) / rect.width)  * 100));
             const y = Math.max(5, Math.min(95, ((lastY - rect.top)  / rect.height) * 100));
             currentCompo.slots[idx].x = Math.round(x * 10) / 10;
             currentCompo.slots[idx].y = Math.round(y * 10) / 10;
          }
        }
        
        renderPitch(); // Reconstruire la vue propre
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup',   handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend',  handleEnd);
    };

    dot.addEventListener('mousedown',  e => startDrag(e, e.clientX, e.clientY));
    dot.addEventListener('touchstart', e => startDrag(e, e.touches[0].clientX, e.touches[0].clientY), { passive: false });
  });
}

// ── Changer de format (11v11, 8v8, 5v5) ──────────────────────────────
function setFormat(format, btn) {
  // MAJ des boutons format
  document.querySelectorAll('.format-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  // Récupérer les schémas du nouveau format
  const schemas = Object.keys(FORMAT_SCHEMAS[format]);
  const defaultSchema = schemas[0];
  
  // Générer les pilules de schémas
  const pillsHtml = schemas.map(schema => 
    `<div class="schema-pill ${schema === defaultSchema ? 'active' : ''}" onclick="setSchema('${schema}', this)">${schema}</div>`
  ).join('');
  document.getElementById('schemaPills').innerHTML = pillsHtml;

  // Appliquer le changement
  currentCompo = { format, schema: defaultSchema, slots: [], eventId: currentCompo.eventId };
  renderPitch();
}

// ── Changer de formation ────────────────────────────────────────────
function setSchema(schema, btn) {
  currentCompo = { format: currentCompo.format || 11, schema, slots: [], eventId: currentCompo.eventId };
  document.querySelectorAll('.schema-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderPitch();
}

// ── Générer automatiquement une compo ──────────────────────────────
function autoCompo() {
  currentCompo.slots = []; // vider les slots force le calcul
  renderPitch();
  toast('Compo générée automatiquement');
}

// ── Exporter la compo (Screenshot Canvas) ──────────────────────────
async function exportCompo() {
  const captureZone = document.getElementById('captureZone');
  toast('Génération de l\'image...', 4000);
  
  if (typeof html2canvas === 'undefined') {
    toast('Bibliothèque manquante, vérifie ta connexion.');
    return;
  }

  try {
    const canvas = await html2canvas(captureZone, {
      scale: 2, // Haute résolution
      backgroundColor: '#f8fafc', // var(--bg)
      logging: false,
      useCORS: true
    });
    
    // Convertir le canvas en lien téléchargeable
    const link = document.createElement('a');
    link.download = `Compo-${currentTeam.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Image téléchargée ✓');
  } catch (err) {
    console.error(err);
    toast('Erreur lors de l\'export');
  }
}

// ── Sauvegarder la compo en base de données ─────────────────────────
async function saveCompo() {
  const nextMatch = events
    .filter(e => e.type === 'match' && new Date(e.event_date) >= new Date())
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  const { data: comp } = await sb.from('compositions').insert({
    event_id: nextMatch ? nextMatch.id : null,
    schema:   currentCompo.schema,
    team_id:  profile.team_id
  }).select().single();

  if (comp) {
    await sb.from('composition_slots').insert(
      currentCompo.slots.map(s => ({
        composition_id: comp.id,
        player_id: s.playerId || null,
        role:   s.role,
        pos_x:  s.x,
        pos_y:  s.y
      }))
    );
    toast('Compo sauvegardée ✓');
  }
}
