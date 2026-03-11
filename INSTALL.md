# Kanban Board — Installation Guide

This app supports **two deployment modes**:

| | Docker / VPS | Vercel (Cloud) |
|---|---|---|
| **Hosting** | Self-hosted Docker on any VPS | Vercel serverless |
| **Database** | Local PostgreSQL (Docker) | Neon PostgreSQL |
| **File Storage** | Local filesystem (volume) | Bunny CDN (FTP) |
| **Real-time** | Soketi (self-hosted) | Pusher Cloud |
| **URL** | `http://host:3000/kanban` | `https://your-app.vercel.app` |

---

# Option A: Docker / VPS Deployment

## Prerequisites

- **VPS**: Ubuntu 22.04+ or any Linux with Docker support
- **Docker**: Docker Engine 24+ & Docker Compose v2+
- **RAM**: 1 GB minimum (2 GB recommended)
- **Disk**: 10 GB minimum

### 1. Install Docker on VPS

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group changes
```

### 2. Upload project to VPS

```bash
# From your local machine
scp -r ./kanban user@YOUR_VPS_IP:/home/user/kanban

# Or use git
ssh user@YOUR_VPS_IP
git clone <your-repo-url> kanban
cd kanban
```

### 3. Configure environment

```bash
cd kanban
cp .env.example .env
nano .env
```

**Edit these values in `.env`:**

```bash
# IMPORTANT: Change these for production!
POSTGRES_PASSWORD="your-strong-db-password-here"
NEXTAUTH_SECRET="generate-random-32-char-string-here"
API_KEY="generate-random-api-key-here"

# Set your VPS IP or domain
NEXTAUTH_URL="http://YOUR_VPS_IP:3000/kanban"
NEXT_PUBLIC_PUSHER_HOST="YOUR_VPS_IP"
```

Generate random secrets:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate API_KEY
openssl rand -hex 24
```

### 4. Build and start

```bash
# First time: build + start + seed database
SEED_DB=true docker compose up -d --build

# Check logs
docker compose logs -f app
```

### 5. Access

- **Web UI**: `http://YOUR_VPS_IP:3000/kanban`
- **Login**: `admin` / `admin123` (change after first login!)
- **Agent API**: `http://YOUR_VPS_IP:3000/kanban/api/v1/boards`

---

# Option B: Vercel Deployment

## Prerequisites

- **Vercel** account (free tier works)
- **Neon** PostgreSQL database (free tier works)
- **Bunny CDN** storage zone (for file uploads)
- **Pusher** account (for real-time features)

### 1. Create Neon database

1. Go to [neon.tech](https://neon.tech) → Create project
2. Copy the connection string

### 2. Create Bunny CDN storage

1. Go to [bunny.net](https://bunny.net) → Storage → Add Storage Zone
2. Note `hostname`, `username` (zone name), and `password` (API key)

### 3. Create Pusher app

1. Go to [pusher.com](https://pusher.com) → Channels → Create app
2. Note `app_id`, `key`, `secret`, `cluster`

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 5. Set environment variables in Vercel dashboard

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://...@ep-xxx.neon.tech/kanban?sslmode=require` |
| `NEXTAUTH_SECRET` | (random 32+ char string) |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_BASE_PATH` | *(leave empty for root URL)* |
| `BUNNY_STORAGE_HOSTNAME` | `storage.bunnycdn.com` |
| `BUNNY_STORAGE_USERNAME` | your storage zone name |
| `BUNNY_STORAGE_PASSWORD` | your storage API key |
| `PUSHER_APP_ID` | from Pusher dashboard |
| `PUSHER_KEY` | from Pusher dashboard |
| `PUSHER_SECRET` | from Pusher dashboard |
| `PUSHER_CLUSTER` | e.g. `ap1` |
| `NEXT_PUBLIC_PUSHER_KEY` | same as `PUSHER_KEY` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | same as `PUSHER_CLUSTER` |
| `API_KEY` | (random secret for agent) |
| `API_AGENT_USERNAME` | `admin` |

> **Important**: Set `NEXT_PUBLIC_BASE_PATH` to empty string `""` to serve at root (`/`).
> If omitted, it defaults to `/kanban`.

### 6. Push database schema

```bash
npx prisma db push
```

### 7. Seed database (optional)

```bash
npx prisma db seed
```

---

# Configuration Reference

## Environment Variables

| Variable | Docker Default | Vercel | Description |
|----------|---------------|--------|-------------|
| `DATABASE_URL` | `postgresql://...@db:5432/kanban` | Neon connection string | PostgreSQL connection |
| `POSTGRES_PASSWORD` | `kanban_secret` | *(not used)* | Docker PostgreSQL password |
| `NEXTAUTH_SECRET` | (required) | (required) | JWT signing secret (32+ chars) |
| `NEXTAUTH_URL` | `http://localhost:3000/kanban` | `https://app.vercel.app` | Full app URL |
| `NEXT_PUBLIC_BASE_PATH` | `/kanban` (default) | `""` (empty) | Route prefix |
| `UPLOAD_DIR` | `./uploads` | *(not used)* | Local file storage path |
| `BUNNY_STORAGE_HOSTNAME` | *(not set)* | `storage.bunnycdn.com` | Bunny CDN FTP host |
| `BUNNY_STORAGE_USERNAME` | *(not set)* | zone name | Bunny CDN zone name |
| `BUNNY_STORAGE_PASSWORD` | *(not set)* | API key | Bunny CDN API key |
| `API_KEY` | (required) | (required) | API key for Agent access |
| `API_AGENT_USERNAME` | `admin` | `admin` | Which user the Agent operates as |
| `SEED_DB` | `true` on first boot | *(not used)* | Seed database with test data |

## Storage Provider Auto-detection

The app automatically selects the storage backend based on environment variables:

- **Bunny CDN** is used if `BUNNY_STORAGE_HOSTNAME`, `BUNNY_STORAGE_USERNAME`, and `BUNNY_STORAGE_PASSWORD` are all set.
- **Local filesystem** is used otherwise (files saved to `UPLOAD_DIR` and served via `/api/uploads/`).

## Real-time Provider Auto-detection

- If `PUSHER_HOST` is set → connects to **Soketi** (self-hosted) at that host.
- If `PUSHER_CLUSTER` is set → connects to **Pusher Cloud**.

---

# Common Operations (Docker)

## Start / Stop

```bash
# Start
docker compose up -d

# Stop (keeps data)
docker compose down

# Stop and delete ALL data
docker compose down -v
```

## View Logs

```bash
# All services
docker compose logs -f

# Only app
docker compose logs -f app

# Only database
docker compose logs -f db
```

## Rebuild after code changes

```bash
docker compose up -d --build
```

## Seed database (create test data)

```bash
# One-time seed
docker compose run --rm -e SEED_DB=true app npm start

# Or set in .env and restart
SEED_DB=true docker compose up -d --build
# After seed completes, remove SEED_DB from .env
```

## Database management

```bash
# Open psql shell
docker compose exec db psql -U kanban -d kanban

# Backup database
docker compose exec db pg_dump -U kanban kanban > backup.sql

# Restore database
docker compose exec -T db psql -U kanban kanban < backup.sql
```

## Update application

```bash
cd kanban
git pull
docker compose up -d --build
```

---

# Using with Domain Name (Optional)

If you have a domain name pointing to your VPS, update `.env`:

```bash
NEXTAUTH_URL="https://yourdomain.com/kanban"
NEXT_PUBLIC_PUSHER_HOST="yourdomain.com"
```

For HTTPS, put an Nginx reverse proxy in front:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /kanban {
        proxy_pass http://localhost:3000/kanban;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

# Test Accounts (after seed)

| Username   | Password      | Role        |
|------------|---------------|-------------|
| admin      | admin123      | Super Admin |
| somchai    | password123   | Admin       |
| siriporn   | password123   | User        |
| wichai     | password123   | User        |
| nattaya    | password123   | User        |
| guest      | password123   | Guest       |

---

# Troubleshooting

### App won't start — "prisma db push failed"
```bash
# Check if database is ready
docker compose logs db
# Wait for healthcheck, then restart app
docker compose restart app
```

### Port 3000 already in use
```bash
# Find and kill the process
sudo lsof -i :3000
sudo kill -9 <PID>
# Or change port in docker-compose.yml: "8080:3000"
```

### Reset everything from scratch
```bash
docker compose down -v
SEED_DB=true docker compose up -d --build
```

### Permission denied on uploads
```bash
docker compose exec app mkdir -p /app/uploads
docker compose exec app chown -R nextjs:nodejs /app/uploads
```

### Vercel: File uploads not working
Make sure all three Bunny CDN variables are set:
```
BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
BUNNY_STORAGE_USERNAME=your-zone-name
BUNNY_STORAGE_PASSWORD=your-api-key
```
