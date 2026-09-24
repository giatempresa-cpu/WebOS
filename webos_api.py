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
    return {"cpu": cpu, "mem": mem}

def get_disks():
    out = []
    for line in sh("df -h").splitlines()[1:]:
        p = line.split()
        if len(p) >= 6 and (p[0].startswith('/dev/') or p[5] == '/media/videos'):
            out.append({"dev": p[0], "size": p[1], "used": p[2], "avail": p[3], "perc": p[4], "mount": p[5]})
    return out

def get_files():
    b = "/media/videos"; out = []
    if os.path.exists(b):
        for r, ds, fs in os.walk(b):
            if ".Trash-0" in r: continue
            for f in fs:
                fp = os.path.join(r, f)
                try: out.append({"name": f, "path": fp.replace(b, ""), "size": f"{os.path.getsize(fp)/(1024*1024):.1f} MB"})
                except: pass
    return out

def get_info():
    t = sh("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null")
    temp = f"{t[:2]}°C" if len(t) >= 2 else "N/A"
    ip = sh("hostname -I | awk '{print $1}'")
    return {"kernel": sh("uname -sr"), "arch": sh("uname -m"), "uptime": sh("uptime -p").replace("up ", ""), "temp": temp, "ip": ip}

def get_cron():
    return [l for l in sh("crontab -l").splitlines() if l and not l.startswith('#')]

class Handler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Filename')
        super().end_headers()
    def do_OPTIONS(self): self.send_response(200); self.end_headers()

    def do_POST(self):
        if '/upload' in self.path:
            length = int(self.headers.get('Content-Length', 0))
            fn = os.path.basename(urllib.parse.unquote(self.headers.get('X-Filename', 'upload.bin')))
            with open(os.path.join("/media/videos", fn), 'wb') as f: f.write(self.rfile.read(length))
            self.send_response(200); self.end_headers()
            self.wfile.write(b'{"status":"success","msg":"Ficheiro guardado!"}')

    def do_GET(self):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        act = qs.get('action', [''])[0]; res = {"status": "success", "msg": "OK"}
        if act == 'stats': res = {"sys": get_sys()}
        elif act == 'files': res = {"files": get_files()}
        elif act == 'disks': res = {"disks": get_disks()}
        elif act == 'sysinfo': res = {"info": get_info()}
        elif act == 'sysinfo_ip': res = {"ip": sh("hostname -I | awk '{print $1}'")}
        elif act == 'tasks': res = {"tasks": get_cron()}
        elif act == 'add_task':
            cmd = qs.get('cmd', [''])[0]
            if cmd: sh(f'(crontab -l 2>/dev/null; echo "{cmd}") | crontab -'); res["msg"] = "Tarefa agendada!"
        elif act == 'delete_file':
            fp = os.path.normpath(os.path.join("/media/videos", qs.get('file', [''])[0].lstrip("/")))
            if fp.startswith("/media/videos") and os.path.exists(fp): os.remove(fp); res["msg"] = "Ficheiro apagado!"
        elif act == 'clean_storage': sh("rm -rf /media/videos/.Trash-0/* && sync"); res["msg"] = "Lixeira limpa!"
        elif act == 'reboot_system': subprocess.Popen(["reboot"]); res["msg"] = "A reiniciar..."
        elif act == 'poweroff_system': subprocess.Popen(["poweroff"]); res["msg"] = "A desligar..."
        self.send_response(200); self.end_headers(); self.wfile.write(json.dumps(res).encode('utf-8'))
    def log_message(self, fmt, *a): return

if __name__ == '__main__': http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
