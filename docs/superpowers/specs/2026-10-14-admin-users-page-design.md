# Admin Dashboard: Users Page — Design

**Date:** 2026-10-14
**Status:** Approved design, pending implementation plan

## Goal

Give admins a Users view on the admin dashboard, toggled against the existing
Franchises view. Admins can list users (paginated), search by name, and delete a
user after an explicit typed-name confirmation.

## Backend (already implemented in `jwt-pizza-service`)

| Call | Endpoint | Response |
| --- | --- | --- |
| List users | `GET /api/user?page=<n>&limit=<n>&name=<filter>` (admin only) | `{ users: User[], more: boolean }` |
| Delete user | `DELETE /api/user/:userId` (admin only) | `{ deleted: boolean }` |

- `page` is **1-based**: the backend computes `offset = (page - 1) * limit`. Sending
  `page=0` produces a negative SQL offset and a 500, so the frontend must never send it.
- `name` uses `*` as a wildcard (converted to SQL `%`).

No backend changes are part of this work.

## Architecture

Approach: extract focused components rather than growing `adminDashboard.tsx`.

| File | Responsibility |
| --- | --- |
| `src/service/pizzaService.ts` | Add `UserList` type; add `getUsers` and `deleteUser` to the `PizzaService` interface. |
| `src/service/httpPizzaService.ts` | Implement `getUsers` and `deleteUser` via `callEndpoint`. |
| `src/views/adminDashboard.tsx` | Admin role gate, tab state, renders the active section. Existing franchise markup moves unchanged into a `FranchisesSection` (same file or `src/components/franchisesSection.tsx`). |
| `src/components/usersTable.tsx` | Owns users list state: page, filter, fetch, search, Prev/Next, which user is pending deletion. |
| `src/components/deleteUserModal.tsx` | Presentational confirm dialog. Props: `user`, `onConfirm(): Promise<void>`, `onCancel()`. |

### Service additions

```ts
type UserList = { users: User[]; more: boolean };

getUsers(page: number, limit: number, nameFilter: string): Promise<UserList>;
deleteUser(user: User): Promise<void>;
```

## Behavior

### Tab toggle

- Two tab buttons under the "Mama Ricci's kitchen" title: **Franchises** | **Users**.
- Stored in local React state; default is Franchises. A page refresh returns to
  Franchises (accepted trade-off).
- The "Add Franchise" button shows only on the Franchises tab.

### Users table

- Columns: **Name**, **Email**, **Role** (all roles joined with `, `), and a ✕
  delete button per row.
- Page size: 10.
- State: `page` (starts at 1), `filter` (starts at `'*'`), `userList`
  (`{ users: [], more: false }`).
- Data is fetched by an effect whenever `page` or `filter` changes.

### Search

- A Name text input and a **Search** button.
- Search sets `filter` to `*${text}*` and resets `page` to 1.
- An empty input searches `*` (all users). Search is by name only, never by id.

### Pagination

- **Prev:** `page = Math.max(1, page - 1)`. On page 1 it stays on page 1; the
  display does not change or break.
- **Next:** advances only when the current response has `more === true`.
  When `more` is false, the button is disabled *and* the click handler is a
  no-op guard, so the page never advances to an empty result.
- The table therefore never shows an empty page from paging. (It can be empty
  only when a search matches nobody.)

### Delete flow

1. Clicking ✕ on a row opens `DeleteUserModal` for that user. No request is sent.
2. The modal reads: "Delete **{name}** ({email})? This cannot be undone. Type the
   user's name to confirm." with a text input.
3. **Delete** is disabled until the typed text equals `user.name` **exactly**
   (case-sensitive, no trimming). Works for non-ASCII names such as `常用名字`.
4. **Cancel** (or closing the modal) dismisses it with no request sent.
5. On **Delete**: call `pizzaService.deleteUser(user)`.
   - Success: close the modal and re-fetch the current page. If that page is now
     empty and `page > 1`, step back one page so the table is not left empty.
   - Failure: keep the modal open and show the error message (e.g. 403).

## Testing

New Playwright spec `tests/adminUsers.spec.ts`, running against the real backend
(no backend mocking). Logs in as admin `a@jwt.com`.

- Toggling between the Franchises and Users tabs shows the matching table.
- Searching by name filters the list.
- Prev on page 1 stays on page 1 with the same rows displayed.
- On the last page, Next is disabled and the rows do not change.
- The ✕ button opens the modal; Delete is disabled until the name matches exactly
  (wrong case keeps it disabled).
- Cancel closes the modal and the user is still listed.
- Full delete: register a fresh user, delete them through the modal, and confirm
  they no longer appear in a search.

## Out of scope

- Editing users or changing roles from this page.
- Persisting the active tab in the URL.
- Preventing an admin from deleting their own account (backend permits it; not
  addressed here).
