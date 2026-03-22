# Agent — คู่มือการใช้งาน API

คู่มือนี้ใช้สำหรับ copy ไปให้ Agent เพื่อให้จัดการ Card ภายใน Board เดียวกันได้

---

## วิธีตั้งค่า

1. เปิด Board → คลิก Settings (ไอคอนเฟือง) ที่คอลัมน์ที่ต้องการ
2. เลือก Automation Type: **Agent**
3. กด **Create Key** เพื่อสร้าง API Key ใหม่ — กำหนดชื่อ, วันหมดอายุ, และ Permissions
4. Copy **Base URL** และ **API Key** ไปใช้งาน
5. ตั้ง Automation Status เป็น **Run**
6. กด **Save**

---

## Authentication

ส่ง header `x-api-key` ทุก request:

```
curl -X GET https://your-domain.com/api/v1/agent/{columnId} \
  -H "x-api-key: agk_your_api_key_here"
```

---

## System Prompt สำหรับ Agent

คัดลอกข้อความด้านล่างไปใส่ใน System Prompt ของ Agent แล้วแทน `{BASE_URL}` ด้วย Base URL จริง:

```
คุณเป็น Agent ที่จัดการ Kanban Board ผ่าน API
คุณมีสิทธิ์จัดการ Card ภายใน Board เดียวกัน (สร้าง Card ใหม่ที่คอลัมน์ของ API, จัดการ Card ใดก็ได้ใน board)

**Base URL:** {BASE_URL}
**Authentication:** ส่ง header `x-api-key: YOUR_API_KEY` ทุก request

**วิธีเรียก API:**
curl -X GET {BASE_URL} -H "x-api-key: YOUR_API_KEY"
curl -X POST {BASE_URL}/cards -H "x-api-key: YOUR_API_KEY" -H "Content-Type: application/json" -d '{"title":"..."}'

Response format: {"success": true, "data": {...}} หรือ {"success": false, "error": "..."}

...
(ดูรายละเอียด Endpoints ด้านล่าง)
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

> **Agent Attribution:** comment ที่ Agent สร้างจะแสดงชื่อ API Key เป็นผู้เขียน พร้อม Bot icon + badge "Agent" (ไม่ใช้ชื่อ board owner)

> **แนบไฟล์ใน comment:** ใส่ Markdown ใน content:
> - รูปภาพ: `![ชื่อ](url)`
> - วิดีโอ: `[video:ชื่อ](url)`
> - ไฟล์อื่น: `[file:ชื่อ](url)`

### Prompt & Status

| งาน | Method | Path | Body ตัวอย่าง |
|-----|--------|------|---------------|
| อ่าน prompt | GET | /prompt | - |
| ดู status | GET | /status | - |
| เปลี่ยน status | PATCH | /status | `{"automationStatus":"run"}` |

> **หมายเหตุ:** Path ทั้งหมดต่อท้าย Base URL เช่น `{BASE_URL}/cards/{cardId}/move`
> ทุก request ต้องส่ง header `x-api-key: YOUR_API_KEY`
> Prompt & Status endpoints ใช้ได้แม้ automation status เป็น pause

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
Base URL: https://kanban.mycompany.com/api/v1/agent/clxyz123
API Key: agk_ABCDabcd1234567890...

คุณเป็น Agent จัดการ Kanban Column นี้
- เรียก GET {BASE_URL} -H "x-api-key: {API_KEY}" เพื่อดู cards ทั้งหมด + board info + permissions

เมื่อฉันบอก "สร้าง card ..." → POST {BASE_URL}/cards
เมื่อฉันบอก "ย้าย card X ไป Done" → เรียก GET เพื่อหา column "Done" แล้ว POST .../cards/{id}/move
เมื่อฉันบอก "เช็ค subtask เสร็จ" → GET .../cards/{id}/subtasks → PATCH .../subtasks/{sid}
เมื่อฉันบอก "duplicate card" → POST .../cards/{id}/duplicate

ทำงานตาม permissions ที่ GET / แสดงมา ถ้าไม่มีสิทธิ์ให้บอกผู้ใช้
```

---

## หมายเหตุสำคัญ

- **API นี้แยกจาก API หลัก** (`/api/v1/cards` etc.) — ใช้ API Key ที่สร้างจาก Stage Settings
- **สร้าง API Key ได้หลายตัว** — แต่ละตัวมีชื่อ, สิทธิ์, วันหมดอายุแยกกัน
- **ชื่อ Key แสดงเป็นผู้เขียน** — comment ที่ Agent สร้างจะแสดงชื่อ key เป็น author พร้อม Bot icon + badge "Agent"
- **Scoped per-board** — Agent จัดการได้เฉพาะ Card ใน Board เดียวกัน
- **ย้าย Card** ได้เฉพาะภายใน Board เดียวกัน (ข้าม Board ใช้ Refer)
- **Automation Status** ต้องเป็น **Run** ถึงจะเรียก API ได้ (ถ้า Pause จะตอบ 403)
- **Key ถูก hash** — ระบบเก็บเฉพาะ hash ของ key, raw key แสดงแค่ตอนสร้างครั้งเดียว
