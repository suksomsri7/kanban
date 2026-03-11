# คำสั่ง Prompt สำหรับ OpenClaw Agent

ใช้คำสั่งด้านล่างเพื่อให้ OpenClaw Agent เรียกใช้ Kanban API ได้ถูกต้อง

---

## 1. System Prompt / กำหนดบริบทเริ่มต้น

คัดลอกข้อความด้านล่างไปใส่ใน System Prompt หรือ Custom Instructions ของ OpenClaw:

```
คุณเป็น Agent ที่เชื่อมต่อกับ Kanban Board API

**API Base URL:** {BASE_URL}/api/v1
**Authentication:** ส่ง Header ทุก request: `Authorization: Bearer {API_KEY}`

**เอกสาร API:** อ่านจาก AGENT_API.md ในโปรเจกต์ หรือใช้ OpenAPI spec ที่ openapi.json

**Endpoints หลัก:**
- GET /boards - ดู boards ทั้งหมด
- GET /boards/{id} - ดู board พร้อม cards
- GET /cards - ค้นหา cards (รองรับ q, boardId, priority, assigneeId)
- GET /cards/{id} - ดู card รายละเอียด
- POST /cards - สร้าง card (ต้องการ title, columnId)
- PATCH /cards/{id} - อัพเดท card (title, description, priority, dueDate)
- POST /cards/{id}/move - ย้าย card ไป column อื่น
- POST /cards/{id}/comments - เพิ่ม comment
- POST /cards/{id}/subtasks - เพิ่ม subtask
- GET /users - ดู users ทั้งหมด (สำหรับ assign)

เมื่อรับคำสั่งจากผู้ใช้ ให้เรียก API ที่เหมาะสม และรายงานผลกลับ
```

**แทนที่:**
- `{BASE_URL}` = URL ของ Kanban เช่น `http://localhost:3000` หรือ `https://kanban.yourdomain.com`
- `{API_KEY}` = ค่า API_KEY จาก .env

---

## 2. Prompt ตัวอย่างสำหรับงานต่างๆ

### 2.1 ดูโครงสร้าง Board

```
ไปที่ Kanban API ดู boards ทั้งหมด พร้อม columns และ labels จากนั้นสรุปให้ฉัน
```

### 2.2 สร้าง Card ใหม่

```
ช่วยสร้าง card ใน Kanban board ให้หน่อย
- ชื่อ: แก้ไข bug หน้า login
- Column: To Do (หรือ column id ที่ได้จาก board)
- Priority: HIGH
- รายละเอียด: ผู้ใช้รายงานว่าหน้า login ไม่ทำงานบน Safari
```

### 2.3 ค้นหา Cards

```
ช่วยค้นหา cards ที่มี priority HIGH ใน board ปัจจุบัน
```

```
ดู cards ทั้งหมดที่ assign ให้ user somchai
```

### 2.4 อัพเดท Card

```
อัพเดท card [id] ให้ priority เป็น URGENT และ due date เป็น 20 มี.ค. 2026
```

```
เปลี่ยน description ของ card [id] เป็น "เสร็จแล้ว - deploy ขึ้น production"
```

### 2.5 ย้าย Card

```
ย้าย card [id] ไปที่ column Done
```

```
ย้าย card [id] ไป column In Progress และวางไว้เป็นอันดับแรก (top)
```

### 2.6 เพิ่ม Comment

```
เพิ่ม comment ใน card [id]: "กำลังตรวจสอบและจะแก้ไขใน commit ถัดไป"
```

### 2.7 จัดการ Subtasks

```
เพิ่ม subtask ใน card [id]: "เขียน unit test"
```

```
อัพเดท subtask [subtaskId] ของ card [id] ให้ isCompleted เป็น true
```

### 2.8 Assign / Label

```
assign user somchai ไปที่ card [id]
```

```
เพิ่ม label Bug ให้ card [id]
```

---

## 3. Quick Reference สำหรับ Agent

| งาน | Method | Endpoint | Body ตัวอย่าง |
|-----|--------|----------|---------------|
| ดู boards | GET | /api/v1/boards | - |
| ดู board detail | GET | /api/v1/boards/{id} | - |
| ค้นหา cards | GET | /api/v1/cards?q=xxx&boardId=xxx | - |
| ดู card | GET | /api/v1/cards/{id} | - |
| สร้าง card | POST | /api/v1/cards | `{"title":"...","columnId":"...","priority":"HIGH"}` |
| อัพเดท card | PATCH | /api/v1/cards/{id} | `{"priority":"URGENT","dueDate":"2026-03-20"}` |
| ย้าย card | POST | /api/v1/cards/{id}/move | `{"columnId":"...","position":"top"}` |
| เพิ่ม comment | POST | /api/v1/cards/{id}/comments | `{"content":"..."}` |
| เพิ่ม subtask | POST | /api/v1/cards/{id}/subtasks | `{"title":"..."}` |
| Toggle assignee | POST | /api/v1/cards/{id}/assignees | `{"userId":"..."}` |
| Toggle label | POST | /api/v1/cards/{id}/labels | `{"labelId":"..."}` |
| ดู users | GET | /api/v1/users | - |

**Header ทุก request:** `Authorization: Bearer <API_KEY>`

---

## 4. ตัวอย่าง Full Prompt สำหรับ OpenClaw

```
ฉันมี Kanban Board อยู่ที่ https://kanban.mycompany.com
API Key คือ: abc123xyz789

ให้คุณเป็น Agent ที่ช่วยจัดการ Kanban ผ่าน API
- Base URL: https://kanban.mycompany.com/api/v1
- ทุก request ต้องส่ง Header: Authorization: Bearer abc123xyz789

เมื่อฉันบอกให้ "สร้าง card แก้ bug login" คุณจะ:
1. เรียก GET /boards เพื่อหา column "To Do"
2. เรียก POST /cards สร้าง card พร้อม title, columnId, priority
3. รายงานผลกลับ

เมื่อฉันบอกให้ "ย้าย card X ไป Done" คุณจะ:
1. เรียก GET /boards/{id} หรือ GET /cards/{id} เพื่อหา column "Done"
2. เรียก POST /cards/{id}/move พร้อม columnId
3. รายงานผลกลับ

ทำเช่นนี้สำหรับงานอื่นๆ ตาม AGENT_API.md
```

---

## 5. วิธีตั้งค่าใน OpenClaw

1. เปิดการตั้งค่า OpenClaw / Custom Instructions
2. วาง System Prompt จากข้อ 1 (แก้ BASE_URL และ API_KEY ให้ถูกต้อง)
3. ใส่ไฟล์ AGENT_API.md หรือ openapi.json เป็นเอกสารอ้างอิง (ถ้า OpenClaw รองรับ)
4. ทดสอบด้วย prompt ง่ายๆ เช่น "ดู boards ทั้งหมด"
