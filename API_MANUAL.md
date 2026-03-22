# Kanban Board — API Manual

> คู่มือ API ฉบับสมบูรณ์ — รวมทั้ง Main API และ Agent API

---

# ภาค 1 — Main API (`/api/v1`)

> REST API สำหรับ external integrations (n8n, Zapier, Make, custom scripts)
> Base URL: `https://<YOUR_DOMAIN>/api/v1`

---

## 1.1 Authentication

### Method 1: Per-User API Key (แนะนำ)

สร้างและจัดการผ่าน Admin UI (`/admin/api-keys`) แต่ละ key ผูกกับ user และมี granular permissions

```bash
curl -H "x-api-key: kbn_abc123..." https://kanban.example.com/api/v1/boards
```

### Method 2: Legacy Bearer Token

ใช้ `API_KEY` environment variable ทำงานในนามของ user ที่กำหนดโดย `API_AGENT_USERNAME`

```
Authorization: Bearer <API_KEY>
```

---

## 1.2 API Key Scopes

| Scope | ใช้ทำอะไร |
|-------|----------|
| `boards:read` | ดูรายการ boards, board detail |
| `boards:create` | สร้าง board |
| `boards:edit` | แก้ไข board |
| `boards:delete` | ลบ (archive) board |
| `brands:read` | ดูรายการ brands |
| `users:read` | ดูรายการ users |
| `cards:read` | ดู/ค้นหา cards |
| `cards:create` | สร้าง card |
| `cards:edit` | แก้ไข card, toggle labels/assignees |
| `cards:delete` | ลบ card |
| `cards:move` | ย้าย cards ระหว่าง columns |
| `comments:read` | ดู comments |
| `comments:create` | สร้าง comment |
| `subtasks:read` | ดู subtasks |
| `subtasks:create` | สร้าง subtask |
| `subtasks:edit` | แก้ไข subtask |
| `subtasks:delete` | ลบ subtask |

> มี broad scopes ด้วย: `boards:write`, `cards:write`, `comments:write`, `subtasks:write` (รวม create+edit+delete)

---

## 1.3 Response Format

```json
// สำเร็จ
{ "success": true, "data": { ... } }

// ผิดพลาด
{ "success": false, "error": "Error message" }
```

---

## 1.4 Endpoints

### ตรวจสอบ Key

```
GET /api/v1/me
```

Response: user info, scopes, apiKeyId

---

### Brands

```
GET /api/v1/brands                        → brands:read
```

---

### Boards

```
GET    /api/v1/boards                     → boards:read
GET    /api/v1/boards/{boardId}           → boards:read  (detail + columns + cards)
POST   /api/v1/boards                     → boards:create
PATCH  /api/v1/boards/{boardId}           → boards:edit
DELETE /api/v1/boards/{boardId}           → boards:delete
```

**POST Body:**
```json
{
  "title": "Marketing Board",
  "description": "Q2 campaigns",
  "brandId": "brand_id",
  "columns": ["Backlog", "In Progress", "Review", "Done"]
}
```

**PATCH Body:** `{ "title": "...", "description": "...", "color": "..." }`

---

### Cards

```
GET    /api/v1/cards?q=&boardId=&columnId=&priority=&assigneeId=&limit=50&offset=0   → cards:read
GET    /api/v1/cards/{cardId}             → cards:read
POST   /api/v1/cards                      → cards:create
PATCH  /api/v1/cards/{cardId}             → cards:edit
DELETE /api/v1/cards/{cardId}             → cards:delete
POST   /api/v1/cards/{cardId}/move        → cards:move
POST   /api/v1/cards/{cardId}/labels      → cards:edit     (toggle)
POST   /api/v1/cards/{cardId}/assignees   → cards:edit     (toggle)
```

**POST /cards Body:**
```json
{
  "title": "Social Media Campaign",
  "columnId": "col_id",
  "priority": "MEDIUM",
  "dueDate": "2026-03-25",
  "assigneeIds": ["user_id"],
  "subtasks": ["Create Content", "Review", "Publish"]
}
```

**POST /move Body:** `{ "columnId": "col_done", "position": "top" }`
**POST /labels Body:** `{ "labelId": "..." }`
**POST /assignees Body:** `{ "userId": "..." }`

---

### Comments

```
GET    /api/v1/cards/{cardId}/comments    → comments:read
POST   /api/v1/cards/{cardId}/comments    → comments:create
```

**POST Body:** `{ "content": "..." }`

> **File Attachments ใน Comment:**
> ใส่ Markdown syntax ใน content เพื่อแนบไฟล์:
> - รูปภาพ: `![ชื่อ](url)` → แสดงเป็นภาพ inline
> - วิดีโอ: `[video:ชื่อ](url)` → แสดงเป็น video player
> - ไฟล์อื่น: `[file:ชื่อ](url)` → แสดงเป็นลิงก์ download

---

### Subtasks

```
GET    /api/v1/cards/{cardId}/subtasks              → subtasks:read
POST   /api/v1/cards/{cardId}/subtasks              → subtasks:create
PATCH  /api/v1/cards/{cardId}/subtasks/{subtaskId}  → subtasks:edit
DELETE /api/v1/cards/{cardId}/subtasks/{subtaskId}  → subtasks:delete
```

**POST Body:** `{ "title": "..." }`
**PATCH Body:** `{ "title": "...", "isCompleted": true }`

---

### Users

```
GET /api/v1/users                         → users:read
```

---

# ภาค 2 — Agent API (`/api/v1/agent`)

> API สำหรับ AI Agent — แยกจาก Main API
> Base URL: `https://<YOUR_DOMAIN>/api/v1/agent/{columnId}`

---

## 2.1 Authentication

ส่ง header `x-api-key` ทุก request:

```bash
curl -X GET https://kanban.example.com/api/v1/agent/{columnId} \
  -H "x-api-key: agk_your_api_key_here"
```

---

## 2.2 วิธีตั้งค่า

1. เปิด Board → คลิก **Settings** (ไอคอนเฟือง) ที่คอลัมน์ที่ต้องการ
2. เลือก Automation Type: **Agent**
3. กด **Create Key** — กำหนดชื่อ, วันหมดอายุ, Permissions
4. Copy **API Key** ไปใช้งาน (แสดงครั้งเดียวตอนสร้าง)
5. ตั้ง Automation Status เป็น **Run**
6. กด **Save**

> สร้างได้หลาย Key — แต่ละ Key มีชื่อ, สิทธิ์, วันหมดอายุแยกกัน
> ชื่อ Key จะแสดงใน comment ที่ Agent สร้าง เช่น `[Agent: n8n-workflow]`

---

## 2.3 Agent Permissions

| Permission | ใช้ทำอะไร |
|------------|----------|
| `canCreateCard` | สร้าง card ใหม่ |
| `canDeleteCard` | ลบ card |
| `canMoveCard` | ย้าย card (Move / Stage By) |
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
| `canManageLabels` | จัดการ labels (ระดับ board) |
| `canUploadAttachment` | Upload attachment |
| `canAddDependency` | เพิ่ม dependency |

---

## 2.4 Endpoints

> Base URL: `https://<DOMAIN>/api/v1/agent/{columnId}`
> ทุก request ต้องส่ง header `x-api-key: agk_...`
> Response format: `{"success": true, "data": {...}}` หรือ `{"success": false, "error": "..."}`

---

### ดูข้อมูล Column + Cards + Board Info

```
GET /api/v1/agent/{columnId}
```

ได้: column info (+ prompt, automationStatus), board info (columns, labels), cards, permissions

---

### Cards

```
POST   /cards                             → canCreateCard
GET    /cards/{cardId}                    → ไม่ต้องมี
PATCH  /cards/{cardId}                    → per-field permission
DELETE /cards/{cardId}                    → canDeleteCard
POST   /cards/{cardId}/move              → canMoveCard
POST   /cards/{cardId}/duplicate         → canDuplicateCard
POST   /cards/{cardId}/refer             → canReferCard
```

**POST /cards Body:**
```json
{
  "title": "New task",
  "priority": "HIGH",
  "subtasks": ["Step 1", "Step 2"]
}
```

**PATCH Body:** `{ "title": "...", "priority": "URGENT" }` (ส่งเฉพาะ field ที่จะแก้)

| Field ที่แก้ | Permission ที่ต้องมี |
|-------------|---------------------|
| `title` | `canEditCardTitle` |
| `description` | `canEditCardDescription` |
| `priority` | `canEditCardPriority` |
| `dueDate` | `canEditCardDueDate` |

**POST /move Body:** `{ "targetColumnId": "...", "position": "top" }`
**POST /duplicate Body:** `{ "targetColumnId": "..." }` (ไม่ส่ง = column เดิม)
**POST /refer Body:** `{ "targetColumnId": "..." }` (ต้องเป็น board อื่น)

---

### Labels & Assignees

```
POST   /cards/{cardId}/labels            → canEditCardLabels
POST   /cards/{cardId}/assignees         → canEditCardAssignees
```

Body: `{ "labelId": "..." }` หรือ `{ "userId": "..." }` — มีอยู่แล้ว = ลบ, ไม่มี = เพิ่ม

---

### Subtasks (Checklist)

```
GET    /cards/{cardId}/subtasks           → ไม่ต้องมี
POST   /cards/{cardId}/subtasks           → canManageSubtasks
PATCH  /cards/{cardId}/subtasks/{sid}     → canManageSubtasks
DELETE /cards/{cardId}/subtasks/{sid}     → canManageSubtasks
```

---

### Comments

```
GET    /cards/{cardId}/comments           → ไม่ต้องมี
POST   /cards/{cardId}/comments           → canComment
```

**POST Body:** `{ "content": "..." }`

> **Agent Comment Attribution:** เมื่อ Agent API สร้าง comment ระบบจะเติม prefix `**[Agent: keyName]**` ลงใน content อัตโนมัติ
> UI จะแสดงชื่อ Agent key เป็นชื่อผู้เขียน พร้อม badge "Agent" แทนชื่อ user ของ board

> **File Attachments ใน Comment:**
> สามารถแนบ Markdown ของไฟล์ใน content ได้:
> - รูปภาพ: `![ชื่อ](url)`
> - วิดีโอ: `[video:ชื่อ](url)`
> - ไฟล์อื่นๆ: `[file:ชื่อ](url)`
>
> UI จะ render เป็นภาพ/วิดีโอ/ลิงก์ download อัตโนมัติ

---

### File Upload

```
POST   /api/upload                        → (ต้อง login — ไม่รองรับ Agent API key)
```

**Content-Type:** `multipart/form-data`
**Body:** `file` (File), `cardId` (string)

- ไฟล์เก็บบน local: `uploads/cards/{cardId}/{timestamp}_{filename}`
- ไม่จำกัดขนาดไฟล์
- เมื่อลบ card ไฟล์ที่แนบจะถูกลบอัตโนมัติ
- Response: `{ "success": true, "fileName": "...", "fileUrl": "...", "fileSize": 1234, "mimeType": "image/png" }`

---

### Prompt & Status

```
GET    /prompt                            → ไม่ต้องมี (ใช้ได้แม้ pause)
GET    /status                            → ไม่ต้องมี (ใช้ได้แม้ pause)
PATCH  /status                            → ไม่ต้องมี (ใช้ได้แม้ pause)
```

**PATCH /status Body:** `{ "automationStatus": "run" }` หรือ `{ "automationStatus": "pause" }`

---

# ภาค 3 — ตัวอย่างการใช้งาน

## 3.1 Main API

### cURL

```bash
# ดู boards
curl -H "x-api-key: kbn_your_key" \
  https://kanban.example.com/api/v1/boards

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

boards = requests.get(f"{BASE}/boards", headers=HEADERS).json()

card = requests.post(f"{BASE}/cards", headers=HEADERS, json={
    "title": "Automated task",
    "columnId": "your_column_id",
    "priority": "MEDIUM",
    "subtasks": ["Step 1", "Step 2"]
}).json()
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
  "priority": "HIGH"
}
```

---

## 3.2 Agent API

### cURL

```bash
BASE="https://kanban.example.com/api/v1/agent/col123"
KEY="agk_your_api_key_here"

# ดู column info + cards
curl -H "x-api-key: $KEY" "$BASE"

# สร้าง card
curl -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"title":"Agent task","priority":"HIGH","subtasks":["Step 1","Step 2"]}' \
  "$BASE/cards"

# แก้ไข card
curl -X PATCH -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"title":"Updated","priority":"URGENT"}' \
  "$BASE/cards/card_id"

# ย้าย card
curl -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"targetColumnId":"col_done","position":"top"}' \
  "$BASE/cards/card_id/move"

# Duplicate card
curl -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{}' "$BASE/cards/card_id/duplicate"

# เพิ่ม comment
curl -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"content":"Done!"}' "$BASE/cards/card_id/comments"

# Toggle label
curl -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"labelId":"label_id"}' "$BASE/cards/card_id/labels"

# เช็ค subtask เสร็จ
curl -X PATCH -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"isCompleted":true}' "$BASE/cards/card_id/subtasks/sub_id"

# ดู/เปลี่ยน automation status
curl -H "x-api-key: $KEY" "$BASE/status"
curl -X PATCH -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"automationStatus":"pause"}' "$BASE/status"
```

### System Prompt สำหรับ AI Agent

```
Base URL: https://kanban.example.com/api/v1/agent/clxyz123
API Key: agk_ABCDabcd1234567890...

คุณเป็น Agent จัดการ Kanban Board
- ทุก request ส่ง header: x-api-key: {API_KEY}
- เรียก GET {BASE_URL} เพื่อดู cards ทั้งหมด + board info + permissions

เมื่อฉันบอก "สร้าง card ..." → POST {BASE_URL}/cards
เมื่อฉันบอก "ย้าย card X ไป Done" → GET เพื่อหา column "Done" แล้ว POST .../cards/{id}/move
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
| 401 | ไม่ได้ authenticate — key ไม่ถูกต้อง, ถูก disable, หรือหมดอายุ |
| 403 | ไม่มีสิทธิ์ — permission ไม่เปิด หรือ automation status เป็น pause |
| 404 | ไม่พบข้อมูล |
| 500 | Server error |

---

## หมายเหตุสำคัญ

### Main API
- API keys ถูก **hash ด้วย SHA-256** ก่อนเก็บ — raw key แสดงครั้งเดียวตอนสร้าง
- ใช้ **scope น้อยที่สุด** ที่จำเป็นสำหรับแต่ละ integration
- ตั้ง **วันหมดอายุ** สำหรับ integration ชั่วคราว
- Key สืบทอด **identity ของ user** — activity log แสดงว่า user ไหนทำ

### Agent API
- **แยกจาก Main API** — ใช้ API Key ที่สร้างจาก Stage Settings
- **สร้าง Key ได้หลายตัว** — แต่ละตัวมีชื่อ, สิทธิ์, วันหมดอายุแยกกัน
- **ชื่อ Key แสดงเป็นผู้เขียน** — comment ที่ Agent สร้างจะแสดงชื่อ key เป็น author พร้อม Bot icon + badge "Agent" (ไม่แสดงชื่อ board owner)
- **Scoped per-board** — Agent จัดการ Card ใน Board เดียวกันเท่านั้น
- **ย้าย Card** ได้เฉพาะภายใน Board เดียวกัน (ข้าม Board ใช้ Refer)
- **Automation Status** ต้องเป็น **Run** ถึงจะเรียก API ได้ (Pause = 403)
- **Key ถูก hash** — raw key แสดงแค่ตอนสร้างครั้งเดียว
- **Enable/Disable** — ปิดใช้งาน key ชั่วคราวได้โดยไม่ต้องลบ

### File Storage
- ไฟล์เก็บบน **local storage**: `uploads/cards/{cardId}/{timestamp}_{filename}`
- **ไม่จำกัดขนาดไฟล์**
- ไฟล์ที่แนบจะ **ถูกลบอัตโนมัติ** เมื่อลบ card หรือลบ brand
- Comment รองรับ **ไฟล์แนบ** (รูป, วิดีโอ, เอกสาร) ผ่าน Markdown syntax ใน content

---

## เปรียบเทียบ Main API vs Agent API

| | Main API | Agent API |
|---|----------|-----------|
| **Base URL** | `/api/v1` | `/api/v1/agent/{columnId}` |
| **Authentication** | `x-api-key: kbn_...` | `x-api-key: agk_...` |
| **สร้าง Key** | Admin → API Keys | Column Settings → Agent |
| **Scope** | Board, Brand, Card, User ทั้งระบบ | เฉพาะ Card ใน Board เดียวกัน |
| **เหมาะสำหรับ** | n8n, Zapier, Make, Script | AI Agent (ChatGPT, Claude, etc.) |
| **จัดการ Board** | ได้ | ไม่ได้ |
| **Duplicate / Refer** | ไม่มี | มี |
| **Multi-key** | ต่อ user | ต่อ column |
| **ชื่อ Key ใน Comment** | ไม่มี | มี — แสดงเป็น author + badge "Agent" |
