export const SKILL_CONTENT = `# Kanban Board — Agent Skill

คุณเป็น Agent จัดการ Kanban Board ผ่าน REST API

---

## ⚠️ CRITICAL: URL Construction Rule

ทุก request ต้องใช้ **BASE_URL** เป็นฐาน — ห้ามสร้าง URL เอง

\`\`\`
✅ ถูก: {BASE_URL}/cards
   → https://kanban.example.com/api/v1/agent/clxyz123/cards

❌ ผิด: https://kanban.example.com/api/v1/cards
   → นี่คือ Main API (ใช้ API Key คนละตัว จะได้ "Invalid API key")
\`\`\`

**Agent API Key (\`agk_...\`) ใช้ได้กับ \`{BASE_URL}\` (ที่มี \`/api/v1/agent/{columnId}\`) เท่านั้น**

---

## Config

ผู้ใช้ต้องระบุ 2 ค่านี้:

| Key | รูปแบบ | ตัวอย่าง |
|-----|--------|---------|
| \`BASE_URL\` | \`https://{domain}/api/v1/agent/{columnId}\` | \`https://kanban.suksomsri.cloud/api/v1/agent/cmmwc0fhv001104l2ofkqvcgx\` |
| \`API_KEY\` | \`agk_\` ตามด้วย hex 64 ตัว | \`agk_86b4d7f98dba4f2582d285ad9ea843865a53cd62fc41853c926f9b7b9eef4861\` |

---

## Auth

ทุก request ส่ง header:

\`\`\`
x-api-key: {API_KEY}
Content-Type: application/json
\`\`\`

Response format:
- สำเร็จ: \`{"success": true, "data": {...}}\`
- ล้มเหลว: \`{"success": false, "error": "..."}\`

---

## ขั้นตอนการทำงาน (MUST follow)

1. **เริ่มต้นเสมอ** — \`GET {BASE_URL}\` เพื่อดู:
   - \`cards\` — card ทั้งหมดในคอลัมน์
   - \`board.columns\` — column ทั้งหมดใน board (ใช้หา \`targetColumnId\` สำหรับ move)
   - \`board.labels\` — label ทั้งหมด (ใช้หา \`labelId\`)
   - \`permissions\` — สิทธิ์ที่เปิดอยู่ (**ต้องตรวจก่อนทำทุกครั้ง**)
2. **ทำงานตาม permissions** — ถ้าไม่มีสิทธิ์ แจ้งผู้ใช้
3. **Card ที่ย้ายไปคอลัมน์อื่น** ยังจัดการได้ผ่าน API เดิม (scope = board เดียวกัน)

---

## Endpoints

ทุก path ด้านล่าง **ต่อท้าย \`{BASE_URL}\`**

ตัวอย่าง: path \`/cards\` หมายถึง \`{BASE_URL}/cards\`

### ดูข้อมูล

| Method | Path | ได้อะไร |
|--------|------|---------|
| GET | \`/\` | column info, board (columns, labels, members), cards, permissions |
| GET | \`/cards/{cardId}\` | card detail + assignees, labels, subtasks, comments |
| GET | \`/cards/{cardId}/subtasks\` | subtask list |
| GET | \`/cards/{cardId}/comments\` | comment list |
| GET | \`/prompt\` | prompt ที่ตั้งไว้ (ใช้ได้แม้ pause) |
| GET | \`/status\` | automationStatus: \`"run"\` / \`"pause"\` (ใช้ได้แม้ pause) |

### สร้าง / แก้ไข / ลบ Card

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | \`/cards\` | canCreateCard | \`{"title":"...", "priority":"HIGH", "subtasks":["a","b"]}\` |
| PATCH | \`/cards/{cardId}\` | per-field* | \`{"title":"...", "priority":"URGENT"}\` |
| DELETE | \`/cards/{cardId}\` | canDeleteCard | — |

*PATCH ตรวจ permission ทีละ field:
- \`title\` → canEditCardTitle
- \`description\` → canEditCardDescription
- \`priority\` → canEditCardPriority
- \`dueDate\` → canEditCardDueDate

### ย้าย / Duplicate / Refer

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | \`/cards/{cardId}/move\` | canMoveCard | \`{"targetColumnId":"...", "position":"top"}\` |
| POST | \`/cards/{cardId}/duplicate\` | canDuplicateCard | \`{"targetColumnId":"..."}\` (optional) |
| POST | \`/cards/{cardId}/refer\` | canReferCard | \`{"targetColumnId":"..."}\` (board อื่น) |

> position: \`"top"\` / \`"bottom"\` / number (0-based)
> move, duplicate = ภายใน board เดียวกัน | refer = ข้าม board

### Labels & Assignees (Toggle)

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | \`/cards/{cardId}/labels\` | canEditCardLabels | \`{"labelId":"..."}\` |
| POST | \`/cards/{cardId}/assignees\` | canEditCardAssignees | \`{"userId":"..."}\` |

> มีอยู่แล้ว = ลบ, ไม่มี = เพิ่ม

### Subtasks (Checklist)

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | \`/cards/{cardId}/subtasks\` | canManageSubtasks | \`{"title":"..."}\` |
| PATCH | \`/cards/{cardId}/subtasks/{sid}\` | canManageSubtasks | \`{"isCompleted":true}\` |
| DELETE | \`/cards/{cardId}/subtasks/{sid}\` | canManageSubtasks | — |

### Comments

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | \`/cards/{cardId}/comments\` | canComment | \`{"content":"..."}\` |

### Automation Status

| Method | Path | Body |
|--------|------|------|
| PATCH | \`/status\` | \`{"automationStatus":"run"}\` หรือ \`{"automationStatus":"pause"}\` |

---

## curl Examples (ใช้ได้เลย — เปลี่ยนค่า BASE_URL และ API_KEY)

### ดูข้อมูลคอลัมน์ทั้งหมด
\`\`\`bash
curl -X GET \\
  -H "x-api-key: {API_KEY}" \\
  {BASE_URL}
\`\`\`

### สร้าง Card
\`\`\`bash
curl -X POST \\
  -H "x-api-key: {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "New Task", "priority": "HIGH", "description": "Task details"}' \\
  {BASE_URL}/cards
\`\`\`

### ดู Card Detail
\`\`\`bash
curl -X GET \\
  -H "x-api-key: {API_KEY}" \\
  {BASE_URL}/cards/{cardId}
\`\`\`

### ย้าย Card ไปคอลัมน์อื่น
\`\`\`bash
curl -X POST \\
  -H "x-api-key: {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"targetColumnId": "TARGET_COLUMN_ID", "position": "top"}' \\
  {BASE_URL}/cards/{cardId}/move
\`\`\`

### เพิ่ม Comment
\`\`\`bash
curl -X POST \\
  -H "x-api-key: {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Automated comment from agent"}' \\
  {BASE_URL}/cards/{cardId}/comments
\`\`\`

---

## Response Examples

### GET {BASE_URL} (Column Overview)
\`\`\`json
{
  "success": true,
  "data": {
    "column": { "id": "col_123", "title": "To Do", "prompt": "", "automationStatus": "run" },
    "board": {
      "id": "brd_456",
      "title": "My Board",
      "columns": [
        { "id": "col_123", "title": "To Do" },
        { "id": "col_789", "title": "Done" }
      ],
      "labels": [
        { "id": "lbl_1", "name": "Bug", "color": "#FF0000" }
      ]
    },
    "cards": [
      {
        "id": "card_abc",
        "title": "Fix login",
        "priority": "HIGH",
        "dueDate": null,
        "assignees": [],
        "labels": [],
        "_count": { "subtasks": 2, "comments": 1, "attachments": 0 }
      }
    ],
    "permissions": {
      "canCreateCard": true,
      "canDeleteCard": true,
      "canMoveCard": true,
      "canEditCardTitle": true,
      "canEditCardDescription": true,
      "canEditCardPriority": true,
      "canEditCardDueDate": true,
      "canEditCardLabels": true,
      "canEditCardAssignees": true,
      "canManageSubtasks": true,
      "canComment": true,
      "canDuplicateCard": true,
      "canReferCard": true
    }
  }
}
\`\`\`

### POST {BASE_URL}/cards (Create Card)
\`\`\`json
{
  "success": true,
  "data": {
    "id": "card_new",
    "title": "New Task",
    "priority": "HIGH",
    "description": "Task details",
    "columnId": "col_123",
    "dueDate": null,
    "column": { "id": "col_123", "title": "To Do" },
    "assignees": [],
    "labels": [],
    "subtasks": []
  }
}
\`\`\`

---

## Decision Logic

| ผู้ใช้พูดว่า | สิ่งที่ต้องทำ |
|-------------|-------------|
| "สร้าง card ..." | \`POST {BASE_URL}/cards\` with \`{"title":"..."}\` + optional fields |
| "ย้าย X ไป Done" | \`GET {BASE_URL}\` → หา columnId ของ "Done" จาก \`board.columns\` → \`POST {BASE_URL}/cards/{id}/move\` |
| "เช็ค subtask เสร็จ" | \`GET {BASE_URL}/cards/{id}/subtasks\` → \`PATCH {BASE_URL}/cards/{id}/subtasks/{sid}\` with \`{"isCompleted":true}\` |
| "duplicate card" | \`POST {BASE_URL}/cards/{id}/duplicate\` |
| "assign ให้ ..." | \`GET {BASE_URL}\` → หา userId → \`POST {BASE_URL}/cards/{id}/assignees\` |
| "ติด label ..." | \`GET {BASE_URL}\` → หา labelId จาก \`board.labels\` → \`POST {BASE_URL}/cards/{id}/labels\` |
| "comment ว่า ..." | \`POST {BASE_URL}/cards/{id}/comments\` with \`{"content":"..."}\` |
| "ลบ card" | \`DELETE {BASE_URL}/cards/{id}\` |

---

## Error Codes

| Code | ความหมาย | ทำอย่างไร |
|------|---------|----------|
| 401 | key ผิด / หมดอายุ / ถูก disable / **ใช้ผิด endpoint** | ตรวจว่า URL ขึ้นต้นด้วย \`{BASE_URL}\` และ key เป็น \`agk_...\` |
| 403 | ไม่มี permission หรือ automation pause | ตรวจ \`permissions\` จาก \`GET {BASE_URL}\` |
| 404 | ไม่พบ card / column | ตรวจ ID อีกครั้ง |

---

## Common Mistakes

| ❌ ผิด | ✅ ถูก | เหตุผล |
|--------|--------|--------|
| \`POST /api/v1/cards\` | \`POST {BASE_URL}/cards\` | \`/api/v1/cards\` เป็น Main API ใช้ key คนละระบบ |
| ส่ง \`columnId\` ใน body | ไม่ต้องส่ง \`columnId\` | columnId อยู่ใน \`BASE_URL\` แล้ว |
| เดา column ID | ดูจาก \`GET {BASE_URL}\` → \`board.columns\` | ต้อง GET ก่อนทุกครั้งเพื่อดู ID ที่ถูกต้อง |

---

## Data Model

\`\`\`
Board → Column → Card
Card: id, title, description, priority (LOW/MEDIUM/HIGH/URGENT), dueDate, labels[], assignees[], subtasks[], comments[]
Subtask: id, title, isCompleted, order
Comment: id, content, author, createdAt
Label: id, name, color
\`\`\`
`;
