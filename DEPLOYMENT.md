# คู่มือการติดตั้ง Kanban บน VPS (Hostinger)

คู่มือนี้ใช้สำหรับการ deploy Kanban บน VPS เช่น Hostinger, DigitalOcean, Vultr หรือ VPS อื่นๆ

---

## 1. ความต้องการของระบบ

- VPS ที่รัน Linux (Ubuntu 22.04 LTS แนะนำ)
- Docker Engine 20.10+
- Docker Compose v2+
- พอร์ตที่เปิด: **3000** (Web), **6001** (Real-time), **443** (SSL ถ้าใช้ HTTPS)

---

## 2. ติดตั้ง Docker บน VPS

### Ubuntu / Debian

```bash
# อัพเดทระบบ
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# ติดตั้ง Docker Compose
sudo apt install docker-compose-plugin -y

# ตรวจสอบ
docker --version
docker compose version
```

หลังจากติดตั้ง ต้อง **logout และ login ใหม่** เพื่อให้กลุ่ม docker มีผล

---

## 3. โครงสร้างโปรเจกต์

```
kanban/
├── docker-compose.yml      # คอนฟิกหลัก (รองรับ .env)
├── docker-compose.prod.yml # (ถ้าต้องการ) ใช้ bind db port ภายใน
├── Dockerfile
├── .env                    # สร้างจาก .env.production.example
└── ...
```

---

## 4. การ Config

### 4.1 สร้างไฟล์ `.env`

```bash
cd /path/to/kanban
cp .env.production.example .env
nano .env  # หรือใช้ vim / vi
```

### 4.2 ตัวแปรสำคัญที่ต้องแก้ไข

| ตัวแปร | คำอธิบาย | ตัวอย่าง |
|--------|----------|----------|
| `NEXTAUTH_URL` | URL หลักของเว็บ (ต้องตรงกับที่ user เข้า) | `https://kanban.yourdomain.com` หรือ `http://YOUR_VPS_IP:3000` |
| `NEXTAUTH_SECRET` | Secret สำหรับ NextAuth (ขั้นต่ำ 32 ตัวอักษร) | สร้างด้วย `openssl rand -base64 32` |
| `NEXT_PUBLIC_PUSHER_HOST` | Host สำหรับ Real-time (ใช้ domain หรือ IP เดียวกับเว็บ) | `kanban.yourdomain.com` หรือ `YOUR_VPS_IP` |
| `API_KEY` | API Key สำหรับ Agent (OpenClaw) | สร้างค่าที่ปลอดภัย เช่น `openssl rand -hex 32` |
| `API_AGENT_USERNAME` | username ที่ Agent จะใช้สิทธิ์ | `admin` (ต้องมี user นี้ในระบบ) |

### 4.3 สร้างค่า Secret

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# API_KEY
openssl rand -hex 32
```

### 4.4 ตัวอย่าง .env สำหรับ VPS ที่ใช้ IP โดยตรง

```
NEXTAUTH_URL=http://123.45.67.89:3000
NEXT_PUBLIC_APP_URL=http://123.45.67.89:3000
NEXTAUTH_SECRET=xxxxx... (จาก openssl rand -base64 32)
DATABASE_URL=postgresql://kanban:kanban_secret@db:5432/kanban
NEXT_PUBLIC_PUSHER_HOST=123.45.67.89
NEXT_PUBLIC_PUSHER_PORT=6001
API_KEY=xxxxx... (จาก openssl rand -hex 32)
API_AGENT_USERNAME=admin
```

### 4.5 ตัวอย่าง .env สำหรับ VPS ที่มี Domain + SSL

```
NEXTAUTH_URL=https://kanban.yourdomain.com
NEXT_PUBLIC_APP_URL=https://kanban.yourdomain.com
NEXTAUTH_SECRET=xxxxx...
DATABASE_URL=postgresql://kanban:kanban_secret@db:5432/kanban
NEXT_PUBLIC_PUSHER_HOST=kanban.yourdomain.com
NEXT_PUBLIC_PUSHER_PORT=443
API_KEY=xxxxx...
API_AGENT_USERNAME=admin
```

> หากใช้ HTTPS + reverse proxy (nginx) ต้องกำหนด routing ให้ `/` ไปที่ port 3000 และ WebSocket `/apps` ไปที่ port 6001

---

## 5. คำสั่งติดตั้งและรัน

### 5.1 Build และรันครั้งแรก

```bash
cd /path/to/kanban

# สร้าง .env ก่อน (คัดลอกจาก .env.production.example)
cp .env.production.example .env
nano .env   # แก้ไข NEXTAUTH_URL, NEXTAUTH_SECRET, API_KEY เป็นต้น

# Build และรัน
docker compose up -d --build

# รอให้ db พร้อม (ประมาณ 10-20 วินาที)
# ตรวจสอบ logs
docker compose logs -f app
```

> Docker Compose จะโหลดค่าจาก `.env` อัตโนมัติ (NEXTAUTH_URL, API_KEY ฯลฯ)

### 5.2 Seed ข้อมูลเริ่มต้น (ครั้งแรกเท่านั้น)

```bash
# รัน seed แล้วหยุด
docker compose run --rm -e SEED_DB=true app npm start

# หรือ แก้ .env ให้มี SEED_DB=true ก่อน จากนั้น
docker compose up -d
# หลัง seed เสร็จ แก้ SEED_DB=false หรือลบออก แล้ว restart
```

**บัญชีทดสอบหลัง seed:**
- `admin` / `admin123` (Super Admin)
- `somchai` / `password123` (Admin)
- `siriporn` / `password123` (User)

### 5.3 คำสั่งที่ใช้บ่อย

```bash
# หยุด
docker compose down

# เริ่มใหม่
docker compose up -d

# ดู logs
docker compose logs -f app

# Rebuild หลัง pull code ใหม่
docker compose up -d --build
```

---

## 6. Firewall (แนะนำ)

```bash
# UFW - เปิดพอร์ตที่จำเป็น
sudo ufw allow 22    # SSH
sudo ufw allow 3000  # Web
sudo ufw allow 6001  # Real-time
sudo ufw enable
```

---

## 7. การ Backup

### 7.1 Backup Database

```bash
docker compose exec db pg_dump -U kanban kanban > backup_$(date +%Y%m%d).sql
```

### 7.2 Backup ไฟล์อัพโหลด

```bash
docker compose run --rm -v kanban_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz -C /data .
```

### 7.3 Restore Database

```bash
cat backup_20260311.sql | docker compose exec -T db psql -U kanban kanban
```

---

## 8. Checklist ก่อน Deploy

- [ ] แก้ไข `NEXTAUTH_URL` ให้ตรงกับ URL ที่ผู้ใช้เข้า
- [ ] สร้าง `NEXTAUTH_SECRET` ใหม่
- [ ] สร้าง `API_KEY` ใหม่สำหรับ Agent
- [ ] ตั้งค่า `API_AGENT_USERNAME` เป็น user ที่มีอยู่ในระบบ
- [ ] ตรวจสอบ Firewall เปิด port 3000 และ 6001
- [ ] รัน Seed ครั้งแรก (ถ้าต้องการข้อมูลตัวอย่าง)

---

## 9. Troubleshooting

### App ไม่ start / ติดที่ db push
```bash
docker compose logs app
# ถ้า db ยังไม่พร้อม รอแล้ว restart
docker compose restart app
```

### ไม่สามารถ login ได้
- ตรวจสอบ `NEXTAUTH_URL` ต้องตรงกับ URL ที่ใช้เข้าเว็บ
- รัน seed ถ้ายังไม่มี user

### Real-time ไม่ทำงาน
- ตรวจสอบ `NEXT_PUBLIC_PUSHER_HOST` และ `NEXT_PUBLIC_PUSHER_PORT`
- ต้องเป็น host/port ที่ browser เข้าถึงได้จากภายนอก

### Agent API 401 Unauthorized
- ตรวจสอบ header `Authorization: Bearer <API_KEY>`
- ตรวจสอบ `API_KEY` ใน .env ตรงกับที่ส่ง
- ตรวจสอบ `API_AGENT_USERNAME` มี user ในระบบ
