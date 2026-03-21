# Kanban Board — Agent Skill

คุณเป็น Agent จัดการ Kanban Board ผ่าน REST API

## Config

ผู้ใช้ต้องระบุ 2 ค่านี้:

| Key | ตัวอย่าง |
|-----|---------|
| `BASE_URL` | `https://kanban.example.com/api/v1/agent/clxyz123` |
| `API_KEY` | `agk_ABCDabcd1234567890...` |

## Auth

ทุก request ส่ง header:

```
x-api-key: {API_KEY}
Content-Type: application/json
```

Response: `{"success": true, "data": {...}}` หรือ `{"success": false, "error": "..."}`

## ขั้นตอนการทำงาน

1. **เริ่มต้นเสมอ** — `GET {BASE_URL}` เพื่อดู:
   - `cards` — card ทั้งหมดในคอลัมน์
   - `board.columns` — column ทั้งหมดใน board (ใช้หา targetColumnId สำหรับ move)
   - `board.labels` — label ทั้งหมด (ใช้หา labelId)
   - `permissions` — สิทธิ์ที่เปิดอยู่ (ตรวจก่อนทำ)
2. **ทำงานตาม permissions** — ถ้าไม่มีสิทธิ์ บอกผู้ใช้
3. **Card ที่ย้ายไปคอลัมน์อื่น** ยังจัดการได้ผ่าน API เดิม (scope = board เดียวกัน)

## Endpoints

### ดูข้อมูล

| Method | Path | ได้อะไร |
|--------|------|---------|
| GET | `/` | column info, board (columns, labels), cards, permissions |
| GET | `/cards/{cardId}` | card detail + assignees, labels, subtasks, comments |
| GET | `/cards/{cardId}/subtasks` | subtask list |
| GET | `/cards/{cardId}/comments` | comment list |
| GET | `/prompt` | prompt ที่ตั้งไว้ (ใช้ได้แม้ pause) |
| GET | `/status` | automationStatus: "run" / "pause" (ใช้ได้แม้ pause) |

### สร้าง / แก้ไข / ลบ Card

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | `/cards` | canCreateCard | `{"title":"...", "priority":"HIGH", "subtasks":["a","b"]}` |
| PATCH | `/cards/{cardId}` | per-field* | `{"title":"...", "priority":"URGENT"}` |
| DELETE | `/cards/{cardId}` | canDeleteCard | — |

*PATCH ตรวจ permission ทีละ field:
- `title` → canEditCardTitle
- `description` → canEditCardDescription
- `priority` → canEditCardPriority
- `dueDate` → canEditCardDueDate

### ย้าย / Duplicate / Refer

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | `/cards/{cardId}/move` | canMoveCard | `{"targetColumnId":"...", "position":"top"}` |
| POST | `/cards/{cardId}/duplicate` | canDuplicateCard | `{"targetColumnId":"..."}` (optional) |
| POST | `/cards/{cardId}/refer` | canReferCard | `{"targetColumnId":"..."}` (board อื่น) |

> position: `"top"` / `"bottom"` / number (0-based)
> move, duplicate = ภายใน board เดียวกัน | refer = ข้าม board

### Labels & Assignees (Toggle)

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | `/cards/{cardId}/labels` | canEditCardLabels | `{"labelId":"..."}` |
| POST | `/cards/{cardId}/assignees` | canEditCardAssignees | `{"userId":"..."}` |

> มีอยู่แล้ว = ลบ, ไม่มี = เพิ่ม

### Subtasks (Checklist)

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | `/cards/{cardId}/subtasks` | canManageSubtasks | `{"title":"..."}` |
| PATCH | `/cards/{cardId}/subtasks/{sid}` | canManageSubtasks | `{"isCompleted":true}` |
| DELETE | `/cards/{cardId}/subtasks/{sid}` | canManageSubtasks | — |

### Comments

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | `/cards/{cardId}/comments` | canComment | `{"content":"..."}` |

### Automation Status

| Method | Path | Body |
|--------|------|------|
| PATCH | `/status` | `{"automationStatus":"run"}` หรือ `{"automationStatus":"pause"}` |

## Decision Logic

| ผู้ใช้พูดว่า | สิ่งที่ต้องทำ |
|-------------|-------------|
| "สร้าง card ..." | `POST /cards` with title + optional fields |
| "ย้าย X ไป Done" | `GET /` → หา columnId ของ "Done" → `POST /cards/{id}/move` |
| "เช็ค subtask เสร็จ" | `GET /cards/{id}/subtasks` → `PATCH /cards/{id}/subtasks/{sid}` with `{"isCompleted":true}` |
| "duplicate card" | `POST /cards/{id}/duplicate` |
| "assign ให้ ..." | `GET /` → หา userId จาก board members → `POST /cards/{id}/assignees` |
| "ติด label ..." | `GET /` → หา labelId จาก board.labels → `POST /cards/{id}/labels` |
| "comment ว่า ..." | `POST /cards/{id}/comments` with content |
| "ลบ card" | `DELETE /cards/{id}` |

## Error Codes

| Code | ความหมาย | ทำอย่างไร |
|------|---------|----------|
| 401 | key ผิด / หมดอายุ / ถูก disable | บอกผู้ใช้ตรวจสอบ API Key |
| 403 | ไม่มี permission หรือ automation pause | บอกผู้ใช้ว่าไม่มีสิทธิ์ทำสิ่งนี้ |
| 404 | ไม่พบ card / column | ตรวจ ID อีกครั้ง |

## Data Model

```
Board → Column → Card
Card: title, description, priority (LOW/MEDIUM/HIGH/URGENT), dueDate, labels[], assignees[], subtasks[], comments[]
```
