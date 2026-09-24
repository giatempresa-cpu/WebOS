import http.server, subprocess, json, urllib.parse, os, urllib.request

PORT = 8085

def sh(cmd):
    try: return subprocess.check_output(cmd, shell=True).decode('utf-8', errors='ignore').strip()
    except: return ""

def get_sys():
    cpu, mem = "0%", "0%"
    try:
        with open('/proc/stat') as f: l = f.readline().split()[1:]
        cpu = f"{int(100*(1-int(l[3])/sum(int(x) for x in l)))}%"
        with open('/proc/meminfo') as f: m = dict(x.split(':') for x in f.readlines()[:3])
        tot = int(m['MemTotal'].split()[0]); free = int(m.get('MemAvailable', m['MemFree']).split()[0])
        mem = f"{int(100*(1-free/tot))}%"
    except: pass
    
    uptime = sh("uptime -p").replace("up ", "")
    temp = sh("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null")
    temp_c = f"{temp[:2]}°C" if len(temp) >= 2 else "N/A"
    
    return {"cpu": cpu, "mem": mem, "uptime": uptime, "temp": temp_c}

def get_disks():
    out = []
    for line in sh("df -h").splitlines()[1:]:
        p = line.split()
        if len(p) >= 6 and (p[0].startswith('/dev/') or p[5] == '/media/videos'):
            out.append({"dev": p[0], "size": p[1], "used": p[2], "avail": p[3], "perc": p[4], "mount": p[5]})
    return out

def get_files(req_path):
    base = "/media/videos"
    target = os.path.normpath(os.path.join(base, req_path.lstrip("/")))
    if not target.startswith(base):
        target = base
    
    if not os.path.exists(target):
        os.makedirs(target, exist_ok=True)

    items = []
    try:
        for entry in os.scandir(target):
            if entry.name.startswith('.') and entry.name == '.Trash-0': continue
            rel_path = os.path.join(req_path, entry.name)
            if entry.is_dir():
                items.append({"name": entry.name, "is_dir": True, "path": rel_path, "size": "--"})
            else:
                try: sz = f"{entry.stat().st_size / (1024*1024):.1f} MB"
                except: sz = "0 MB"
                items.append({"name": entry.name, "is_dir": False, "path": rel_path, "size": sz})
    except: pass
    return {"current": req_path, "items": items}

def get_info():
    ip = sh("hostname -I | awk '{print $1}'")
    return {"kernel": sh("uname -sr"), "arch": sh("uname -m"), "uptime": sh("uptime -p").replace("up ", ""), "ip": ip}

def get_cron():
    return [l for l in sh("crontab -l").splitlines() if l and not l.startswith('#')]

class Handler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Filename, X-Path')
        super().end_headers()
    def do_OPTIONS(self): self.send_response(200); self.end_headers()

    def do_POST(self):
        if '/upload' in self.path:
            length = int(self.headers.get('Content-Length', 0))
            fn = os.path.basename(urllib.parse.unquote(self.headers.get('X-Filename', 'upload.bin')))
            subpath = urllib.parse.unquote(self.headers.get('X-Path', ''))
            dest_dir = os.path.normpath(os.path.join("/media/videos", subpath.lstrip("/")))
            os.makedirs(dest_dir, exist_ok=True)
            with open(os.path.join(dest_dir, fn), 'wb') as f: f.write(self.rfile.read(length))
            self.send_response(200); self.end_headers()
            self.wfile.write(b'{"status":"success","msg":"Arquivo guardado com sucesso!"}')
        elif '/mkdir' in self.path:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length).decode('utf-8')) if length > 0 else {}
            dirname = body.get('name', 'Nova Pasta')
            subpath = body.get('path', '')
            target = os.path.normpath(os.path.join("/media/videos", subpath.lstrip("/"), dirname))
            os.makedirs(target, exist_ok=True)
            self.send_response(200); self.end_headers()
            self.wfile.write(b'{"status":"success","msg":"Pasta criada!"}')

    def do_GET(self):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        act = qs.get('action', [''])[0]; res = {"status": "success", "msg": "OK"}
        if act == 'stats': res = {"sys": get_sys()}
        elif act == 'files':
            req_path = qs.get('path', [''])[0]
            res = get_files(req_path)
        elif act == 'disks': res = {"disks": get_disks()}
        elif act == 'sysinfo': res = {"info": get_info()}
        elif act == 'sysinfo_ip': res = {"ip": sh("hostname -I | awk '{print $1}'")}
        elif act == 'tasks': res = {"tasks": get_cron()}
        elif act == 'add_task':
            cmd = qs.get('cmd', [''])[0]
            if cmd: sh(f'(crontab -l 2>/dev/null; echo "{cmd}") | crontab -'); res["msg"] = "Tarefa agendada!"
        elif act == 'delete_file':
            target = os.path.normpath(os.path.join("/media/videos", qs.get('file', [''])[0].lstrip("/")))
            if target.startswith("/media/videos") and os.path.exists(target):
                if os.path.isdir(target): os.rmdir(target)
                else: os.remove(target)
                res["msg"] = "Removido com sucesso!"
        elif act == 'clean_storage': sh("rm -rf /media/videos/.Trash-0/* && sync"); res["msg"] = "Lixeira limpa!"
        elif act == 'reboot_system': subprocess.Popen(["reboot"]); res["msg"] = "A reiniciar..."
        elif act == 'poweroff_system': subprocess.Popen(["poweroff"]); res["msg"] = "A desligar..."
        self.send_response(200); self.end_headers(); self.wfile.write(json.dumps(res).encode('utf-8'))
    def log_message(self, fmt, *a): return

if __name__ == '__main__': http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
    
