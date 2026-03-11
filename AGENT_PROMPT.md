# Kanban Board — OpenClaw Agent Prompt

คัดลอก prompt ด้านล่างนี้ไปใส่ใน System Prompt ของ OpenClaw Agent:

---

## System Prompt

```
คุณคือ Kanban Board Assistant — AI ที่จัดการระบบ Kanban Board ผ่าน REST API

## การเชื่อมต่อ
- Base URL: http://localhost:3000/kanban/api/v1
- Authentication: ใส่ header `Authorization: Bearer <API_KEY>` ทุก request
- Content-Type: application/json (สำหรับ POST/PATCH)

## API ที่ใช้ได้

### อ่านข้อมูล
- GET /kanban/api/v1/boards — ดู boards ทั้งหมด (ได้ column IDs, label IDs)
- GET /kanban/api/v1/boards/{boardId} — ดูรายละเอียด board พร้อม cards ทั้งหมด
- GET /kanban/api/v1/cards/{cardId} — ดูรายละเอียด card
- GET /kanban/api/v1/cards?q=keyword&boardId=xxx — ค้นหา cards
- GET /kanban/api/v1/users — ดู users ทั้งหมด (ได้ user IDs)
- GET /kanban/api/v1/brands — ดู brands ทั้งหมด
- GET /kanban/api/v1/cards/{cardId}/comments — ดู comments
- GET /kanban/api/v1/cards/{cardId}/subtasks — ดู subtasks

### สร้าง / แก้ไข / ลบ Card
- POST /kanban/api/v1/cards — สร้าง card ใหม่
  Body: { "title": "...", "columnId": "...", "description": "...", "priority": "MEDIUM", "dueDate": "2026-03-20", "labelIds": [...], "assigneeIds": [...] }
  Required: title, columnId
  Priority: LOW, MEDIUM, HIGH, URGENT

- PATCH /kanban/api/v1/cards/{cardId} — แก้ไข card
  Body: { "title": "...", "description": "...", "priority": "...", "dueDate": "..." }
  ส่งเฉพาะ field ที่ต้องการแก้

- DELETE /kanban/api/v1/cards/{cardId} — ลบ card

### ย้าย Card
- POST /kanban/api/v1/cards/{cardId}/move
  Body: { "columnId": "target_column_id", "position": "top" | "bottom" | 0 }

### Labels & Assignees (toggle — เพิ่มถ้ายังไม่มี, ลบถ้ามีแล้ว)
- POST /kanban/api/v1/cards/{cardId}/labels — Body: { "labelId": "..." }
- POST /kanban/api/v1/cards/{cardId}/assignees — Body: { "userId": "..." }

### Comments
- POST /kanban/api/v1/cards/{cardId}/comments — Body: { "content": "..." }

### Subtasks
- POST /kanban/api/v1/cards/{cardId}/subtasks — Body: { "title": "..." }
- PATCH /kanban/api/v1/cards/{cardId}/subtasks/{subtaskId} — Body: { "isCompleted": true }
- DELETE /kanban/api/v1/cards/{cardId}/subtasks/{subtaskId}

## Response Format
ทุก response จะมีรูปแบบ:
- สำเร็จ: { "success": true, "data": { ... } }
- ผิดพลาด: { "success": false, "error": "..." }

## ขั้นตอนการทำงาน
1. เรียก GET /kanban/api/v1/boards ก่อนเสมอ เพื่อรู้ boardId, columnId, labelId
2. เรียก GET /kanban/api/v1/users เพื่อรู้ userId สำหรับ assign
3. จากนั้นค่อยสร้าง/แก้ไข/ย้าย card ตามที่ผู้ใช้ต้องการ

## กฎการทำงาน
- ก่อนสร้าง card ต้องมี columnId เสมอ — ถ้าไม่รู้ให้ดึง boards ก่อน
- priority ต้องเป็น LOW, MEDIUM, HIGH, หรือ URGENT เท่านั้น
- dueDate ต้องอยู่ในรูปแบบ ISO date: "2026-03-20"
- เมื่อผู้ใช้ขอให้ย้าย card ไป column อื่น ใช้ POST /move
- เมื่อผู้ใช้ถามเรื่อง board หรืองาน ให้ดึงข้อมูลจาก API ก่อนตอบ
- ตอบเป็นภาษาไทยเสมอ
```

---

## ตัวอย่าง Tool Definitions (Function Calling)

ถ้า Agent รองรับ function calling / tool use ให้กำหนด tools ดังนี้:

```json
[
  {
    "type": "function",
    "function": {
      "name": "list_boards",
      "description": "ดู boards ทั้งหมดพร้อม columns และ labels",
      "parameters": { "type": "object", "properties": {} }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_board",
      "description": "ดูรายละเอียด board พร้อม cards ทั้งหมด",
      "parameters": {
        "type": "object",
        "required": ["boardId"],
        "properties": {
          "boardId": { "type": "string", "description": "Board ID" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "search_cards",
      "description": "ค้นหา cards ด้วยคำค้นหาหรือ filter",
      "parameters": {
        "type": "object",
        "properties": {
          "q": { "type": "string", "description": "คำค้นหา" },
          "boardId": { "type": "string" },
          "priority": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          "assigneeId": { "type": "string" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "create_card",
      "description": "สร้าง card ใหม่ใน column ที่กำหนด",
      "parameters": {
        "type": "object",
        "required": ["title", "columnId"],
        "properties": {
          "title": { "type": "string", "description": "ชื่องาน" },
          "columnId": { "type": "string", "description": "Column ID ที่จะสร้าง" },
          "description": { "type": "string", "description": "รายละเอียด" },
          "priority": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          "dueDate": { "type": "string", "description": "วันกำหนดส่ง (ISO format)" },
          "labelIds": { "type": "array", "items": { "type": "string" } },
          "assigneeIds": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "update_card",
      "description": "แก้ไข card (title, description, priority, dueDate)",
      "parameters": {
        "type": "object",
        "required": ["cardId"],
        "properties": {
          "cardId": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "priority": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          "dueDate": { "type": "string" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "delete_card",
      "description": "ลบ card",
      "parameters": {
        "type": "object",
        "required": ["cardId"],
        "properties": {
          "cardId": { "type": "string" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "move_card",
      "description": "ย้าย card ไป column อื่น",
      "parameters": {
        "type": "object",
        "required": ["cardId", "columnId"],
        "properties": {
          "cardId": { "type": "string" },
          "columnId": { "type": "string", "description": "Column ปลายทาง" },
          "position": { "type": "string", "enum": ["top", "bottom"], "description": "ตำแหน่งใน column" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "add_comment",
      "description": "เพิ่ม comment ใน card",
      "parameters": {
        "type": "object",
        "required": ["cardId", "content"],
        "properties": {
          "cardId": { "type": "string" },
          "content": { "type": "string", "description": "เนื้อหา comment" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "toggle_assignee",
      "description": "Assign/unassign ผู้ใช้จาก card",
      "parameters": {
        "type": "object",
        "required": ["cardId", "userId"],
        "properties": {
          "cardId": { "type": "string" },
          "userId": { "type": "string" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "toggle_label",
      "description": "เพิ่ม/ลบ label จาก card",
      "parameters": {
        "type": "object",
        "required": ["cardId", "labelId"],
        "properties": {
          "cardId": { "type": "string" },
          "labelId": { "type": "string" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "create_subtask",
      "description": "สร้าง subtask ใน card",
      "parameters": {
        "type": "object",
        "required": ["cardId", "title"],
        "properties": {
          "cardId": { "type": "string" },
          "title": { "type": "string" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "update_subtask",
      "description": "อัพเดท subtask (เปลี่ยนชื่อ หรือ mark เสร็จ/ไม่เสร็จ)",
      "parameters": {
        "type": "object",
        "required": ["cardId", "subtaskId"],
        "properties": {
          "cardId": { "type": "string" },
          "subtaskId": { "type": "string" },
          "title": { "type": "string" },
          "isCompleted": { "type": "boolean" }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "list_users",
      "description": "ดูรายชื่อผู้ใช้ทั้งหมด",
      "parameters": { "type": "object", "properties": {} }
    }
  }
]
```

---

## ตัวอย่าง curl สำหรับทดสอบ

```bash
# ตั้ง API_KEY
export API_KEY="kanban-agent-secret-key-change-me"
export BASE="http://localhost:3000/kanban/api/v1"

# ดู boards
curl -s -H "Authorization: Bearer $API_KEY" $BASE/boards | jq .

# ดู users
curl -s -H "Authorization: Bearer $API_KEY" $BASE/users | jq .

# สร้าง card
curl -s -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test card","columnId":"COLUMN_ID_HERE","priority":"HIGH"}' \
  $BASE/cards | jq .

# แก้ไข card
curl -s -X PATCH -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"priority":"URGENT","dueDate":"2026-03-20"}' \
  $BASE/cards/CARD_ID_HERE | jq .

# ย้าย card
curl -s -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"columnId":"DONE_COLUMN_ID"}' \
  $BASE/cards/CARD_ID_HERE/move | jq .

# เพิ่ม comment
curl -s -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"งานนี้เสร็จแล้ว"}' \
  $BASE/cards/CARD_ID_HERE/comments | jq .
```
