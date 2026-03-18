# Kanban Board — API Documentation

> REST API for external integrations (n8n, Zapier, Make, custom scripts, AI agents).
> Base URL: `https://<YOUR_DOMAIN>/api/v1`

---

## Authentication

The API supports **two authentication methods**. Both are stateless — no login/session required.

### Method 1: Per-User API Key (Recommended)

Created and managed via the Admin UI (`/admin/api-keys`). Each key is scoped to a specific user and has granular permissions.

```
x-api-key: kbn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Example:**
```bash
curl -H "x-api-key: kbn_abc123..." https://kanban.example.com/api/v1/boards
```

### Method 2: Legacy Bearer Token

Uses the server-wide `API_KEY` environment variable. All operations run as the user specified by `API_AGENT_USERNAME`.

```
Authorization: Bearer <API_KEY>
```

**Example:**
```bash
curl -H "Authorization: Bearer my-secret-key" https://kanban.example.com/api/v1/boards
```

> **Note:** Per-user API keys also work with the `Authorization: Bearer` header. The system checks the database first, then falls back to the env variable.

---

## API Key Scopes (Permissions)

Per-user API keys are restricted by scopes. Each endpoint requires a specific scope (or one of the granular scopes). If a key lacks the required scope, the API returns `403 Forbidden`.

**Broad scopes** (backward compatible — grant full access to that resource):

| Scope | Grants Access To |
|-------|-----------------|
| `boards:read` | List boards, get board detail |
| `boards:write` | Create, update, delete boards |
| `brands:read` | List brands |
| `users:read` | List users |
| `cards:read` | List/search cards, get card detail |
| `cards:write` | Create, update, delete cards; toggle labels/assignees |
| `cards:move` | Move cards between columns |
| `comments:read` | List comments |
| `comments:write` | Create comments (edit/delete when endpoints exist) |
| `subtasks:read` | List subtasks |
| `subtasks:write` | Create, update, delete subtasks |

**Granular scopes** (optional — assign only what you need):

| Scope | Grants Access To |
|-------|-----------------|
| `boards:create` | Create boards only |
| `boards:edit` | Update boards only |
| `boards:delete` | Delete (archive) boards only |
| `cards:create` | Create cards only |
| `cards:edit` | Update cards, toggle labels/assignees |
| `cards:delete` | Delete cards only |
| `comments:create` | Create comments only |
| `comments:edit` | Edit comments (when endpoint exists) |
| `comments:delete` | Delete comments (when endpoint exists) |
| `subtasks:create` | Create subtasks only |
| `subtasks:edit` | Update subtasks only |
| `subtasks:delete` | Delete subtasks only |

A key may have either the broad scope (e.g. `cards:write`) or the specific scopes (e.g. `cards:create` + `cards:edit`). Legacy Bearer token (env-based) has **all** scopes automatically.

---

## Managing API Keys

1. Login as **SUPER_ADMIN**
2. Go to **Administration → API Keys** (`/admin/api-keys`)
3. Click **Create API Key**:
   - Give it a name (e.g., "n8n Integration")
   - Select the **owner user** (actions are performed as this user)
   - Check the **permission scopes** needed
   - Optionally set an **expiration date**
4. **Copy the key immediately** — it is shown only once
5. You can **enable/disable**, **edit scopes**, or **delete** keys at any time

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

### Enums
- **Priority:** `LOW` | `MEDIUM` | `HIGH` | `URGENT`
- **Roles:** `SUPER_ADMIN` | `ADMIN` | `USER` | `GUEST`

---

## Endpoints

### 0. Current User / Key Info
```
GET /api/v1/me
```
**Scope:** None required

Returns the authenticated user, scopes, and API key ID. Useful for verifying your key works.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "username": "sharky",
      "displayName": "Sharky",
      "role": "ADMIN",
      "avatar": null
    },
    "scopes": ["boards:read", "cards:read", "cards:write", ...],
    "apiKeyId": "cmm..."
  }
}
```

---

### 1. List Brands
```
GET /api/v1/brands
```
**Scope:** `brands:read`

Returns all active brands with owners, members, board count.

---

### 2. List Boards
```
GET /api/v1/boards
```
**Scope:** `boards:read`

Returns all boards with columns (id, title), labels (id, name, color), members.

---

### 3. Get Board Detail
```
GET /api/v1/boards/{boardId}
```
**Scope:** `boards:read`

Full board with all columns → cards → assignees, labels, subtasks, counts.

---

### 3a. Create Board
```
POST /api/v1/boards
Content-Type: application/json
```
**Scope:** `boards:write` or `boards:create`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | YES | Board title (1-100 chars) |
| `description` | string | no | Board description |
| `brandId` | string | no | Brand ID to associate |
| `columns` | string[] | no | Column names (default: To Do, In Progress, Done) |

**Example:**
```json
{
  "title": "Marketing Board",
  "description": "Q2 marketing campaigns",
  "brandId": "brand_id_here",
  "columns": ["Backlog", "In Progress", "Review", "Done"]
}
```

---

### 3b. Update Board
```
PATCH /api/v1/boards/{boardId}
Content-Type: application/json
```
**Scope:** `boards:write` or `boards:edit`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | New title |
| `description` | string / null | New description (null to clear) |
| `color` | string / null | Board color (null to clear) |

---

### 3c. Delete Board (Archive)
```
DELETE /api/v1/boards/{boardId}
```
**Scope:** `boards:write` or `boards:delete`

Board will be archived (soft delete).

---

### 4. Search / List Cards
```
GET /api/v1/cards?q=&boardId=&columnId=&priority=&assigneeId=&limit=50&offset=0
```
**Scope:** `cards:read`

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search title & description |
| `boardId` | string | Filter by board |
| `columnId` | string | Filter by column |
| `priority` | string | LOW / MEDIUM / HIGH / URGENT |
| `assigneeId` | string | Filter by assigned user |
| `limit` | number | Max results (default 50, max 200) |
| `offset` | number | Skip N results |

Response: `{ cards: [...], total, limit, offset }`

---

### 5. Get Card Detail
```
GET /api/v1/cards/{cardId}
```
**Scope:** `cards:read`

Full card with column, assignees, labels, comments, attachments, subtasks, dependencies.

---

### 6. Create Card
```
POST /api/v1/cards
Content-Type: application/json
```
**Scope:** `cards:write` or `cards:create`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | YES | Card title (1-200 chars) |
| `columnId` | string | YES | Target column ID |
| `description` | string | no | Markdown description |
| `priority` | string | no | LOW / MEDIUM / HIGH / URGENT |
| `dueDate` | string | no | ISO date: "2026-03-20" |
| `labelIds` | string[] | no | Array of label IDs to attach |
| `assigneeIds` | string[] | no | Array of user IDs to assign |
| `subtasks` | string[] or object[] | no | Checklist items to create with the card |

> **Subtasks format:** You can pass either an array of strings `["Task 1", "Task 2"]` or an array of objects `[{"title": "Task 1"}, {"title": "Task 2"}]`. Both formats work. The subtasks will be created in the order provided.

**Example (basic):**
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

**Example (with subtasks/checklist):**
```json
{
  "title": "Social Media Campaign",
  "columnId": "cm_column_todo",
  "priority": "MEDIUM",
  "dueDate": "2026-03-25",
  "assigneeIds": ["cm_user_somchai"],
  "subtasks": [
    "Content Create",
    "Approve Content",
    "Create Media",
    "Approve Media",
    "Schedule Post",
    "Done"
  ]
}
```

---

### 7. Update Card
```
PATCH /api/v1/cards/{cardId}
Content-Type: application/json
```
**Scope:** `cards:write` or `cards:edit`

Only include fields you want to change:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | New title |
| `description` | string / null | New description (null to clear) |
| `priority` | string | LOW / MEDIUM / HIGH / URGENT |
| `dueDate` | string / null | ISO date (null to clear) |

---

### 8. Delete Card
```
DELETE /api/v1/cards/{cardId}
```
**Scope:** `cards:write` or `cards:delete`

---

### 9. Move Card to Column
```
POST /api/v1/cards/{cardId}/move
Content-Type: application/json
```
**Scope:** `cards:move`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columnId` | string | YES | Target column (same board only) |
| `position` | "top" / "bottom" / number | no | Position (default: bottom) |

---

### 10. Toggle Label on Card
```
POST /api/v1/cards/{cardId}/labels
```
**Scope:** `cards:write` or `cards:edit`

Body: `{ "labelId": "..." }` — Adds if missing, removes if present.
Response: `{ action: "added" | "removed" }`

---

### 11. Toggle Assignee on Card
```
POST /api/v1/cards/{cardId}/assignees
```
**Scope:** `cards:write` or `cards:edit`

Body: `{ "userId": "..." }` — Assigns if not assigned, removes if assigned.
Response: `{ action: "added" | "removed" }`

---

### 12. Add Comment
```
POST /api/v1/cards/{cardId}/comments
```
**Scope:** `comments:write` or `comments:create`

Body: `{ "content": "..." }`

The comment is created as the **API key owner** (the user who owns the key). The response and all comment list responses include `author`: `{ id, username, displayName, avatar }` so you can always see who wrote each comment.

---

### 13. List Comments
```
GET /api/v1/cards/{cardId}/comments
```
**Scope:** `comments:read`

Each comment includes `author`: `{ id, username, displayName, avatar }` so you know who wrote it.

---

### 14. Create Subtask
```
POST /api/v1/cards/{cardId}/subtasks
```
**Scope:** `subtasks:write` or `subtasks:create`

Body: `{ "title": "..." }`

---

### 15. List Subtasks
```
GET /api/v1/cards/{cardId}/subtasks
```
**Scope:** `subtasks:read`

---

### 16. Update Subtask
```
PATCH /api/v1/cards/{cardId}/subtasks/{subtaskId}
```
**Scope:** `subtasks:write` or `subtasks:edit`

Body: `{ "title": "...", "isCompleted": true }`

---

### 17. Delete Subtask
```
DELETE /api/v1/cards/{cardId}/subtasks/{subtaskId}
```
**Scope:** `subtasks:write` or `subtasks:delete`

---

### 18. List Users
```
GET /api/v1/users
```
**Scope:** `users:read`

Returns all active users (id, username, displayName, role).

---

## Quick Reference

| Action | Method | Path | Scope |
|--------|--------|------|-------|
| Current user/key | `GET` | `/api/v1/me` | — |
| List brands | `GET` | `/api/v1/brands` | `brands:read` |
| List boards | `GET` | `/api/v1/boards` | `boards:read` |
| Board detail | `GET` | `/api/v1/boards/{id}` | `boards:read` |
| Create board | `POST` | `/api/v1/boards` | `boards:write` or `boards:create` |
| Update board | `PATCH` | `/api/v1/boards/{id}` | `boards:write` or `boards:edit` |
| Delete board | `DELETE` | `/api/v1/boards/{id}` | `boards:write` or `boards:delete` |
| Search cards | `GET` | `/api/v1/cards?q=&boardId=` | `cards:read` |
| Card detail | `GET` | `/api/v1/cards/{id}` | `cards:read` |
| Create card | `POST` | `/api/v1/cards` | `cards:write` or `cards:create` |
| Update card | `PATCH` | `/api/v1/cards/{id}` | `cards:write` or `cards:edit` |
| Delete card | `DELETE` | `/api/v1/cards/{id}` | `cards:write` or `cards:delete` |
| Move card | `POST` | `/api/v1/cards/{id}/move` | `cards:move` |
| Toggle label | `POST` | `/api/v1/cards/{id}/labels` | `cards:write` or `cards:edit` |
| Toggle assignee | `POST` | `/api/v1/cards/{id}/assignees` | `cards:write` or `cards:edit` |
| Add comment | `POST` | `/api/v1/cards/{id}/comments` | `comments:write` or `comments:create` |
| List comments | `GET` | `/api/v1/cards/{id}/comments` | `comments:read` |
| Create subtask | `POST` | `/api/v1/cards/{id}/subtasks` | `subtasks:write` or `subtasks:create` |
| List subtasks | `GET` | `/api/v1/cards/{id}/subtasks` | `subtasks:read` |
| Update subtask | `PATCH` | `/api/v1/cards/{id}/subtasks/{sid}` | `subtasks:write` or `subtasks:edit` |
| Delete subtask | `DELETE` | `/api/v1/cards/{id}/subtasks/{sid}` | `subtasks:write` or `subtasks:delete` |
| List users | `GET` | `/api/v1/users` | `users:read` |

---

## Typical Workflow

```
1. GET /api/v1/me               → verify key works, check scopes
2. GET /api/v1/boards            → list boards, get column IDs & label IDs
3. GET /api/v1/users             → list users, get user IDs
4. GET /api/v1/boards/{id}       → see all cards in a board
5. POST /api/v1/cards            → create card with title, columnId, etc.
6. PATCH /api/v1/cards/{id}      → update priority, description, dueDate
7. POST /api/v1/cards/{id}/move  → move to "Done" column
8. POST /api/v1/cards/{id}/comments → leave a note
```

---

## Integration Examples

### n8n / Zapier / Make

Use the **HTTP Request** node with:
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

### cURL

```bash
# Verify your key
curl -H "x-api-key: kbn_your_key" \
  https://kanban.example.com/api/v1/me

# List all boards
curl -H "x-api-key: kbn_your_key" \
  https://kanban.example.com/api/v1/boards

# Create a card
curl -X POST \
  -H "x-api-key: kbn_your_key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy v2.0","columnId":"col_id","priority":"URGENT"}' \
  https://kanban.example.com/api/v1/cards
```

### Python

```python
import requests

BASE = "https://kanban.example.com/api/v1"
HEADERS = {"x-api-key": "kbn_your_key_here"}

# List boards
boards = requests.get(f"{BASE}/boards", headers=HEADERS).json()

# Create card
card = requests.post(f"{BASE}/cards", headers=HEADERS, json={
    "title": "Automated task",
    "columnId": "your_column_id",
    "priority": "MEDIUM",
}).json()
```

### JavaScript / Node.js

```javascript
const BASE = "https://kanban.example.com/api/v1";
const headers = { "x-api-key": "kbn_your_key_here" };

// List boards
const boards = await fetch(`${BASE}/boards`, { headers }).then(r => r.json());

// Create card
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

---

## Error Codes

| HTTP | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request / validation error |
| 401 | Unauthorized — invalid or missing API key |
| 403 | Forbidden — key is disabled, expired, or missing required scope |
| 404 | Resource not found |
| 500 | Server error |

### Common 403 Responses

```json
{"success": false, "error": "Insufficient permissions. Required scope: boards:read"}
{"success": false, "error": "API key is disabled"}
{"success": false, "error": "API key has expired"}
{"success": false, "error": "User account is disabled"}
```

---

## Security Notes

- API keys are **hashed with SHA-256** before storage — raw keys are never saved
- Keys are shown **only once** at creation — store them securely
- Use the **minimum scopes** necessary for each integration
- Set **expiration dates** for temporary integrations
- **Disable or delete** keys that are no longer needed
- Keys inherit the **user's identity** — activity logs show which user performed each action
