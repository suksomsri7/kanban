# Kanban Board — API Documentation (ฉบับสมบูรณ์)

> เอกสารรวม API ทั้งหมดของระบบ Kanban Board
> รวมทั้ง Main API (สำหรับ n8n / Zapier / Script) และ Agent Webhook API (สำหรับ AI Agent)

---

# ภาค 1 — Main API (`/api/v1`)

> REST API สำหรับ external integrations (n8n, Zapier, Make, custom scripts)
> Base URL: `https://<YOUR_DOMAIN>/api/v1`

---

## 1.1 Authentication

### Method 1: Per-User API Key (แนะนำ)

สร้างและจัดการผ่าน Admin UI (`/admin/api-keys`) แต่ละ key ผูกกับ user และมี granular permissions

```
x-api-key: kbn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```bash
curl -H "x-api-key: kbn_abc123..." https://kanban.example.com/api/v1/boards
```

### Method 2: Legacy Bearer Token

ใช้ `API_KEY` environment variable ทำงานในนามของ user ที่กำหนดโดย `API_AGENT_USERNAME`

```
Authorization: Bearer <API_KEY>
```

> Per-user API key ใช้กับ `Authorization: Bearer` header ได้เช่นกัน ระบบจะตรวจ DB ก่อน แล้ว fallback ไปที่ env variable

---

## 1.2 API Key Scopes (Permissions)

### Broad Scopes

| Scope | ใช้ทำอะไร |
|-------|----------|
| `boards:read` | ดูรายการ boards, board detail |
| `boards:write` | สร้าง, แก้ไข, ลบ boards |
| `brands:read` | ดูรายการ brands |
| `users:read` | ดูรายการ users |
| `cards:read` | ดู/ค้นหา cards, card detail |
| `cards:write` | สร้าง, แก้ไข, ลบ cards; toggle labels/assignees |
| `cards:move` | ย้าย cards ระหว่าง columns |
| `comments:read` | ดู comments |
| `comments:write` | สร้าง comments |
| `subtasks:read` | ดู subtasks |
| `subtasks:write` | สร้าง, แก้ไข, ลบ subtasks |

### Granular Scopes (กำหนดเฉพาะสิทธิที่ต้องการ)

| Scope | ใช้ทำอะไร |
|-------|----------|
| `boards:create` | สร้าง board เท่านั้น |
| `boards:edit` | แก้ไข board เท่านั้น |
| `boards:delete` | ลบ (archive) board เท่านั้น |
| `cards:create` | สร้าง card เท่านั้น |
| `cards:edit` | แก้ไข card, toggle labels/assignees |
| `cards:delete` | ลบ card เท่านั้น |
| `comments:create` | สร้าง comment เท่านั้น |
| `subtasks:create` | สร้าง subtask เท่านั้น |
| `subtasks:edit` | แก้ไข subtask เท่านั้น |
| `subtasks:delete` | ลบ subtask เท่านั้น |

---

## 1.3 Response Format

**สำเร็จ:**
```json
{ "success": true, "data": { ... } }
```

**ผิดพลาด:**
```json
{ "success": false, "error": "Error message" }
```

---

## 1.4 Data Model

```
Brand → Board → Column → Card
```

- **Brand** — กลุ่มโปรเจกต์/ลูกค้า
- **Board** — กระดาน Kanban มี columns, labels, members
- **Column** — ช่องในบอร์ด (เช่น "To Do", "In Progress", "Done")
- **Card** — งาน มี title, description, priority, dueDate, labels, assignees, subtasks, comments, attachments
- **Priority:** `LOW` | `MEDIUM` | `HIGH` | `URGENT`

---

## 1.5 Endpoints — Main API

### Current User / Key Info

```
GET /api/v1/me
```
**Scope:** ไม่ต้องมี — ใช้ตรวจว่า key ทำงานได้

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "username": "sharky", "displayName": "Sharky", "role": "ADMIN" },
    "scopes": ["boards:read", "cards:write", ...],
    "apiKeyId": "cmm..."
  }
}
```

---

### Brands

```
GET /api/v1/brands
```
**Scope:** `brands:read`

ดู brands ทั้งหมดพร้อม owners, members, board count

---

### Boards

```
GET /api/v1/boards
```
**Scope:** `boards:read`

ดู boards ทั้งหมดพร้อม columns (id, title), labels, members

---

```
GET /api/v1/boards/{boardId}
```
**Scope:** `boards:read`

Board detail พร้อม columns → cards → assignees, labels, subtasks, counts

---

```
POST /api/v1/boards
Content-Type: application/json
```
**Scope:** `boards:write` หรือ `boards:create`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | YES | ชื่อบอร์ด (1-100 ตัวอักษร) |
| `description` | string | no | คำอธิบาย |
| `brandId` | string | no | Brand ID ที่ต้องการผูก |
| `columns` | string[] | no | ชื่อ columns (default: To Do, In Progress, Done) |

```json
{
  "title": "Marketing Board",
  "description": "Q2 marketing campaigns",
  "brandId": "brand_id_here",
  "columns": ["Backlog", "In Progress", "Review", "Done"]
}
```

---

```
PATCH /api/v1/boards/{boardId}
Content-Type: application/json
```
**Scope:** `boards:write` หรือ `boards:edit`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | ชื่อใหม่ |
| `description` | string / null | คำอธิบายใหม่ (null = ลบ) |
| `color` | string / null | สีบอร์ด (null = ลบ) |

---

```
DELETE /api/v1/boards/{boardId}
```
**Scope:** `boards:write` หรือ `boards:delete`

Archive board (soft delete)

---

### Cards

```
GET /api/v1/cards?q=&boardId=&columnId=&priority=&assigneeId=&limit=50&offset=0
```
**Scope:** `cards:read`

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | ค้นหา title & description |
| `boardId` | string | กรองตาม board |
| `columnId` | string | กรองตาม column |
| `priority` | string | LOW / MEDIUM / HIGH / URGENT |
| `assigneeId` | string | กรองตาม assignee |
| `limit` | number | จำนวนสูงสุด (default 50, max 200) |
| `offset` | number | ข้าม N รายการ |

Response: `{ cards: [...], total, limit, offset }`

---

```
GET /api/v1/cards/{cardId}
```
**Scope:** `cards:read`

Card detail พร้อม column, assignees, labels, comments, attachments, subtasks, dependencies

---

```
POST /api/v1/cards
Content-Type: application/json
```
**Scope:** `cards:write` หรือ `cards:create`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | YES | ชื่อ card (1-200 ตัวอักษร) |
| `columnId` | string | YES | Column ID ปลายทาง |
| `description` | string | no | คำอธิบาย (Markdown) |
| `priority` | string | no | LOW / MEDIUM / HIGH / URGENT |
| `dueDate` | string | no | ISO date: "2026-03-20" |
| `labelIds` | string[] | no | Label IDs |
| `assigneeIds` | string[] | no | User IDs |
| `subtasks` | string[] หรือ object[] | no | Checklist items |

**ตัวอย่าง:**
```json
{
  "title": "Social Media Campaign",
  "columnId": "cm_column_todo",
  "priority": "MEDIUM",
  "dueDate": "2026-03-25",
  "assigneeIds": ["cm_user_somchai"],
  "subtasks": ["Content Create", "Approve Content", "Create Media", "Schedule Post", "Done"]
}
```

---

```
PATCH /api/v1/cards/{cardId}
Content-Type: application/json
```
**Scope:** `cards:write` หรือ `cards:edit`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | ชื่อใหม่ |
| `description` | string / null | คำอธิบายใหม่ |
| `priority` | string | LOW / MEDIUM / HIGH / URGENT |
| `dueDate` | string / null | วันที่ (null = ลบ) |

---

```
DELETE /api/v1/cards/{cardId}
```
**Scope:** `cards:write` หรือ `cards:delete`

---

```
POST /api/v1/cards/{cardId}/move
Content-Type: application/json
```
**Scope:** `cards:move`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columnId` | string | YES | Column ปลายทาง (ใน board เดียวกัน) |
| `position` | "top" / "bottom" / number | no | ตำแหน่ง (default: bottom) |

---

```
POST /api/v1/cards/{cardId}/labels
```
**Scope:** `cards:write` หรือ `cards:edit`

Body: `{ "labelId": "..." }` — มีอยู่แล้ว = ลบ, ไม่มี = เพิ่ม

---

```
POST /api/v1/cards/{cardId}/assignees
```
**Scope:** `cards:write` หรือ `cards:edit`

Body: `{ "userId": "..." }` — assign อยู่แล้ว = ลบ, ไม่ได้ assign = เพิ่ม

---

### Comments

```
GET /api/v1/cards/{cardId}/comments
```
**Scope:** `comments:read`

---

```
POST /api/v1/cards/{cardId}/comments
```
**Scope:** `comments:write` หรือ `comments:create`

Body: `{ "content": "..." }`

Comment สร้างในนามของ API key owner

---

### Subtasks

```
GET /api/v1/cards/{cardId}/subtasks
```
**Scope:** `subtasks:read`

---

```
POST /api/v1/cards/{cardId}/subtasks
```
**Scope:** `subtasks:write` หรือ `subtasks:create`

Body: `{ "title": "..." }`

---

```
PATCH /api/v1/cards/{cardId}/subtasks/{subtaskId}
```
**Scope:** `subtasks:write` หรือ `subtasks:edit`

Body: `{ "title": "...", "isCompleted": true }`

---

```
DELETE /api/v1/cards/{cardId}/subtasks/{subtaskId}
```
**Scope:** `subtasks:write` หรือ `subtasks:delete`

---

### Users

```
GET /api/v1/users
```
**Scope:** `users:read`

ดู users ทั้งหมด (id, username, displayName, role)

---

## 1.6 Quick Reference — Main API

| Action | Method | Path | Scope |
|--------|--------|------|-------|
| ดู key info | `GET` | `/api/v1/me` | — |
| ดู brands | `GET` | `/api/v1/brands` | `brands:read` |
| ดู boards | `GET` | `/api/v1/boards` | `boards:read` |
| Board detail | `GET` | `/api/v1/boards/{id}` | `boards:read` |
| สร้าง board | `POST` | `/api/v1/boards` | `boards:write` / `boards:create` |
| แก้ไข board | `PATCH` | `/api/v1/boards/{id}` | `boards:write` / `boards:edit` |
| ลบ board | `DELETE` | `/api/v1/boards/{id}` | `boards:write` / `boards:delete` |
| ค้นหา cards | `GET` | `/api/v1/cards?q=&boardId=` | `cards:read` |
| Card detail | `GET` | `/api/v1/cards/{id}` | `cards:read` |
| สร้าง card | `POST` | `/api/v1/cards` | `cards:write` / `cards:create` |
| แก้ไข card | `PATCH` | `/api/v1/cards/{id}` | `cards:write` / `cards:edit` |
| ลบ card | `DELETE` | `/api/v1/cards/{id}` | `cards:write` / `cards:delete` |
| ย้าย card | `POST` | `/api/v1/cards/{id}/move` | `cards:move` |
| Toggle label | `POST` | `/api/v1/cards/{id}/labels` | `cards:write` / `cards:edit` |
| Toggle assignee | `POST` | `/api/v1/cards/{id}/assignees` | `cards:write` / `cards:edit` |
| ดู comments | `GET` | `/api/v1/cards/{id}/comments` | `comments:read` |
| เพิ่ม comment | `POST` | `/api/v1/cards/{id}/comments` | `comments:write` / `comments:create` |
| ดู subtasks | `GET` | `/api/v1/cards/{id}/subtasks` | `subtasks:read` |
| สร้าง subtask | `POST` | `/api/v1/cards/{id}/subtasks` | `subtasks:write` / `subtasks:create` |
| แก้ไข subtask | `PATCH` | `/api/v1/cards/{id}/subtasks/{sid}` | `subtasks:write` / `subtasks:edit` |
| ลบ subtask | `DELETE` | `/api/v1/cards/{id}/subtasks/{sid}` | `subtasks:write` / `subtasks:delete` |
| ดู users | `GET` | `/api/v1/users` | `users:read` |

---

# ภาค 2 — Agent Webhook API (`/api/v1/agent`)

> API สำหรับ AI Agent โดยเฉพาะ ใช้ Webhook URL ที่สร้างอัตโนมัติจาก Column Settings
> **แยกจาก Main API** — ไม่ต้องใช้ API Key แบบเดิม

---

## 2.1 Authentication

ใช้ **Webhook URL** ที่มี API Key ฝังอยู่ใน query parameter `?key=...`

```
https://<DOMAIN>/api/v1/agent/{columnId}?key=oc_xxxxxxxxx...
```

- ไม่ต้องส่ง `Authorization` หรือ `x-api-key` header
- key อยู่ใน URL แล้ว

---

## 2.2 วิธีตั้งค่า

1. เปิด Board → คลิก **Settings** (ไอคอนเฟือง) ที่คอลัมน์ที่ต้องการ
2. เลือก Automation Type: **Agent**
3. ระบบจะสร้าง **Webhook URL** ให้อัตโนมัติ
4. เปิด **Permissions** ที่ต้องการ
5. ตั้ง Status เป็น **Run**
6. กด **Save** แล้ว copy Webhook URL ไปใช้กับ Agent

---

## 2.3 Agent Permissions

| Permission | ใช้ทำอะไร |
|------------|----------|
| `canCreateCard` | สร้าง card ใหม่ |
| `canDeleteCard` | ลบ card |
| `canMoveCard` | ย้าย card ไป column อื่น (Move / Stage By) |
| `canDuplicateCard` | Duplicate card |
| `canReferCard` | Refer card ไป board อื่น |
| `canEditCardTitle` | แก้ไขชื่อ card |
| `canEditCardDescription` | แก้ไข description |
| `canEditCardPriority` | แก้ไข priority |
| `canEditCardDueDate` | แก้ไข due date |
| `canEditCardLabels` | เพิ่ม/ลบ labels |
| `canEditCardAssignees` | เพิ่ม/ลบ assignees |
| `canManageSubtasks` | สร้าง/แก้ไข/ลบ subtasks (checklist) |
| `canComment` | เพิ่ม comment |

---

## 2.4 Endpoints — Agent Webhook API

> ทุก path ต่อท้าย Webhook URL เช่น `{WEBHOOK_URL}/cards/{cardId}/move`
> Response format: `{"success": true, "data": {...}}` หรือ `{"success": false, "error": "..."}`

---

### ดูข้อมูล Column + Cards + Board Info

```
GET {WEBHOOK_URL}
```
**Permission:** ไม่ต้องมี

ได้: column info, board info (columns ทั้งหมด, labels), cards ทั้งหมดในคอลัมน์, permissions ที่เปิดอยู่

**Response ตัวอย่าง:**
```json
{
  "success": true,
  "data": {
    "column": { "id": "...", "title": "Backlog" },
    "board": {
      "id": "...", "title": "My Board",
      "columns": [{ "id": "...", "title": "Backlog" }, { "id": "...", "title": "Done" }],
      "labels": [{ "id": "...", "name": "Bug", "color": "#ef4444" }]
    },
    "cards": [...],
    "permissions": { "canCreateCard": true, "canMoveCard": true, ... }
  }
}
```

---

### สร้าง Card

```
POST {WEBHOOK_URL}/cards
Content-Type: application/json
```
**Permission:** `canCreateCard`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | YES | ชื่อ card |
| `description` | string | no | คำอธิบาย |
| `priority` | string | no | LOW / MEDIUM / HIGH / URGENT (default: MEDIUM) |
| `dueDate` | string | no | ISO date: "2026-04-01" |
| `labelIds` | string[] | no | Label IDs (จาก board info) |
| `assigneeIds` | string[] | no | User IDs |
| `subtasks` | string[] หรือ object[] | no | Checklist items |

```json
{
  "title": "New task",
  "priority": "HIGH",
  "subtasks": ["Step 1", "Step 2", "Step 3"]
}
```

---

### ดู Card รายละเอียด

```
GET {WEBHOOK_URL}/cards/{cardId}
```
**Permission:** ไม่ต้องมี

Card detail พร้อม assignees, labels, comments, subtasks, attachments, dependencies

---

### แก้ไข Card

```
PATCH {WEBHOOK_URL}/cards/{cardId}
Content-Type: application/json
```
**Permission:** แต่ละ field ตรวจ permission แยก

| Field | Permission ที่ต้องมี |
|-------|---------------------|
| `title` | `canEditCardTitle` |
| `description` | `canEditCardDescription` |
| `priority` | `canEditCardPriority` |
| `dueDate` | `canEditCardDueDate` |

ส่งเฉพาะ field ที่ต้องการแก้:
```json
{ "title": "Updated title", "priority": "URGENT" }
```

---

### ลบ Card

```
DELETE {WEBHOOK_URL}/cards/{cardId}
```
**Permission:** `canDeleteCard`

---

### ย้าย Card (Move / Stage By)

```
POST {WEBHOOK_URL}/cards/{cardId}/move
Content-Type: application/json
```
**Permission:** `canMoveCard`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetColumnId` | string | YES | Column ปลายทาง |
| `position` | "top" / "bottom" / number | no | ตำแหน่ง (default: bottom) |

ย้ายได้เฉพาะภายใน board เดียวกัน

```json
{ "targetColumnId": "col_done_id", "position": "top" }
```

---

### Duplicate Card

```
POST {WEBHOOK_URL}/cards/{cardId}/duplicate
Content-Type: application/json
```
**Permission:** `canDuplicateCard`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetColumnId` | string | no | Column ปลายทาง (ไม่ส่ง = column เดิม) |

Duplicate ได้เฉพาะภายใน board เดียวกัน

---

### Refer Card (แสดง Card ที่ Board อื่น)

```
POST {WEBHOOK_URL}/cards/{cardId}/refer
Content-Type: application/json
```
**Permission:** `canReferCard`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetColumnId` | string | YES | Column ของ board อื่น |

Card เดิมยังอยู่ที่ board เดิม แต่จะแสดงอ้างอิงที่ board ปลายทางด้วย

---

### Toggle Label

```
POST {WEBHOOK_URL}/cards/{cardId}/labels
Content-Type: application/json
```
**Permission:** `canEditCardLabels`

Body: `{ "labelId": "..." }` — มีอยู่แล้ว = ลบ, ไม่มี = เพิ่ม

---

### Toggle Assignee

```
POST {WEBHOOK_URL}/cards/{cardId}/assignees
Content-Type: application/json
```
**Permission:** `canEditCardAssignees`

Body: `{ "userId": "..." }` — assign อยู่แล้ว = ลบ, ไม่ได้ assign = เพิ่ม

---

### ดู Subtasks

```
GET {WEBHOOK_URL}/cards/{cardId}/subtasks
```
**Permission:** ไม่ต้องมี

---

### เพิ่ม Subtask

```
POST {WEBHOOK_URL}/cards/{cardId}/subtasks
Content-Type: application/json
```
**Permission:** `canManageSubtasks`

Body: `{ "title": "..." }`

---

### แก้ไข Subtask

```
PATCH {WEBHOOK_URL}/cards/{cardId}/subtasks/{subtaskId}
Content-Type: application/json
```
**Permission:** `canManageSubtasks`

Body: `{ "title": "...", "isCompleted": true }`

---

### ลบ Subtask

```
DELETE {WEBHOOK_URL}/cards/{cardId}/subtasks/{subtaskId}
```
**Permission:** `canManageSubtasks`

---

### ดู Comments

```
GET {WEBHOOK_URL}/cards/{cardId}/comments
```
**Permission:** ไม่ต้องมี

---

### เพิ่ม Comment

```
POST {WEBHOOK_URL}/cards/{cardId}/comments
Content-Type: application/json
```
**Permission:** `canComment`

Body: `{ "content": "..." }`

---

### อ่าน Prompt ที่ตั้งไว้

```
GET {WEBHOOK_URL}/prompt
```
**Permission:** ไม่ต้องมี (ใช้ได้แม้ automation status เป็น pause)

**Response:**
```json
{
  "success": true,
  "data": {
    "prompt": "ข้อความ prompt ที่ตั้งไว้ใน column settings...",
    "automationStatus": "run"
  }
}
```

---

### ดู Automation Status

```
GET {WEBHOOK_URL}/status
```
**Permission:** ไม่ต้องมี (ใช้ได้แม้ automation status เป็น pause)

**Response:**
```json
{ "success": true, "data": { "automationStatus": "run" } }
```

---

### เปลี่ยน Automation Status (เปิด/ปิด)

```
PATCH {WEBHOOK_URL}/status
Content-Type: application/json
```
**Permission:** ไม่ต้องมี (ใช้ได้แม้ automation status เป็น pause)

Body: `{ "automationStatus": "run" }` หรือ `{ "automationStatus": "pause" }`

**Response:**
```json
{ "success": true, "data": { "automationStatus": "run" } }
```

---

### Agent Prompt Guide (Public)

```
GET /api/v1/agent/agent-prompt
```
**Auth:** ไม่ต้องมี (public)

ดาวน์โหลดเนื้อหา System Prompt template สำหรับ Agent (plain text)

---

## 2.5 Quick Reference — Agent Webhook API

### Cards

| Action | Method | Path | Permission |
|--------|--------|------|------------|
| ดู column + cards | `GET` | `/` | — |
| สร้าง card | `POST` | `/cards` | `canCreateCard` |
| สร้าง card + checklist | `POST` | `/cards` | `canCreateCard` |
| ดู card detail | `GET` | `/cards/{cardId}` | — |
| แก้ไข card | `PATCH` | `/cards/{cardId}` | per-field |
| ลบ card | `DELETE` | `/cards/{cardId}` | `canDeleteCard` |
| ย้าย card | `POST` | `/cards/{cardId}/move` | `canMoveCard` |
| Duplicate card | `POST` | `/cards/{cardId}/duplicate` | `canDuplicateCard` |
| Refer card | `POST` | `/cards/{cardId}/refer` | `canReferCard` |

### Labels & Assignees

| Action | Method | Path | Permission |
|--------|--------|------|------------|
| Toggle label | `POST` | `/cards/{cardId}/labels` | `canEditCardLabels` |
| Toggle assignee | `POST` | `/cards/{cardId}/assignees` | `canEditCardAssignees` |

### Subtasks (Checklist)

| Action | Method | Path | Permission |
|--------|--------|------|------------|
| ดู subtasks | `GET` | `/cards/{cardId}/subtasks` | — |
| เพิ่ม subtask | `POST` | `/cards/{cardId}/subtasks` | `canManageSubtasks` |
| แก้ไข subtask | `PATCH` | `/cards/{cardId}/subtasks/{sid}` | `canManageSubtasks` |
| ลบ subtask | `DELETE` | `/cards/{cardId}/subtasks/{sid}` | `canManageSubtasks` |

### Comments

| Action | Method | Path | Permission |
|--------|--------|------|------------|
| ดู comments | `GET` | `/cards/{cardId}/comments` | — |
| เพิ่ม comment | `POST` | `/cards/{cardId}/comments` | `canComment` |

### Prompt & Status

| Action | Method | Path | Permission |
|--------|--------|------|------------|
| อ่าน prompt | `GET` | `/prompt` | — (ใช้ได้แม้ pause) |
| ดู status | `GET` | `/status` | — (ใช้ได้แม้ pause) |
| เปลี่ยน status | `PATCH` | `/status` | — (ใช้ได้แม้ pause) |

> Path ทั้งหมดต่อท้าย Webhook URL เช่น `{WEBHOOK_URL}/cards/{cardId}/move`

---

# ภาค 3 — ตัวอย่างการใช้งาน

## 3.1 ตัวอย่าง Main API

### cURL

```bash
# ตรวจสอบ key
curl -H "x-api-key: kbn_your_key" \
  https://kanban.example.com/api/v1/me

# ดู boards
curl -H "x-api-key: kbn_your_key" \
  https://kanban.example.com/api/v1/boards

# สร้าง card
curl -X POST \
  -H "x-api-key: kbn_your_key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy v2.0","columnId":"col_id","priority":"URGENT"}' \
  https://kanban.example.com/api/v1/cards

# สร้าง card + checklist
curl -X POST \
  -H "x-api-key: kbn_your_key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Campaign","columnId":"col_id","subtasks":["Create","Review","Publish"]}' \
  https://kanban.example.com/api/v1/cards

# สร้าง board
curl -X POST \
  -H "x-api-key: kbn_your_key" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Board","columns":["Backlog","In Progress","Done"]}' \
  https://kanban.example.com/api/v1/boards
```

### Python

```python
import requests

BASE = "https://kanban.example.com/api/v1"
HEADERS = {"x-api-key": "kbn_your_key_here"}

# ดู boards
boards = requests.get(f"{BASE}/boards", headers=HEADERS).json()

# สร้าง card
card = requests.post(f"{BASE}/cards", headers=HEADERS, json={
    "title": "Automated task",
    "columnId": "your_column_id",
    "priority": "MEDIUM",
    "subtasks": ["Step 1", "Step 2"]
}).json()

# ย้าย card
requests.post(f"{BASE}/cards/{card['data']['id']}/move", headers=HEADERS, json={
    "columnId": "done_column_id",
    "position": "top"
})
```

### JavaScript / Node.js

```javascript
const BASE = "https://kanban.example.com/api/v1";
const headers = { "x-api-key": "kbn_your_key_here" };

// ดู boards
const boards = await fetch(`${BASE}/boards`, { headers }).then(r => r.json());

// สร้าง card
const card = await fetch(`${BASE}/cards`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Automated task",
    columnId: "your_column_id",
    priority: "MEDIUM",
  }),
}).then(r => r.json());
```

### n8n / Zapier / Make

ใช้ **HTTP Request** node:
- **URL:** `https://kanban.example.com/api/v1/cards`
- **Method:** `POST`
- **Headers:** `x-api-key: kbn_your_key_here`
- **Body (JSON):**
```json
{
  "title": "New task from webhook",
  "columnId": "your_column_id",
  "priority": "HIGH",
  "subtasks": ["Step 1", "Step 2", "Step 3"]
}
```

---

## 3.2 ตัวอย่าง Agent Webhook API

### cURL

```bash
WEBHOOK="https://kanban.example.com/api/v1/agent/col123?key=oc_abc..."

# ดู column info + cards
curl "$WEBHOOK"

# สร้าง card
curl -X POST "$WEBHOOK/cards" \
  -H "Content-Type: application/json" \
  -d '{"title":"Agent task","priority":"HIGH","subtasks":["Step 1","Step 2"]}'

# แก้ไข card
curl -X PATCH "$WEBHOOK/cards/card_id" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated","priority":"URGENT"}'

# ย้าย card
curl -X POST "$WEBHOOK/cards/card_id/move" \
  -H "Content-Type: application/json" \
  -d '{"targetColumnId":"col_done","position":"top"}'

# Duplicate card
curl -X POST "$WEBHOOK/cards/card_id/duplicate" \
  -H "Content-Type: application/json" \
  -d '{}'

# Toggle label
curl -X POST "$WEBHOOK/cards/card_id/labels" \
  -H "Content-Type: application/json" \
  -d '{"labelId":"label_id"}'

# เพิ่ม subtask
curl -X POST "$WEBHOOK/cards/card_id/subtasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"New subtask"}'

# เช็ค subtask เสร็จ
curl -X PATCH "$WEBHOOK/cards/card_id/subtasks/sub_id" \
  -H "Content-Type: application/json" \
  -d '{"isCompleted":true}'

# เพิ่ม comment
curl -X POST "$WEBHOOK/cards/card_id/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Done!"}'

# ลบ card
curl -X DELETE "$WEBHOOK/cards/card_id"
```

### System Prompt สำหรับ Agent

```
Webhook URL: https://kanban.example.com/api/v1/agent/clxyz123?key=oc_ABCDabcd1234567890...

คุณเป็น Agent จัดการ Kanban Board
- เรียก GET {URL} เพื่อดู cards ทั้งหมด + board info + permissions
- ไม่ต้องส่ง Header ใดๆ — key อยู่ใน URL แล้ว

เมื่อฉันบอก "สร้าง card ..." → POST {URL}/cards
เมื่อฉันบอก "ย้าย card X ไป Done" → เรียก GET เพื่อหา column "Done" แล้ว POST .../cards/{id}/move
เมื่อฉันบอก "เช็ค subtask เสร็จ" → GET .../cards/{id}/subtasks → PATCH .../subtasks/{sid}
เมื่อฉันบอก "duplicate card" → POST .../cards/{id}/duplicate

ทำงานตาม permissions ที่ GET / แสดงมา ถ้าไม่มีสิทธิ์ให้บอกผู้ใช้
```

---

# ภาค 4 — Error Codes & หมายเหตุ

## Error Codes

| HTTP | ความหมาย |
|------|---------|
| 200 | สำเร็จ |
| 400 | Request ไม่ถูกต้อง / validation error |
| 401 | ไม่ได้ authenticate — key ไม่ถูกต้องหรือไม่ได้ส่ง |
| 403 | ไม่มีสิทธิ์ — key ถูก disable, หมดอายุ, หรือไม่มี scope ที่ต้องการ |
| 404 | ไม่พบข้อมูล |
| 500 | Server error |

## หมายเหตุสำคัญ

### Main API
- API keys ถูก **hash ด้วย SHA-256** ก่อนเก็บ — raw key ไม่ถูกบันทึก
- Key แสดง **ครั้งเดียว** ตอนสร้าง — เก็บให้ดี
- ใช้ **scope น้อยที่สุด** ที่จำเป็นสำหรับแต่ละ integration
- ตั้ง **วันหมดอายุ** สำหรับ integration ชั่วคราว
- Key สืบทอด **identity ของ user** — activity log แสดงว่า user ไหนทำ

### Agent Webhook API
- **แยกจาก Main API** — ไม่ต้องใช้ API Key แบบเดิม
- **Scoped per-board** — Agent จัดการ Card ใน Board เดียวกันกับคอลัมน์ที่ตั้ง Webhook (สร้าง card ใหม่ที่คอลัมน์ webhook, card ที่ย้ายไปคอลัมน์อื่นยังจัดการต่อได้)
- **ย้าย Card** ได้เฉพาะภายใน Board เดียวกัน (ข้าม Board ใช้ Refer)
- **Automation Status** ต้องเป็น **Run** ถึงจะเรียก API ได้ (Pause = 403)
- **Regenerate Webhook URL** จะเปลี่ยน API Key ใหม่ — URL เก่าใช้ไม่ได้

---

## ความแตกต่างระหว่าง Main API vs Agent Webhook API

| | Main API | Agent Webhook API |
|---|----------|-------------------|
| **Base URL** | `/api/v1` | `/api/v1/agent/{columnId}` |
| **Authentication** | `x-api-key` header | `?key=` ใน URL |
| **Scope** | Board, Brand, Card, User ทั้งระบบ | เฉพาะ Card ใน Board เดียวกัน |
| **เหมาะสำหรับ** | n8n, Zapier, Make, Script | AI Agent (ChatGPT, Claude, etc.) |
| **จัดการ Board** | ได้ (create, edit, delete) | ไม่ได้ |
| **จัดการ Brand** | ได้ (read) | ไม่ได้ |
| **Move ข้าม Board** | ไม่ได้ | ไม่ได้ (ใช้ Refer แทน) |
| **Duplicate** | ไม่มี endpoint | มี |
| **Refer** | ไม่มี endpoint | มี |
| **ตั้งค่า** | Admin → API Keys | Column Settings → Agent |
