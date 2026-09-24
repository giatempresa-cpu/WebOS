let topZ = 10;
const API = `http://${window.location.hostname}:8085/`;
let currentDir = "";

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

function loadFiles(path = "") {
  currentDir = path;
  const box = document.getElementById('file-list'); if (!box) return;
  const pathLbl = document.getElementById('current-path-lbl');
  if (pathLbl) pathLbl.textContent = "/media/videos" + (path ? "/" + path : "");
  
  box.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px;">Carregando diretório...</div>';
  
  fetch(API + '?action=files&path=' + encodeURIComponent(path)).then(r=>r.json()).then(d=>{
    let h = '<div style="display:flex;flex-direction:column;gap:6px;">';
    
    if (path !== "") {
      const parentPath = path.split('/').slice(0, -1).join('/');
      h += `<div style="display:flex;align-items:center;background:rgba(255,255,255,0.05);border:1px solid var(--surface-border);padding:10px 14px;border-radius:var(--radius-sm);cursor:pointer;" onclick="loadFiles('${parentPath}')">
        <span style="font-size:13px;font-weight:600;color:var(--accent);">📁 .. (Pasta Acima)</span>
      </div>`;
    }

    if (!d.items || !d.items.length) {
      h += '<div style="color:var(--text-muted);font-size:12px;padding:24px;text-align:center;">Esta pasta está vazia.</div>';
    } else {
      d.items.forEach(item => {
        if (item.is_dir) {
          h += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:10px 14px;border-radius:var(--radius-sm);">
            <div style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;" ondblclick="loadFiles('${item.path}')" onclick="loadFiles('${item.path}')">
              <svg style="width:16px;height:16px;stroke:#f59e0b;fill:none;" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <div style="font-size:12px;font-weight:600;color:#f59e0b;">${item.name}/</div>
            </div>
            <button class="btn-ui btn-danger" onclick="deleteItem('${item.path}')">Excluir</button>
          </div>`;
        } else {
          h += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:10px 14px;border-radius:var(--radius-sm);">
            <div style="display:flex;align-items:center;gap:10px;">
              <svg style="width:16px;height:16px;stroke:var(--accent);fill:none;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div><div style="font-size:12px;font-weight:500;">${item.name}</div><div style="font-size:10px;color:var(--text-muted);">${item.size}</div></div>
            </div>
            <button class="btn-ui btn-danger" onclick="deleteItem('${item.path}')">Excluir</button>
          </div>`;
        }
      });
    }
    box.innerHTML = h + '</div>';
  });
}

function createFolder() {
  const name = prompt("Nome da nova pasta:");
  if (!name) return;
  fetch(API + 'mkdir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, path: currentDir })
  }).then(r=>r.json()).then(d=>{ alert(d.msg); loadFiles(currentDir); });
}

function uploadFile() {
  const inp = document.getElementById('file-upload-input'); if (!inp.files.length) return;
  const file = inp.files[0]; const btn = document.getElementById('upload-btn');
  btn.disabled = true; btn.textContent = 'Enviando...';
  fetch(API + 'upload', { 
    method: 'POST', 
    headers: { 'X-Filename': encodeURIComponent(file.name), 'X-Path': encodeURIComponent(currentDir) }, 
    body: file 
  }).then(r=>r.json()).then(d=>{ alert(d.msg); loadFiles(currentDir); btn.disabled = false; btn.textContent = 'Enviar Arquivo'; inp.value = ''; })
  .catch(e=>{ alert('Erro: ' + e); btn.disabled = false; btn.textContent = 'Enviar Arquivo'; });
}

function deleteItem(path) {
  if(confirm("Tem certeza que deseja excluir?")) {
    fetch(API + '?action=delete_file&file=' + encodeURIComponent(path)).then(r=>r.json()).then(()=>loadFiles(currentDir));
  }
}

function initMonitor() {
  function updateMonitorData() {
    fetch(API + '?action=stats').then(r=>r.json()).then(d=>{
      if (d.sys && document.getElementById('native-cpu')) {
        document.getElementById('native-cpu').textContent = d.sys.cpu;
        document.getElementById('native-mem').textContent = d.sys.mem;
        document.getElementById('native-uptime').textContent = d.sys.uptime;
        document.getElementById('native-temp').textContent = d.sys.temp;
      }
    }).catch(()=>{});
  }
  updateMonitorData();
  window.monitorInterval = setInterval(updateMonitorData, 2000);
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
    title = "Gerenciador de Arquivos"; win.style.width = "680px"; win.style.height = "460px";
    body = `<div style="padding:16px;height:100%;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);padding:8px;border-radius:var(--radius-sm);border:1px solid var(--surface-border);">
        <span id="current-path-lbl" style="font-family:monospace;font-size:11px;color:var(--accent);">/media/videos</span>
        <div style="display:flex;gap:6px;">
          <input type="file" id="file-upload-input" style="display:none;" onchange="uploadFile()">
          <button class="btn-ui" id="upload-btn" onclick="document.getElementById('file-upload-input').click()">Enviar Arquivo</button>
          <button class="btn-ui btn-secondary" onclick="createFolder()">Nova Pasta</button>
          <button class="btn-ui btn-secondary" onclick="loadFiles(currentDir)">Atualizar</button>
        </div>
      </div>
      <div id="file-list" style="flex:1;overflow-y:auto;"></div>
    </div>`;
    setTimeout(() => loadFiles(""), 50);
  } else if (id === 'monitor') {
    title = "Monitor do Sistema"; win.style.width = "460px"; win.style.height = "340px";
    body = `<div style="padding:20px;display:flex;flex-direction:column;gap:14px;height:100%;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:16px;border-radius:var(--radius-md);text-align:center;">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">USO DE CPU</div>
          <div id="native-cpu" style="font-size:28px;font-weight:700;color:var(--accent);margin-top:6px;">--%</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:16px;border-radius:var(--radius-md);text-align:center;">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">USO DE MEMÓRIA</div>
          <div id="native-mem" style="font-size:28px;font-weight:700;color:#10b981;margin-top:6px;">--%</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);padding:14px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:8px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">Tempo Ligado:</span><strong id="native-uptime">--</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">Temperatura CPU:</span><strong id="native-temp" style="color:#f59e0b;">--</strong></div>
      </div>
    </div>`;
    setTimeout(initMonitor, 50);
  } else if (id === 'disks') {
    title = "Gerenciador de Discos"; win.style.width = "500px"; win.style.height = "420px";
    body = `<div style="padding:16px;height:100%;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h4 style="font-size:12px;color:var(--text-secondary);">Partições Montadas</h4>
        <button class="btn-ui btn-secondary" onclick="loadDisks()">Atualizar</button>
      </div><div id="disk-list" style="flex:1;overflow-y:auto;">Lendo discos...</div></div>`;
    setTimeout(loadDisks, 50);
  } else if (id === 'tasks') {
    title = "Agendador de Tarefas (Cron)"; win.style.width = "540px"; win.style.height = "380px";
    body = `<div style="padding:16px;height:100%;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h4 style="font-size:12px;color:var(--text-secondary);">Tarefas do Servidor</h4>
        <button class="btn-ui" onclick="addTask()">Nova Tarefa</button>
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
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">Tempo Ligado:</span><strong id="sys-uptime-info">...</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">IP Local:</span><strong id="sys-ip-prop" style="color:var(--accent);">...</strong></div>
      </div>
    </div>`;
    setTimeout(() => {
      fetch(API + '?action=sysinfo').then(r=>r.json()).then(d=>{
        document.getElementById('sys-kernel').textContent = d.info.kernel;
        document.getElementById('sys-arch').textContent = d.info.arch;
        document.getElementById('sys-uptime-info').textContent = d.info.uptime;
        document.getElementById('sys-ip-prop').textContent = d.info.ip;
      });
    }, 50);
  } else if (id === 'notes') {
    title = "Bloco de Notas"; win.style.width = "480px"; win.style.height = "380px";
    body = `<div style="padding:14px;height:100%;display:flex;flex-direction:column;gap:10px;">
      <textarea id="os-notes-txt" style="flex:1;background:rgba(255,255,255,0.03);border:1px solid var(--surface-border);border-radius:var(--radius-sm);color:#fff;padding:12px;font-size:12px;outline:none;resize:none;font-family:monospace;">${localStorage.getItem('pos_notes')||''}</textarea>
      <div style="display:flex;justify-content:space-between;"><button class="btn-ui" onclick="localStorage.setItem('pos_notes', document.getElementById('os-notes-txt').value);alert('Notas salvas!');">Salvar</button><button class="btn-ui btn-secondary" onclick="document.getElementById('os-notes-txt').value='';localStorage.removeItem('pos_notes');">Limpar</button></div>
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
    title = "Configurações"; win.style.width = "460px"; win.style.height = "420px";
    body = `<div style="padding:20px;display:flex;flex-direction:column;gap:14px;height:100%;overflow-y:auto;">
      <div><label style="font-size:11px;font-weight:600;color:var(--text-secondary);">PERFIL</label><input type="text" id="cfg-user" value="${localStorage.getItem('pos_name')||'Admin'}" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--surface-border);padding:8px 12px;border-radius:var(--radius-sm);color:#fff;margin-top:6px;outline:none;"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--text-secondary);">COR DO SISTEMA</label><div style="display:flex;gap:10px;margin-top:8px;">
        <button style="width:26px;height:26px;border-radius:50%;background:#38bdf8;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#38bdf8')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#a855f7;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#a855f7')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#10b981;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#10b981')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#f59e0b;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#f59e0b')"></button>
        <button style="width:26px;height:26px;border-radius:50%;background:#f43f5e;border:none;cursor:pointer;" onclick="savePrefs(null,null,'#f43f5e')"></button>
      </div></div>
      <div style="display:flex;gap:8px;margin-top:auto;"><button class="btn-ui" style="flex:1;justify-content:center;" onclick="savePrefs(document.getElementById('cfg-user').value, null, null);alert('Salvo!')">Salvar</button><button class="btn-ui btn-danger" onclick="resetOS()">Reset Fábrica</button></div>
    </div>`;
  } else if (id === 'vscode') {
    title = "Visual Studio Code"; win.style.width = "900px"; win.style.height = "560px";
    body = `<iframe src="${window.location.protocol}//${window.location.hostname}:8443"></iframe>`;
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
  const t = document.getElementById("task-" + win.id.replace("win-"
