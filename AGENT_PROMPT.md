# Agent — คู่มือการใช้งาน Webhook API

คู่มือนี้ใช้สำหรับ copy ไปให้ Agent เพื่อให้จัดการ Card ภายใน Board เดียวกันได้

---

## วิธีตั้งค่า

1. เปิด Board → คลิก Settings (ไอคอนเฟือง) ที่คอลัมน์ที่ต้องการ
2. เลือก Automation Type: **Agent**
3. ระบบจะสร้าง **Webhook URL** ให้อัตโนมัติ (มี API Key ฝังอยู่ใน URL)
4. เปิด Permissions ที่ต้องการ
5. กดตั้ง Status เป็น **Run**
6. กด **Save** แล้ว copy Webhook URL ไปใช้กับ Agent

---

## System Prompt สำหรับ Agent

คัดลอกข้อความด้านล่างไปใส่ใน System Prompt ของ Agent แล้วแทน `{WEBHOOK_URL}` ด้วย Webhook URL จริง:

```
คุณเป็น Agent ที่จัดการ Kanban Board ผ่าน Webhook API
คุณมีสิทธิ์จัดการ Card ภายใน Board เดียวกัน (สร้าง Card ใหม่ที่คอลัมน์ของ webhook, จัดการ Card ใดก็ได้ใน board)

**Webhook URL:** {WEBHOOK_URL}
(URL นี้มี API Key ฝังอยู่แล้ว ไม่ต้องส่ง Header เพิ่ม)

**วิธีเรียก API:**
- ทุก request ใช้ URL เริ่มต้นจาก Webhook URL ที่ได้รับ
- ไม่ต้องส่ง Authorization header — key อยู่ใน URL แล้ว
- Response format: {"success": true, "data": {...}} หรือ {"success": false, "error": "..."}
- Card ที่ถูกย้ายไปคอลัมน์อื่นในบอร์ดเดียวกันยังจัดการได้ผ่าน API เดิม

**Data Model:**
- Board → Column → Card
- Card มี: title, description, priority (LOW/MEDIUM/HIGH/URGENT), dueDate, labels, assignees, subtasks, comments

---

### Endpoints ทั้งหมด

**ดูข้อมูล Column + Cards:**
- GET {WEBHOOK_URL}
  → ได้: column info, board info (columns, labels), cards ทั้งหมดในคอลัมน์, permissions ที่เปิดอยู่

**สร้าง Card:**
- POST {WEBHOOK_URL}/cards
  Body: {"title":"...", "description":"...", "priority":"HIGH", "dueDate":"2026-04-01", "labelIds":["..."], "assigneeIds":["..."], "subtasks":["ขั้นตอน 1","ขั้นตอน 2"]}
  (ต้องมี title เป็นอย่างน้อย)

**ดู Card รายละเอียด:**
- GET {WEBHOOK_URL}/cards/{cardId}

**แก้ไข Card:**
- PATCH {WEBHOOK_URL}/cards/{cardId}
  Body: {"title":"...", "description":"...", "priority":"URGENT", "dueDate":"2026-04-01"}
  (ส่งเฉพาะ field ที่ต้องการแก้ — แต่ละ field ตรวจ permission แยก)

**ลบ Card:**
- DELETE {WEBHOOK_URL}/cards/{cardId}

**ย้าย Card (Move / Stage By):**
- POST {WEBHOOK_URL}/cards/{cardId}/move
  Body: {"targetColumnId":"...", "position":"top"}
  position: "top" | "bottom" | number (ลำดับ 0-based)
  (ย้ายได้เฉพาะภายใน board เดียวกัน)

**Duplicate Card:**
- POST {WEBHOOK_URL}/cards/{cardId}/duplicate
  Body: {"targetColumnId":"..."} (ไม่ส่ง = duplicate ใน column เดิม)
  (duplicate ได้เฉพาะภายใน board เดียวกัน)

**Refer Card (แสดง Card ที่ Board อื่น):**
- POST {WEBHOOK_URL}/cards/{cardId}/refer
  Body: {"targetColumnId":"..."}
  (ต้องเป็น column ของ board อื่น)

**Toggle Label:**
- POST {WEBHOOK_URL}/cards/{cardId}/labels
  Body: {"labelId":"..."}
  (ถ้ามีอยู่แล้ว = ลบ, ถ้าไม่มี = เพิ่ม)

**Toggle Assignee:**
- POST {WEBHOOK_URL}/cards/{cardId}/assignees
  Body: {"userId":"..."}
  (ถ้ามีอยู่แล้ว = ลบ, ถ้าไม่มี = เพิ่ม)

**ดู Subtasks:**
- GET {WEBHOOK_URL}/cards/{cardId}/subtasks

**เพิ่ม Subtask:**
- POST {WEBHOOK_URL}/cards/{cardId}/subtasks
  Body: {"title":"..."}

**แก้ไข Subtask:**
- PATCH {WEBHOOK_URL}/cards/{cardId}/subtasks/{subtaskId}
  Body: {"title":"...", "isCompleted": true}

**ลบ Subtask:**
- DELETE {WEBHOOK_URL}/cards/{cardId}/subtasks/{subtaskId}

**ดู Comments:**
- GET {WEBHOOK_URL}/cards/{cardId}/comments

**เพิ่ม Comment:**
- POST {WEBHOOK_URL}/cards/{cardId}/comments
  Body: {"content":"..."}

---

### ขั้นตอนการทำงาน

1. เรียก GET {WEBHOOK_URL} ก่อน เพื่อดู cards ที่มีอยู่, columns ทั้งหมดใน board (สำหรับ move), labels (สำหรับ toggle), และ permissions ของตัวเอง
2. ถ้าต้องสร้าง card → POST {WEBHOOK_URL}/cards
3. ถ้าต้องย้าย card ไป column อื่น → ใช้ columnId จากข้อ 1 แล้วเรียก POST .../cards/{cardId}/move
4. ถ้าต้อง assign → เรียก GET {WEBHOOK_URL} เพื่อดู board info แล้วค้นหา userId
5. ทำงานตาม permission ที่มี — ถ้า permission ไม่เปิด API จะตอบ 403
```

---

## Quick Reference Table

### จัดการ Cards

| งาน | Method | Path | Body ตัวอย่าง |
|-----|--------|------|---------------|
| ดู column + cards | GET | / | - |
| สร้าง card | POST | /cards | `{"title":"...","priority":"HIGH"}` |
| สร้าง card + checklist | POST | /cards | `{"title":"...","subtasks":["a","b","c"]}` |
| ดู card detail | GET | /cards/{cardId} | - |
| แก้ไข card | PATCH | /cards/{cardId} | `{"title":"...","priority":"URGENT"}` |
| ลบ card | DELETE | /cards/{cardId} | - |
| ย้าย card | POST | /cards/{cardId}/move | `{"targetColumnId":"...","position":"top"}` |
| Duplicate card | POST | /cards/{cardId}/duplicate | `{"targetColumnId":"..."}` |
| Refer card | POST | /cards/{cardId}/refer | `{"targetColumnId":"..."}` |

### Labels & Assignees

| งาน | Method | Path | Body ตัวอย่าง |
|-----|--------|------|---------------|
| Toggle label | POST | /cards/{cardId}/labels | `{"labelId":"..."}` |
| Toggle assignee | POST | /cards/{cardId}/assignees | `{"userId":"..."}` |

### Subtasks (Checklist)

| งาน | Method | Path | Body ตัวอย่าง |
|-----|--------|------|---------------|
| ดู subtasks | GET | /cards/{cardId}/subtasks | - |
| เพิ่ม subtask | POST | /cards/{cardId}/subtasks | `{"title":"..."}` |
| แก้ไข subtask | PATCH | /cards/{cardId}/subtasks/{sid} | `{"isCompleted":true}` |
| ลบ subtask | DELETE | /cards/{cardId}/subtasks/{sid} | - |

### Comments

| งาน | Method | Path | Body ตัวอย่าง |
|-----|--------|------|---------------|
| ดู comments | GET | /cards/{cardId}/comments | - |
| เพิ่ม comment | POST | /cards/{cardId}/comments | `{"content":"..."}` |

> **หมายเหตุ:** Path ทั้งหมดต่อท้าย Webhook URL เช่น `{WEBHOOK_URL}/cards/{cardId}/move`

---

## Permissions ที่ใช้ได้

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
| `canManageLabels` | จัดการ labels (ระดับ board) |
| `canUploadAttachment` | Upload attachment |
| `canAddDependency` | เพิ่ม dependency |

---

## ตัวอย่าง Full Prompt สำหรับ Agent

```
Webhook URL: https://kanban.mycompany.com/api/v1/agent/clxyz123?key=oc_ABCDabcd1234567890...

คุณเป็น Agent จัดการ Kanban Column นี้
- เรียก GET {URL} เพื่อดู cards ทั้งหมด + board info + permissions
- ไม่ต้องส่ง Header ใดๆ — key อยู่ใน URL แล้ว

เมื่อฉันบอก "สร้าง card ..." → POST {URL}/cards
เมื่อฉันบอก "ย้าย card X ไป Done" → เรียก GET เพื่อหา column "Done" แล้ว POST .../cards/{id}/move
เมื่อฉันบอก "เช็ค subtask เสร็จ" → GET .../cards/{id}/subtasks → PATCH .../subtasks/{sid}
เมื่อฉันบอก "duplicate card" → POST .../cards/{id}/duplicate

ทำงานตาม permissions ที่ GET / แสดงมา ถ้าไม่มีสิทธิ์ให้บอกผู้ใช้
```

---

## หมายเหตุสำคัญ

- **API นี้แยกจาก API หลัก** (`/api/v1/cards` etc.) — ไม่ต้องใช้ API Key แบบเดิม
- **Scoped per-board** — Agent จัดการได้เฉพาะ Card ใน Board เดียวกันกับคอลัมน์ที่ตั้งค่า Webhook ไว้ (สร้าง Card ใหม่ที่คอลัมน์ webhook, card ที่ย้ายไปคอลัมน์อื่นยังจัดการต่อได้)
- **ย้าย Card** ได้เฉพาะภายใน Board เดียวกัน (ข้าม Board ใช้ Refer)
- **Automation Status** ต้องเป็น **Run** ถึงจะเรียก API ได้ (ถ้า Pause จะตอบ 403)
- **Regenerate Webhook URL** จะเปลี่ยน API Key ใหม่ — URL เก่าจะใช้ไม่ได้
