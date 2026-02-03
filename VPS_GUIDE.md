# VPS Guide (FAQ)

## 1) Domain works by IP, not by domain
DNS is still propagating on your local resolver.
Check:
```
nslookup cyberpodolia.pl 1.1.1.1
```
If it shows `185.243.53.28` there but your local DNS shows another IP, wait or switch DNS to 1.1.1.1 / 8.8.8.8.

## 2) Nginx 403 / broken proxy headers
Use these headers:
```
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```
Test and reload:
```
nginx -t
systemctl reload nginx
```

## 3) Git pull fails (Permission denied publickey)
SSH key is not loaded in the session:
```
eval "$(ssh-agent -s)"
ssh-add /root/cyberpodolia-backend/sshkey_vps01
ssh -T git@github.com
```
Make it permanent:
```
cp /root/cyberpodolia-backend/sshkey_vps01 ~/.ssh/id_ed25519
cp /root/cyberpodolia-backend/sshkey_vps01.pub ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/id_ed25519
cat > ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
EOF
```

## 4) Gunicorn stops after logout
Use systemd:
Create `/etc/systemd/system/cyberpodolia.service`
```
[Unit]
Description=CyberPodolia Flask App (Gunicorn)
After=network.target

[Service]
User=root
WorkingDirectory=/root/cyberpodolia-backend/flask_app
Environment="PATH=/root/cyberpodolia-backend/flask_app/.venv/bin"
ExecStart=/root/cyberpodolia-backend/flask_app/.venv/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```
Enable:
```
systemctl daemon-reload
systemctl enable --now cyberpodolia
```

## 5) Restart after git pull
If Python code changed:
```
systemctl restart cyberpodolia
```
If only `static/` or `templates/` changed, restart is optional.

## 6) Windows .venv is broken after clone
Linux venv does not work on Windows. Recreate:
```
rmdir /s /q .venv
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 7) Remove .venv from GitHub but keep locally
```
git rm -r --cached .venv
git add .gitignore
git commit -m "Ignore local venv"
git push
```

## 8) Check if gunicorn is running
```
ss -lntp | grep 5000
curl -I http://127.0.0.1:5000
```
