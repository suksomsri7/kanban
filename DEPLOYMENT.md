# คู่มือการ Deploy Kanban

---

## A. Deploy บน Vercel (แนะนำ)

โปรเจกต์ deploy ขึ้น Vercel เป็นหลัก

### ความต้องการ

- บัญชี [Vercel](https://vercel.com)
- PostgreSQL (Vercel Postgres, Neon, Supabase หรือ external DB)
- ตัวแปร environment ด้านล่าง

### 1. เชื่อม Repo กับ Vercel

1. เข้า [vercel.com](https://vercel.com) → Add New Project
2. Import Git repository ของ Kanban
3. Framework Preset: **Next.js** (auto-detect)
4. Build Command: `prisma generate && next build` (หรือใช้จาก `vercel.json`)
5. ตั้งค่า Environment Variables ด้านล่าง

### 2. Environment Variables (Vercel)

ใน Vercel Project → Settings → Environment Variables ใส่ค่าต่อไปนี้:

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (เช่น Vercel Postgres, Neon) |
| `NEXTAUTH_SECRET` | ✅ | Secret สำหรับ NextAuth (อย่างน้อย 32 ตัวอักษร) |
| `NEXTAUTH_URL` | ✅ | **ต้องเป็น URL ที่ผู้ใช้เข้า** เช่น `https://kanban.suksomsri.cloud` ถ้าใช้ custom domain — ถ้าใส่เป็น `*.vercel.app` แล้วเข้า via custom domain จะล็อกอิน/เข้าไม่ได้ |
| `API_KEY` | ไม่ | API Key สำหรับ Agent/Integration (Bearer token) |
| `API_AGENT_USERNAME` | ไม่ | username ที่ Agent ใช้ (default: `admin`) |
| `NEXT_PUBLIC_BASE_PATH` | ไม่ | เว้นว่าง `""` สำหรับ root; ใส่เช่น `/kanban` ถ้าใช้ subpath |
| `NEXT_PUBLIC_PUSHER_*` / `PUSHER_*` | ไม่ | ถ้าใช้ Real-time (Soketi/Pusher) |

**ถ้าใช้ Custom Domain (เช่น kanban.suksomsri.cloud):**
1. ใน Vercel → Project → **Settings → Domains** ให้เพิ่ม domain นั้นและ verify
2. ตั้ง **NEXTAUTH_URL** = `https://kanban.suksomsri.cloud` (ไม่มี slash ท้าย) — **ถ้าค่าเป็น `*.vercel.app` จะได้ `/api/auth/error` → "Bad request."**
3. **สำคัญ:** เลือก Environment เป็น **Production** (และ Preview ถ้าใช้) แล้ว Save
4. **ต้อง Redeploy หลังแก้ env:** ไปที่ Deployments → deployment ล่าสุด → ⋮ → **Redeploy** (การ push code ใหม่จะ deploy แต่ env เก่าอาจถูก cache ถ้าไม่กด Redeploy หลังแก้ตัวแปร)
5. ตรวจสอบ: เปิด `https://kanban.suksomsri.cloud/api/debug-auth-url` ควรเห็น `"match": true`

**สร้าง Secret:**
```bash
openssl rand -base64 32   # สำหรับ NEXTAUTH_SECRET
openssl rand -hex 32      # สำหรับ API_KEY
```

### 3. Deploy

- **Auto deploy:** push ขึ้น branch ที่เชื่อมกับ Vercel (เช่น `main`) จะ build และ deploy อัตโนมัติ
- **Manual (CLI):**
  ```bash
  npm i -g vercel
  vercel --prod
  ```

### 4. Database (ครั้งแรก)

หลัง deploy แล้ว ต้อง push schema และ (ถ้าต้องการ) seed ข้อมูลจากเครื่อง local ที่มี `DATABASE_URL` ชี้ไปที่ DB เดียวกัน:

```bash
npx prisma db push
# optional: npx prisma db seed
```

---

## B. Deploy บน VPS (Docker) — เลิกใช้แล้ว

ส่วนด้านล่างเป็นคู่มือเดิมสำหรับการ deploy บน VPS ด้วย Docker (ยกเลิกไปแล้ว ปกติใช้ Vercel)

---

## 1. ความต้องการของระบบ (VPS)

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

# Rebuild หลัง pull code ใหม่ / อัปเดต API หรือคู่มือ
docker compose up -d --build
```

### 5.4 Deploy หลังอัปเดต code (หรือคู่มือ API / OpenClaw)

เมื่อแก้ไข code, AGENT_API.md หรือ OPENCLAW_PROMPTS.md แล้ว ให้ build และรันใหม่:

```bash
cd /path/to/kanban
docker compose up -d --build
```

หรือถ้าใช้ `docker-compose` (ตัวแยก):

```bash
docker-compose up -d --build
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
