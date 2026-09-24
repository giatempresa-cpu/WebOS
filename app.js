let topZ = 10;
const API = `http://${window.location.hostname}:8085/`;

function loadPrefs() {
  const name = localStorage.getItem('pos_name') || 'Admin';
  const bg = localStorage.getItem('pos_bg') || 'radial-gradient(circle at 15% 15%, #1e1b4b 0%, #090d16 85%)';
  const accent = localStorage.getItem('pos_acc') || '#38bdf8';
  document.getElementById('u-name').textContent = name;
  document.getElementById('lock-user').textContent = name;
  document.getElementById('u-avatar').textContent = name[0].toUpperCase();
  document.getElementById('lock-avatar').textContent = name[0].toUpperCase();
  document.documentElement.style.setProperty('--accent', accent);
  document.body.style.background = bg.startsWith('http') ? `url("${bg}") no-repeat center center / cover` : bg;
}
loadPrefs();

function savePrefs(name, bg, acc) {
  if (name) localStorage.setItem('pos_name', name);
  if (bg) localStorage.setItem('pos_bg', bg);
  if (acc) localStorage.setItem('pos_acc', acc);
  loadPrefs();
}

function resetOS() {
  if (confirm('Restaurar o WebOS para as configurações de fábrica?')) {
    localStorage.clear(); location.reload();
  }
}

function lockScreen() { document.getElementById('start-menu').style.display = 'none'; document.getElementById('lock-screen').style.display = 'flex'; }
function unlockScreen() { document.getElementById('lock-screen').style.display = 'none'; }

function updateClock() {
  const d = new Date();
  const timeStr = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  document.getElementById('clock').textContent = timeStr;
  document.getElementById('widget-time').textContent = timeStr;
  document.getElementById('widget-date').textContent = d.toLocaleDateString('pt-BR', {weekday:'short', day:'numeric', month:'short'});
}
setInterval(updateClock, 1000); updateClock();

function updateStats() {
  fetch(API + '?action=stats').then(r=>r.json()).then(d=>{
    if (d.sys) {
      document.getElementById('tray-cpu').textContent = d.sys.cpu;
      document.getElementById('tray-ram').textContent = d.sys.mem;
    }
  }).catch(()=>{});
}
setInterval(updateStats, 3000); updateStats();

function toggleStartMenu() {
  const m = document.getElementById('start-menu');
  m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
}

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.window') || e.target.closest('#taskbar') || e.target.closest('#start-menu')) return;
  e.preventDefault();
  const ctx = document.getElementById('ctx-menu');
  ctx.style.left = `${Math.min(e.clientX, window.innerWidth - 190)}px`;
  ctx.style.top = `${Math.min(e.clientY, window.innerHeight - 170)}px`;
  ctx.style.display = 'block';
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#start-menu') && !e.target.closest('.start-btn')) document.getElementById('start-menu').style.display = 'none';
  if (!e.target.closest('#ctx-menu')) document.getElementById('ctx-menu').style.display = 'none';
});

function runSysAction(act) {
  fetch(API + '?action=' + act).then(r=>r.json()).then(d=>{ alert(d.msg); }).catch(e=>alert('Erro: ' + e));
}

function loadFiles() {
  const box = document.getElementById('file-list'); if (!box) return;
  box.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px;">Carregando...</div>';
  fetch(API + '?action=files').then(r=>r.json()).then(d=>{
    if (!d.files || !d.files.length) { box.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:24px;text-align:center;">Nenhum arquivo encontrado.</div>'; return; }
    let h = '<div style="display:flex;flex-direction:column;gap:6px;">';
    d.files.forEach(f => {
      h += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:10px 14px;border-radius:var(--radius-sm);">
        <div style="display:flex;align-items:center;gap:10px;"><svg style="width:16px;height:16px;stroke:var(--accent);fill:none;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div><div style="font-size:12px;font-weight:500;">${f.name}</div><div style="font-size:10px;color:var(--text-muted);">${f.size}</div></div></div>
        <button class="btn-ui btn-danger" onclick="if(confirm('Excluir arquivo?')) deleteFile('${f.path}')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>Excluir</button>
      </div>`;
    });
    box.innerHTML = h + '</div>';
  });
}

function uploadFile() {
  const inp = document.getElementById('file-upload-input'); if (!inp.files.length) return;
  const file = inp.files[0]; const btn = document.getElementById('upload-btn');
  btn.disabled = true; btn.textContent = 'Enviando...';
  fetch(API + 'upload', { method: 'POST', headers: { 'X-Filename': encodeURIComponent(file.name) }, body: file })
    .then(r=>r.json()).then(d=>{ alert(d.msg); loadFiles(); btn.disabled = false; btn.textContent = 'Enviar Arquivo'; inp.value = ''; })
    .catch(e=>{ alert('Erro: ' + e); btn.disabled = false; btn.textContent = 'Enviar Arquivo'; });
}

function deleteFile(path) { fetch(API + '?action=delete_file&file=' + encodeURIComponent(path)).then(r=>r.json()).then(()=>loadFiles()); }

function loadDisks() {
  fetch(API + '?action=disks').then(r=>r.json()).then(d=>{
    let h = '<div style="display:flex;flex-direction:column;gap:10px;">';
    d.disks.forEach(dk => {
      h += `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:14px;border-radius:var(--radius-sm);">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><strong style="color:var(--accent);font-family:monospace;">${dk.dev}</strong><span style="font-size:11px;color:var(--text-secondary);">${dk.mount}</span></div>
        <div style="background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden;margin-bottom:8px;"><div style="background:var(--accent);height:100%;width:${dk.perc};"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);"><span>Usado: ${dk.used} (${dk.perc})</span><span>Total: ${dk.size}</span><span>Livre: ${dk.avail}</span></div>
      </div>`;
    });
    document.getElementById('disk-list').innerHTML = h + '</div>';
  });
}

function loadTasks() {
  fetch(API + '?action=tasks').then(r=>r.json()).then(d=>{
    let h = '<div style="display:flex;flex-direction:column;gap:6px;">';
    if (!d.tasks.length) h += '<div style="padding:10px;color:var(--text-muted);font-size:12px;">Sem tarefas agendadas no Cron.</div>';
    d.tasks.forEach(t => {
      h += `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:10px;border-radius:var(--radius-sm);font-family:monospace;font-size:11px;">${t}</div>`;
    });
    document.getElementById('task-list').innerHTML = h + '</div>';
  });
}

function addTask() {
  const t = prompt("Comando no formato Cron:\nExemplo: 0 4 * * * /sbin/reboot");
  if (t) fetch(API + '?action=add_task&cmd=' + encodeURIComponent(t)).then(r=>r.json()).then(d=>{ alert(d.msg); loadTasks(); });
}

function loadSysInfo() {
  fetch(API + '?action=sysinfo').then(r=>r.json()).then(d=>{
    document.getElementById('sys-kernel').textContent = d.info.kernel;
    document.getElementById('sys-arch').textContent = d.info.arch;
    document.getElementById('sys-uptime').textContent = d.info.uptime;
    document.getElementById('sys-temp').textContent = d.info.temp;
    fetch(API + '?action=sysinfo_ip').then(r=>r.json()).then(ipd=>{
        if(ipd.ip) document.getElementById('sys-ip-local').textContent = ipd.ip;
    }).catch(e=>{});
  });
}

function openApp(id) {
  const wId = "win-" + id;
  const exist = document.getElementById(wId);
  if (exist) {
    if (exist.classList.contains('minimized')) exist.classList.remove('minimized');
    bringToFront(exist); return;
  }
  const win = document.createElement("div");
  win.id = wId; win.className = "window";
  win.style.left = (60 + (topZ * 12) % 120) + "px";
  win.style.top = (50 + (topZ * 12) % 100) + "px";
  win.style.zIndex = ++topZ;

  let title = id, body = "";
  if (id === 'files') {
    title = "Gerenciador de Arquivos"; win.style.width = "640px"; win.style.height = "440px";
    body = `<div style="padding:16px;height:100%;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;gap:8px;">
          <input type="file" id="file-upload-input" style="display:none;" onchange="uploadFile()">
          <button class="btn-ui" id="upload-btn" onclick="document.getElementById('file-upload-input').click()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Enviar Arquivo</button>
          <button class="btn-ui btn-secondary" onclick="runSysAction('clean_storage');"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>Esvaziar Lixeira</button>
        </div>
        <button class="btn-ui btn-secondary" onclick="loadFiles()"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Atualizar</button>
      </div>
      <div id="file-list" style="flex:1;overflow-y:auto;"></div>
    </div>`;
    setTimeout(loadFiles, 50);
  } else if (id === 'disks') {
    title = "Gerenciador de Discos"; win.style.width = "500px"; win.style.height = "420px";
    body = `<div style="padding:16px;height:100%;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h4 style="font-size:12px;color:var(--text-secondary);">Partições Montadas</h4>
        <button class="btn-ui btn-secondary" onclick="loadDisks()"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Atualizar</button>
      </div><div id="disk-list" style="flex:1;overflow-y:auto;">Lendo discos...</div></div>`;
    setTimeout(loadDisks, 50);
  } else if (id === 'tasks') {
    title = "Agendador de Tarefas (Cron)"; win.style.width = "540px"; win.style.height = "380px";
    body = `<div style="padding:16px;height:100%;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h4 style="font-size:12px;color:var(--text-secondary);">Tarefas do Servidor</h4>
        <button class="btn-ui" onclick="addTask()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nova Tarefa</button>
      </div><div id="task-list" style="flex:1;overflow-y:auto;">Lendo cron...</div></div>`;
    setTimeout(loadTasks, 50);
  } else if (id === 'sysinfo') {
    title = "Propriedades do Sistema"; win.style.width = "420px"; win.style.height = "320px";
    body = `<div style="padding:20px;display:flex;flex-direction:column;gap:16px;height:100%;">
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--surface-border);">
        <svg style="width:48px;height:48px;stroke:var(--accent);fill:none;" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <div><h2 style="font-size:18px;">WebOS Server</h2><p style="font-size:11px;color:var(--text-muted);">GNU/Linux</p></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">Kernel / OS:</span><strong id="sys-kernel">...</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">Arquitetura:</span><strong id="sys-arch">...</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">Tempo Ligado (Uptime):</span><strong id="sys-uptime">...</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">Temp. Processador:</span><strong id="sys-temp" style="color:#f59e0b;">...</strong></div>
      </div>
    </div>`;
    setTimeout(loadSysInfo, 50);
  } else if (id === 'notes') {
    title = "Bloco de Notas"; win.style.width = "480px"; win.style.height = "380px";
    body = `<div style="padding:14px;height:100%;display:flex;flex-direction:column;gap:10px;">
      <textarea id="os-notes-txt" style="flex:1;background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);border-radius:var(--radius-sm);color:#fff;padding:12px;font-size:12px;outline:none;resize:none;font-family:monospace;">${localStorage.getItem('pos_notes')||''}</textarea>
      <div style="display:flex;justify-content:space-between;"><button class="btn-ui" onclick="localStorage.setItem('pos_notes', document.getElementById('os-notes-txt').value);alert('Notas salvas!');"><svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Salvar</button><button class="btn-ui btn-secondary" onclick="document.getElementById('os-notes-txt').value='';localStorage.removeItem('pos_notes');">Limpar</button></div>
    </div>`;
  } else if (id === 'calc') {
    title = "Calculadora"; win.style.width = "280px"; win.style.height = "340px";
    body = `<div style="padding:14px;height:100%;display:flex;flex-direction:column;gap:10px;">
      <input type="text" id="calc-dsp" readonly style="width:100%;height:44px;background:rgba(255,255,255,0.05);border:1px solid var(--surface-border);border-radius:var(--radius-sm);color:#fff;font-size:20px;text-align:right;padding:0 12px;outline:none;">
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;flex:1;">
        ${['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map(k=>`<button class="btn-ui btn-secondary" style="justify-content:center;font-size:14px;" onclick="calcPress('${k}')">${k}</button>`).join('')}
      </div>
    </div>`;
  } else if (id === 'settings') {
    title = "Configurações do Sistema"; win.style.width = "460px"; win.style.height = "420px";
    body = `<div style="padding:20px;display:flex;flex-direction:column;gap:14px;height:100%;overflow-y:auto;">
      <div><label style="font-size:11px;font-weight:600;color:var(--text-secondary);">PERFIL DE USUÁRIO</label><input type="text" id="cfg-user" value="${localStorage.getItem('pos_name')||'Admin'}" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--surface-border);padding:8px 12px;border-radius:var(--radius-sm);color:#fff;margin-top:6px;outline:none;"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--text-secondary);">COR DE DESTAQUE</label><div style="display:flex;gap:10px;margin-top:8px;">
        <button style="width:26px;height:26px;border-radius:50%;background:#38bdf8;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#38bdf8')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#a855f7;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#a855f7')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#10b981;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#10b981')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#f59e0b;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#f59e0b')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#f43f5e;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#f43f5e')"></button>
      </div></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--text-secondary);">TEMA DE FUNDO</label><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
        <button class="btn-ui btn-secondary" style="justify-content:center;" onclick="savePrefs(null,'radial-gradient(circle at 15% 15%, #1e1b4b 0%, #090d16 85%)',null)">Deep Indigo</button>
        <button class="btn-ui btn-secondary" style="justify-content:center;" onclick="savePrefs(null,'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',null)">Obsidian Dark</button>
      </div></div>
      <div style="display:flex;gap:8px;margin-top:auto;"><button class="btn-ui" style="flex:1;justify-content:center;" onclick="savePrefs(document.getElementById('cfg-user').value, null, null);alert('Salvo!')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Salvar</button><button class="btn-ui btn-danger" onclick="resetOS()"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>Reset Fábrica</button></div>
    </div>`;
  } else if (id === 'glances') {
    title = "Monitor de Recursos"; win.style.width = "820px"; win.style.height = "480px";
    body = `<iframe src="${window.location.protocol}//${window.location.hostname}:61208"></iframe>`;
  }

  win.innerHTML = `<div class="window-header" onmousedown="startDrag(event, '${win.id}')">
    <div class="window-title">${title}</div>
    <div class="window-controls">
      <button class="win-btn win-min" onclick="minApp('${id}')"></button>
      <button class="win-btn win-max" onclick="maxApp('${win.id}')"></button>
      <button class="win-btn win-close" onclick="closeApp('${id}')"></button>
    </div>
  </div><div class="window-body"><div class="window-overlay"></div>${body}</div>`;

  win.onmousedown = () => bringToFront(win);
  document.body.appendChild(win);

  const t = document.createElement("div");
  t.id = "task-" + id; t.className = "task-item active"; t.textContent = title;
  t.onclick = () => {
    if (win.classList.contains('minimized')) { win.classList.remove('minimized'); bringToFront(win); }
    else if (win.style.zIndex == topZ) { win.classList.add('minimized'); t.classList.remove('active'); }
    else { bringToFront(win); }
  };
  document.getElementById("taskbar-apps").appendChild(t);
}

function calcPress(k) {
  const d = document.getElementById('calc-dsp');
  if (k === 'C') d.value = '';
  else if (k === '=') { try { d.value = eval(d.value.replace(/[^0-9+\-*/.]/g,'')); } catch { d.value = 'Erro'; } }
  else d.value += k;
}

function minApp(id) { const w = document.getElementById("win-" + id); if (w) w.classList.add('minimized'); const t = document.getElementById("task-" + id); if (t) t.classList.remove('active'); }
function closeApp(id) { const w = document.getElementById("win-" + id); if (w) w.remove(); const t = document.getElementById("task-" + id); if (t) t.remove(); }
function bringToFront(win) {
  win.style.zIndex = ++topZ;
  document.querySelectorAll(".task-item").forEach(e => e.classList.remove("active"));
  const t = document.getElementById("task-" + win.id.replace("win-", ""));
  if (t) t.classList.add("active");
}
function maxApp(id) {
  const w = document.getElementById(id);
  if (w.dataset.max === "1") {
    w.style.left = w.dataset.l; w.style.top = w.dataset.t; w.style.width = w.dataset.w; w.style.height = w.dataset.h; w.dataset.max = "0";
  } else {
    w.dataset.l = w.style.left; w.dataset.t = w.style.top; w.dataset.w = w.style.width; w.dataset.h = w.style.height;
    w.style.left = "0"; w.style.top = "0"; w.style.width = "100vw"; w.style.height = "calc(100vh - 48px)"; w.dataset.max = "1";
  }
}
function startDrag(e, id) {
  if (e.target.classList.contains("win-btn")) return;
  const w = document.getElementById(id); bringToFront(w);
  const ov = w.querySelector(".window-overlay"); if (ov) ov.style.display = "block";
  let sx = e.clientX - w.offsetLeft, sy = e.clientY - w.offsetTop;
  function mm(ev) { w.style.left = Math.max(0, ev.clientX - sx) + "px"; w.style.top = Math.max(0, ev.clientY - sy) + "px"; }
  function mu() { if (ov) ov.style.display = "none"; document.removeEventListener("mousemove", mm); document.removeEventListener("mouseup", mu); }
  document.addEventListener("mousemove", mm); document.addEventListener("mouseup", mu);
}
