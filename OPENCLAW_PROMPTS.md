# คำสั่ง Prompt สำหรับ OpenClaw Agent

ใช้คำสั่งด้านล่างเพื่อให้ OpenClaw Agent เรียกใช้ Kanban API ได้ถูกต้อง

---

## 1. System Prompt / กำหนดบริบทเริ่มต้น

คัดลอกข้อความด้านล่างไปใส่ใน System Prompt หรือ Custom Instructions ของ OpenClaw:

```
คุณเป็น Agent ที่เชื่อมต่อกับ Kanban Board API

**API Base URL:** {BASE_URL}/api/v1
**Authentication:** ส่ง Header ทุก request:
  - แบบ API Key: `x-api-key: kbn_your_key_here`
  - หรือแบบ Bearer: `Authorization: Bearer {API_KEY}`

**Data Model:**
- Brand → Board → Column → Card
- Card มี: title, description, priority (LOW/MEDIUM/HIGH/URGENT), dueDate, labels, assignees, subtasks, comments
- สร้าง card ต้องระบุ title + columnId เป็นอย่างน้อย

**Endpoints ทั้งหมด:**

ข้อมูลทั่วไป:
- GET /me - ตรวจสอบ key ใช้งานได้ + ดู scopes
- GET /brands - ดู brands ทั้งหมด
- GET /boards - ดู boards ทั้งหมด (พร้อม columns, labels)
- GET /boards/{id} - ดู board พร้อม cards ทั้งหมด
- GET /users - ดู users ทั้งหมด (สำหรับ assign)

จัดการ Cards:
- GET /cards - ค้นหา cards (รองรับ q, boardId, columnId, priority, assigneeId, limit, offset)
- GET /cards/{id} - ดู card รายละเอียด
- POST /cards - สร้าง card (title*, columnId*, description, priority, dueDate, labelIds, assigneeIds, subtasks)
- PATCH /cards/{id} - อัพเดท card (title, description, priority, dueDate)
- DELETE /cards/{id} - ลบ card
- POST /cards/{id}/move - ย้าย card ไป column อื่น (columnId*, position: top/bottom/number)

Labels & Assignees:
- POST /cards/{id}/labels - เพิ่ม/ลบ label (toggle) → body: {"labelId":"..."}
- POST /cards/{id}/assignees - เพิ่ม/ลบ assignee (toggle) → body: {"userId":"..."}

Comments:
- GET /cards/{id}/comments - ดู comments ทั้งหมด
- POST /cards/{id}/comments - เพิ่ม comment → body: {"content":"..."}

Subtasks (Checklist):
- GET /cards/{id}/subtasks - ดู subtasks ทั้งหมด
- POST /cards/{id}/subtasks - เพิ่ม subtask → body: {"title":"..."}
- PATCH /cards/{id}/subtasks/{subtaskId} - อัพเดท subtask → body: {"title":"...", "isCompleted": true/false}
- DELETE /cards/{id}/subtasks/{subtaskId} - ลบ subtask

**สร้าง Card พร้อม Checklist ในครั้งเดียว:**
POST /cards สามารถส่ง subtasks เป็น array ได้เลย:
{"title":"งาน","columnId":"xxx","subtasks":["ขั้นตอน 1","ขั้นตอน 2","ขั้นตอน 3"]}

**Response Format:**
- สำเร็จ: {"success": true, "data": {...}}
- ผิดพลาด: {"success": false, "error": "..."}

**ขั้นตอนทำงาน:**
1. ถ้าผู้ใช้บอกชื่อ board/column เป็นภาษาไทยหรืออังกฤษ → เรียก GET /boards เพื่อหา ID ก่อน
2. ถ้าผู้ใช้บอกชื่อ user → เรียก GET /users เพื่อหา userId ก่อน
3. ถ้าผู้ใช้บอกชื่อ label → เรียก GET /boards เพื่อหา labelId ก่อน
4. จากนั้นเรียก API ที่เหมาะสม แล้วรายงานผลกลับ
```

**แทนที่:**
- `{BASE_URL}` = URL ของ Kanban เช่น `https://kanban.yourdomain.com`
- `{API_KEY}` = API Key (จาก /admin/api-keys หรือ .env)

---

## 2. Prompt ตัวอย่างสำหรับงานต่างๆ

### 2.1 ตรวจสอบการเชื่อมต่อ

```
ลองเรียก GET /me เพื่อตรวจสอบว่า API Key ใช้งานได้ แล้วบอกฉันว่ามี scopes อะไรบ้าง
```

### 2.2 ดูโครงสร้าง Board

```
ไปที่ Kanban API ดู boards ทั้งหมด พร้อม columns และ labels จากนั้นสรุปให้ฉัน
```

### 2.3 ดู Brands

```
ดู brands ทั้งหมดในระบบ สรุปว่ามีอะไรบ้าง แต่ละ brand มีกี่ board
```

### 2.4 สร้าง Card ใหม่ (แบบพื้นฐาน)

```
ช่วยสร้าง card ใน Kanban board ให้หน่อย
- ชื่อ: แก้ไข bug หน้า login
- Column: To Do (หรือ column id ที่ได้จาก board)
- Priority: HIGH
- รายละเอียด: ผู้ใช้รายงานว่าหน้า login ไม่ทำงานบน Safari
```

### 2.5 สร้าง Card พร้อม Checklist / Subtasks

```
สร้าง card ชื่อ "Social Media Campaign" ใน board Content คอลัมน์ To Do
- Priority: MEDIUM
- Due date: 25 มี.ค. 2026
- Checklist:
  - Content Create
  - Approve Content
  - Create Media
  - Approve Media
  - Schedule Post
  - Done
```

### 2.6 สร้าง Card พร้อม Labels และ Assignees

```
สร้าง card ชื่อ "ออกแบบ Banner โปรโมชัน" ใน board Content คอลัมน์ To Do
- Priority: HIGH
- Due date: 22 มี.ค. 2026
- Assign ให้: somchai
- Label: Design
- Checklist: ออกแบบ Draft, Review, แก้ไข, Final Approve
```

### 2.7 ค้นหา Cards

```
ช่วยค้นหา cards ที่มี priority HIGH ใน board ปัจจุบัน
```

```
ดู cards ทั้งหมดที่ assign ให้ user somchai
```

```
ค้นหา card ที่มีคำว่า "login" ใน board Development
```

### 2.8 ดู Card รายละเอียด

```
ดูรายละเอียด card [id] ให้หน่อย ว่ามี subtasks, comments, labels อะไรบ้าง
```

### 2.9 อัพเดท Card

```
อัพเดท card [id] ให้ priority เป็น URGENT และ due date เป็น 20 มี.ค. 2026
```

```
เปลี่ยน description ของ card [id] เป็น "เสร็จแล้ว - deploy ขึ้น production"
```

```
เปลี่ยนชื่อ card [id] เป็น "แก้ไข bug หน้า login v2"
```

### 2.10 ลบ Card

```
ลบ card [id] ออกจากระบบ
```

### 2.11 ย้าย Card

```
ย้าย card [id] ไปที่ column Done
```

```
ย้าย card [id] ไป column In Progress และวางไว้เป็นอันดับแรก (top)
```

### 2.12 เพิ่ม/ลบ Label

```
เพิ่ม label Bug ให้ card [id]
```

```
ลบ label Bug ออกจาก card [id]
```

> หมายเหตุ: API เป็นแบบ toggle — ถ้า label มีอยู่แล้วจะลบ, ถ้าไม่มีจะเพิ่ม

### 2.13 Assign/Unassign ผู้รับผิดชอบ

```
assign user somchai ไปที่ card [id]
```

```
เอา somchai ออกจาก card [id]
```

> หมายเหตุ: API เป็นแบบ toggle — ถ้า assign อยู่แล้วจะ unassign, ถ้าไม่มีจะ assign

### 2.14 จัดการ Comments

```
เพิ่ม comment ใน card [id]: "กำลังตรวจสอบและจะแก้ไขใน commit ถัดไป"
```

```
ดู comments ทั้งหมดของ card [id]
```

### 2.15 จัดการ Subtasks (Checklist)

```
เพิ่ม subtask ใน card [id]: "เขียน unit test"
```

```
ดู subtasks ทั้งหมดของ card [id]
```

```
อัพเดท subtask [subtaskId] ของ card [id] ให้ isCompleted เป็น true
```

```
เปลี่ยนชื่อ subtask [subtaskId] ของ card [id] เป็น "เขียน integration test"
```

```
ลบ subtask [subtaskId] ออกจาก card [id]
```

### 2.16 ดู Users

```
ดู users ทั้งหมดในระบบ
```

---

## 3. Quick Reference สำหรับ Agent

### ข้อมูลทั่วไป

| งาน | Method | Endpoint | Body ตัวอย่าง |
|-----|--------|----------|---------------|
| ตรวจสอบ key | GET | /api/v1/me | - |
| ดู brands | GET | /api/v1/brands | - |
| ดู boards | GET | /api/v1/boards | - |
| ดู board detail | GET | /api/v1/boards/{id} | - |
| ดู users | GET | /api/v1/users | - |

### จัดการ Cards

| งาน | Method | Endpoint | Body ตัวอย่าง |
|-----|--------|----------|---------------|
| ค้นหา cards | GET | /api/v1/cards?q=xxx&boardId=xxx | - |
| ดู card | GET | /api/v1/cards/{id} | - |
| สร้าง card | POST | /api/v1/cards | `{"title":"...","columnId":"...","priority":"HIGH"}` |
| สร้าง card + checklist | POST | /api/v1/cards | `{"title":"...","columnId":"...","subtasks":["a","b","c"]}` |
| อัพเดท card | PATCH | /api/v1/cards/{id} | `{"priority":"URGENT","dueDate":"2026-03-20"}` |
| ลบ card | DELETE | /api/v1/cards/{id} | - |
| ย้าย card | POST | /api/v1/cards/{id}/move | `{"columnId":"...","position":"top"}` |

### Labels & Assignees

| งาน | Method | Endpoint | Body ตัวอย่าง |
|-----|--------|----------|---------------|
| Toggle label | POST | /api/v1/cards/{id}/labels | `{"labelId":"..."}` |
| Toggle assignee | POST | /api/v1/cards/{id}/assignees | `{"userId":"..."}` |

### Comments

| งาน | Method | Endpoint | Body ตัวอย่าง |
|-----|--------|----------|---------------|
| ดู comments | GET | /api/v1/cards/{id}/comments | - |
| เพิ่ม comment | POST | /api/v1/cards/{id}/comments | `{"content":"..."}` |

### Subtasks (Checklist)

| งาน | Method | Endpoint | Body ตัวอย่าง |
|-----|--------|----------|---------------|
| ดู subtasks | GET | /api/v1/cards/{id}/subtasks | - |
| เพิ่ม subtask | POST | /api/v1/cards/{id}/subtasks | `{"title":"..."}` |
| อัพเดท subtask | PATCH | /api/v1/cards/{id}/subtasks/{sid} | `{"title":"...","isCompleted":true}` |
| ลบ subtask | DELETE | /api/v1/cards/{id}/subtasks/{sid} | - |

**Header ทุก request:** `x-api-key: kbn_your_key` หรือ `Authorization: Bearer <API_KEY>`

---

## 4. ตัวอย่าง Full Prompt สำหรับ OpenClaw

```
ฉันมี Kanban Board อยู่ที่ https://kanban.mycompany.com
API Key คือ: kbn_abc123xyz789

ให้คุณเป็น Agent ที่ช่วยจัดการ Kanban ผ่าน API
- Base URL: https://kanban.mycompany.com/api/v1
- ทุก request ต้องส่ง Header: x-api-key: kbn_abc123xyz789

เมื่อฉันบอกให้ "สร้าง card แก้ bug login พร้อม checklist" คุณจะ:
1. เรียก GET /boards เพื่อหา column "To Do" และ labels
2. เรียก GET /users เพื่อหา userId (ถ้าต้อง assign)
3. เรียก POST /cards สร้าง card พร้อม title, columnId, priority, subtasks
4. รายงานผลกลับ

เมื่อฉันบอกให้ "ย้าย card X ไป Done" คุณจะ:
1. เรียก GET /boards เพื่อหา column "Done"
2. เรียก POST /cards/{id}/move พร้อม columnId
3. รายงานผลกลับ

เมื่อฉันบอกให้ "เช็ค subtask เสร็จ" คุณจะ:
1. เรียก GET /cards/{id}/subtasks เพื่อหา subtaskId
2. เรียก PATCH /cards/{id}/subtasks/{subtaskId} พร้อม {"isCompleted": true}
3. รายงานผลกลับ

ทำเช่นนี้สำหรับงานอื่นๆ ทั้งหมด ดู API ครบที่ AGENT_API.md
```

---

## 5. วิธีตั้งค่าใน OpenClaw

1. เปิดการตั้งค่า OpenClaw / Custom Instructions
2. วาง System Prompt จากข้อ 1 (แก้ BASE_URL และ API_KEY ให้ถูกต้อง)
3. ใส่ไฟล์ AGENT_API.md หรือ openapi.json เป็นเอกสารอ้างอิง (ถ้า OpenClaw รองรับ)
4. ทดสอบด้วย prompt ง่ายๆ เช่น "เรียก GET /me ให้หน่อย" เพื่อตรวจสอบว่าเชื่อมต่อได้

---

## 6. API Scopes ที่ต้องเปิด

ถ้าใช้ Per-User API Key ต้องเปิด scopes ที่ต้องการ:

| Scope | ใช้ทำอะไร |
|-------|----------|
| `boards:read` | ดู boards, columns, labels |
| `brands:read` | ดู brands |
| `users:read` | ดู users |
| `cards:read` | ค้นหา/ดู cards |
| `cards:write` | สร้าง/อัพเดท/ลบ cards, toggle labels/assignees |
| `cards:move` | ย้าย cards ระหว่าง columns |
| `comments:read` | ดู comments |
| `comments:write` | เพิ่ม comments |
| `subtasks:read` | ดู subtasks |
| `subtasks:write` | สร้าง/อัพเดท/ลบ subtasks |

> **แนะนำ:** ถ้าต้องการให้ Agent ทำได้ทุกอย่าง ให้เปิดทุก scopes หรือใช้ Legacy Bearer Token (มีทุก scopes อัตโนมัติ)
