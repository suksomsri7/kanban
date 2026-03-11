# Kanban Board — Agent API Documentation

> REST API for AI Agents to manage the Kanban board system.
> Base URL: `http://<HOST>:3000/kanban/api/v1`

---

## Authentication

All requests require an API key via the `Authorization` header:

```
Authorization: Bearer <API_KEY>
```

The API key is configured in the server's `API_KEY` environment variable.
Operations are performed as the user specified by `API_AGENT_USERNAME` (default: `admin`).

---

## Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Data Model

### Hierarchy
```
Brand → Board → Column → Card
```

- **Brand** — A project/client group containing boards
- **Board** — A kanban board with columns, labels, members
- **Column** — A lane in a board (e.g. "To Do", "In Progress", "Done")
- **Card** — A task with title, description, priority, due date, labels, assignees, subtasks, comments, attachments

### Priority: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
### Roles: `SUPER_ADMIN` | `ADMIN` | `USER` | `GUEST`

---

## Endpoints

### 1. List Brands
```
GET /kanban/api/v1/brands
```
Returns all active brands with owners, members, board count.

### 2. List Boards
```
GET /kanban/api/v1/boards
```
Returns all boards with columns (id, title), labels (id, name, color), members.

### 3. Get Board Detail
```
GET /kanban/api/v1/boards/{boardId}
```
Full board with all columns → cards → assignees, labels, subtasks, counts.

### 4. Search / List Cards
```
GET /kanban/api/v1/cards?q=&boardId=&columnId=&priority=&assigneeId=&limit=50&offset=0
```

| Param        | Type   | Description                              |
|--------------|--------|------------------------------------------|
| `q`          | string | Search title & description               |
| `boardId`    | string | Filter by board                          |
| `columnId`   | string | Filter by column                         |
| `priority`   | string | LOW / MEDIUM / HIGH / URGENT             |
| `assigneeId` | string | Filter by assigned user                  |
| `limit`      | number | Max results (default 50, max 200)        |
| `offset`     | number | Skip N results                           |

Response: `{ cards: [...], total, limit, offset }`

### 5. Get Card Detail
```
GET /kanban/api/v1/cards/{cardId}
```
Full card with column, assignees, labels, comments, attachments, subtasks, dependencies.

### 6. Create Card
```
POST /kanban/api/v1/cards
Content-Type: application/json
```

| Field         | Type     | Required | Description                          |
|---------------|----------|----------|--------------------------------------|
| `title`       | string   | YES      | Card title (1-200 chars)             |
| `columnId`    | string   | YES      | Target column ID                     |
| `description` | string   | no       | Markdown description                 |
| `priority`    | string   | no       | LOW / MEDIUM / HIGH / URGENT         |
| `dueDate`     | string   | no       | ISO date: "2026-03-20"              |
| `labelIds`    | string[] | no       | Array of label IDs to attach         |
| `assigneeIds` | string[] | no       | Array of user IDs to assign          |

Example:
```json
{
  "title": "Implement login page",
  "columnId": "cm_column_todo",
  "priority": "HIGH",
  "dueDate": "2026-03-20",
  "assigneeIds": ["cm_user_somchai"],
  "labelIds": ["cm_label_feature"]
}
```

### 7. Update Card
```
PATCH /kanban/api/v1/cards/{cardId}
Content-Type: application/json
```

Only include fields you want to change:

| Field         | Type          | Description                      |
|---------------|---------------|----------------------------------|
| `title`       | string        | New title                        |
| `description` | string / null | New description (null to clear)  |
| `priority`    | string        | LOW / MEDIUM / HIGH / URGENT     |
| `dueDate`     | string / null | ISO date (null to clear)         |

### 8. Delete Card
```
DELETE /kanban/api/v1/cards/{cardId}
```

### 9. Move Card to Column
```
POST /kanban/api/v1/cards/{cardId}/move
Content-Type: application/json
```

| Field      | Type                        | Required | Description                     |
|------------|-----------------------------|----------|---------------------------------|
| `columnId` | string                      | YES      | Target column (same board)      |
| `position` | "top" / "bottom" / number   | no       | Position (default: bottom)      |

### 10. Toggle Label on Card
```
POST /kanban/api/v1/cards/{cardId}/labels
```
Body: `{ "labelId": "..." }` — Adds if missing, removes if present.
Response: `{ action: "added" | "removed" }`

### 11. Toggle Assignee on Card
```
POST /kanban/api/v1/cards/{cardId}/assignees
```
Body: `{ "userId": "..." }` — Assigns if not assigned, removes if assigned.
Response: `{ action: "added" | "removed" }`

### 12. Add Comment
```
POST /kanban/api/v1/cards/{cardId}/comments
```
Body: `{ "content": "..." }`

### 13. List Comments
```
GET /kanban/api/v1/cards/{cardId}/comments
```

### 14. Create Subtask
```
POST /kanban/api/v1/cards/{cardId}/subtasks
```
Body: `{ "title": "..." }`

### 15. List Subtasks
```
GET /kanban/api/v1/cards/{cardId}/subtasks
```

### 16. Update Subtask
```
PATCH /kanban/api/v1/cards/{cardId}/subtasks/{subtaskId}
```
Body: `{ "title": "...", "isCompleted": true }`

### 17. Delete Subtask
```
DELETE /kanban/api/v1/cards/{cardId}/subtasks/{subtaskId}
```

### 18. List Users
```
GET /kanban/api/v1/users
```
Returns all active users (id, username, displayName, role).

---

## Quick Reference

| Action              | Method   | Path                                             |
|---------------------|----------|--------------------------------------------------|
| List brands         | `GET`    | `/kanban/api/v1/brands`                          |
| List boards         | `GET`    | `/kanban/api/v1/boards`                          |
| Board detail        | `GET`    | `/kanban/api/v1/boards/{id}`                     |
| Search cards        | `GET`    | `/kanban/api/v1/cards?q=&boardId=`               |
| Card detail         | `GET`    | `/kanban/api/v1/cards/{id}`                      |
| Create card         | `POST`   | `/kanban/api/v1/cards`                           |
| Update card         | `PATCH`  | `/kanban/api/v1/cards/{id}`                      |
| Delete card         | `DELETE` | `/kanban/api/v1/cards/{id}`                      |
| Move card           | `POST`   | `/kanban/api/v1/cards/{id}/move`                 |
| Toggle label        | `POST`   | `/kanban/api/v1/cards/{id}/labels`               |
| Toggle assignee     | `POST`   | `/kanban/api/v1/cards/{id}/assignees`            |
| Add comment         | `POST`   | `/kanban/api/v1/cards/{id}/comments`             |
| List comments       | `GET`    | `/kanban/api/v1/cards/{id}/comments`             |
| Create subtask      | `POST`   | `/kanban/api/v1/cards/{id}/subtasks`             |
| List subtasks       | `GET`    | `/kanban/api/v1/cards/{id}/subtasks`             |
| Update subtask      | `PATCH`  | `/kanban/api/v1/cards/{id}/subtasks/{subtaskId}` |
| Delete subtask      | `DELETE` | `/kanban/api/v1/cards/{id}/subtasks/{subtaskId}` |
| List users          | `GET`    | `/kanban/api/v1/users`                           |

---

## Typical Workflow

```
1. GET /kanban/api/v1/boards          → list boards, get column IDs & label IDs
2. GET /kanban/api/v1/users           → list users, get user IDs
3. GET /kanban/api/v1/boards/{id}     → see all cards in a board
4. POST /kanban/api/v1/cards          → create card with title, columnId, etc.
5. PATCH /kanban/api/v1/cards/{id}    → update priority, description, dueDate
6. POST /kanban/api/v1/cards/{id}/move → move to "Done" column
7. POST /kanban/api/v1/cards/{id}/comments → leave a note
```

---

## Error Codes

| HTTP | Meaning                    |
|------|----------------------------|
| 200  | Success                    |
| 400  | Bad request / validation   |
| 401  | Unauthorized (bad API key) |
| 404  | Resource not found         |
| 500  | Server error               |
