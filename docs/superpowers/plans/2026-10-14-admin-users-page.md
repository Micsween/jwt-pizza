# Admin Users Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Users tab to the admin dashboard that lists, searches, pages, and deletes users with typed-name confirmation.

**Architecture:** Two new service calls (`getUsers`, `deleteUser`) wrap the existing backend endpoints. A `UsersTable` component owns list/paging/search state and a `DeleteUserModal` handles confirmation. `AdminDashboard` gains tab state and renders either the existing franchise markup or `UsersTable`.

**Tech Stack:** React 18, TypeScript, Tailwind, Vite, Playwright (`playwright-test-coverage`), backend `jwt-pizza-service` on `localhost:3000` with MySQL in Docker.

**Spec:** `docs/superpowers/specs/2026-10-14-admin-users-page-design.md`

**Deviation from spec:** the franchise markup stays inline in `adminDashboard.tsx` behind `tab === 'franchises'` rather than moving into a `FranchisesSection` component. This keeps the diff on existing code minimal; the new user code is still fully extracted.

---

## Prerequisites (for running Playwright tests)

1. MySQL container up: `cd ../jwt-pizza-service && docker compose up -d`
2. Backend running: `cd ../jwt-pizza-service && npm start` (listens on `:3000`)
3. Frontend `.env` has `VITE_PIZZA_SERVICE_URL=http://localhost:3000` (it does). Playwright starts `npm run dev` itself.

---

### Task 1: Service layer

**Files:**
- Modify: `src/service/pizzaService.ts`
- Modify: `src/service/httpPizzaService.ts`

- [ ] **Step 1: Add the `UserList` type and interface methods** in `pizzaService.ts`

After the `FranchiseList` type:

```ts
type UserList = {
  users: User[];
  more: boolean;
};
```

In `interface PizzaService`, after `updateUser`:

```ts
  getUsers(page: number, limit: number, nameFilter: string): Promise<UserList>;
  deleteUser(user: User): Promise<void>;
```

Add `UserList` to the export list.

- [ ] **Step 2: Implement in `httpPizzaService.ts`** (and add `UserList` to its import)

After `updateUser`:

```ts
  async getUsers(page: number = 1, limit: number = 10, nameFilter: string = '*'): Promise<UserList> {
    return this.callEndpoint(`/api/user?page=${page}&limit=${limit}&name=${encodeURIComponent(nameFilter)}`);
  }

  async deleteUser(user: User): Promise<void> {
    return this.callEndpoint(`/api/user/${user.id}`, 'DELETE');
  }
```

- [ ] **Step 3: Type-check** — Run: `npx tsc --noEmit` — Expected: no new errors.

- [ ] **Step 4: Commit** — `git commit -am "feat: add getUsers and deleteUser to pizza service"`

---

### Task 2: Playwright tests (written first, fail until Tasks 3–5 land)

**Files:**
- Create: `tests/adminUsers.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, Page, APIRequestContext } from 'playwright-test-coverage';

const serviceUrl = 'http://localhost:3000';

function uniqueId() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

async function registerUser(request: APIRequestContext, name: string) {
  const email = `${name.replace(/\s/g, '')}@jwt.com`;
  const res = await request.post(`${serviceUrl}/api/auth`, { data: { name, email, password: 'pw' } });
  expect(res.ok()).toBeTruthy();
  return { name, email };
}

async function openUsersTab(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('tab', { name: 'Users' }).click();
}

async function search(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Filter users' }).fill(text);
  await page.getByRole('button', { name: 'Search' }).click();
}

function userRows(page: Page) {
  return page.getByRole('table', { name: 'Users' }).locator('tbody tr');
}

test('toggle between franchises and users', async ({ page }) => {
  await openUsersTab(page);
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeHidden();

  await page.getByRole('tab', { name: 'Franchises' }).click();
  await expect(page.getByRole('table', { name: 'Users' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeVisible();
});

test('search users by name', async ({ page, request }) => {
  const user = await registerUser(request, `search${uniqueId()}`);
  await openUsersTab(page);
  await search(page, user.name);
  await expect(userRows(page)).toHaveCount(1);
  await expect(userRows(page).first()).toContainText(user.email);
  await expect(userRows(page).first()).toContainText('diner');
});

test('prev on first page stays on page 1', async ({ page }) => {
  const requestedPages: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname === '/api/user') requestedPages.push(url.searchParams.get('page') ?? '');
  });

  await openUsersTab(page);
  await expect(userRows(page).first()).toBeVisible();
  const firstRow = await userRows(page).first().textContent();

  await page.getByRole('button', { name: 'Prev' }).click();
  await page.getByRole('button', { name: 'Prev' }).click();

  await expect(userRows(page).first()).toHaveText(firstRow ?? '');
  expect(requestedPages).not.toContain('0');
});

test('next does not advance past the last page, delete steps back', async ({ page, request }) => {
  test.setTimeout(20000);
  const prefix = `page${uniqueId()}`;
  for (let i = 0; i < 11; i++) {
    await registerUser(request, `${prefix}x${i}`);
  }

  await openUsersTab(page);
  await search(page, prefix);
  await expect(userRows(page)).toHaveCount(10);

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(userRows(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await expect(userRows(page)).toHaveCount(1);

  const lastName = (await userRows(page).first().locator('td').first().textContent()) ?? '';
  await page.getByRole('button', { name: `Delete ${lastName}` }).click();
  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(lastName);
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  // Page 2 is now empty, so the table steps back to page 1 instead of showing nothing.
  await expect(userRows(page)).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('delete requires exact name and can be cancelled', async ({ page, request }) => {
  const user = await registerUser(request, `Cancel${uniqueId()}`);
  await openUsersTab(page);
  await search(page, user.name);

  await page.getByRole('button', { name: `Delete ${user.name}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(user.email);
  const deleteButton = dialog.getByRole('button', { name: 'Delete' });
  await expect(deleteButton).toBeDisabled();

  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(user.name.toLowerCase());
  await expect(deleteButton).toBeDisabled();
  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(user.name);
  await expect(deleteButton).toBeEnabled();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(userRows(page)).toHaveCount(1);
});

test('delete user after confirming name', async ({ page, request }) => {
  const user = await registerUser(request, `doomed${uniqueId()}`);
  await openUsersTab(page);
  await search(page, user.name);

  await page.getByRole('button', { name: `Delete ${user.name}` }).click();
  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(user.name);
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(userRows(page)).toHaveCount(0);
});
```

- [ ] **Step 2: Run to confirm failure** — Run: `npx playwright test tests/adminUsers.spec.ts` — Expected: FAIL (no `Users` tab).

- [ ] **Step 3: Commit** — `git add tests/adminUsers.spec.ts && git commit -m "test: add admin users page playwright tests"`

---

### Task 3: DeleteUserModal

**Files:**
- Create: `src/components/deleteUserModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { User } from '../service/pizzaService';

interface Props {
  user: User;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteUserModal({ user, onConfirm, onCancel }: Props) {
  const [typedName, setTypedName] = React.useState('');
  const [error, setError] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const nameMatches = typedName === user.name;

  async function confirm() {
    if (!nameMatches || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to delete user');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div role="dialog" aria-modal="true" aria-labelledby="delete-user-title" className="bg-white rounded-lg shadow-lg p-6 w-96 text-start">
        <h3 id="delete-user-title" className="text-jwt-red text-lg font-semibold">
          Delete user
        </h3>
        <p className="my-3 text-sm text-neutral-700">
          Delete <b>{user.name}</b> ({user.email})? This cannot be undone. Type the user's name to confirm.
        </p>
        <input type="text" aria-label="Confirm user name" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder={user.name} className="w-full px-2 py-1 text-sm border border-dominos-gray-200 rounded-lg" />
        {error && <p className="mt-2 text-sm text-jwt-red">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="px-3 py-1 text-sm font-semibold rounded-lg border border-dominos-gray-200 text-neutral-700 hover:bg-neutral-100" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="px-3 py-1 text-sm font-semibold rounded-lg bg-jwt-red text-white hover:bg-dominos-darkred disabled:bg-dominos-gray-200 disabled:text-neutral-500" onClick={confirm} disabled={!nameMatches || deleting}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit** — `git add src/components/deleteUserModal.tsx && git commit -m "feat: add delete user confirmation modal"`

---

### Task 4: UsersTable

**Files:**
- Create: `src/components/usersTable.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { pizzaService } from '../service/service';
import { User, UserList } from '../service/pizzaService';
import DeleteUserModal from './deleteUserModal';

const pageSize = 10;

export default function UsersTable() {
  const [userList, setUserList] = React.useState<UserList>({ users: [], more: false });
  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState('*');
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);
  const filterRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      const list = await pizzaService.getUsers(page, pageSize, filter);
      if (!ignore) setUserList(list);
    })();
    return () => {
      ignore = true;
    };
  }, [page, filter]);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const text = filterRef.current?.value ?? '';
    setFilter(text ? `*${text}*` : '*');
    setPage(1);
  }

  function prevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function nextPage() {
    if (userList.more) setPage((p) => p + 1);
  }

  async function deleteUser() {
    if (!userToDelete) return;
    await pizzaService.deleteUser(userToDelete);
    setUserToDelete(null);
    const refreshed = await pizzaService.getUsers(page, pageSize, filter);
    if (refreshed.users.length === 0 && page > 1) {
      setPage(page - 1);
    } else {
      setUserList(refreshed);
    }
  }

  return (
    <div className="bg-neutral-100 overflow-clip my-4">
      <table aria-label="Users" className="min-w-full divide-y divide-dominos-gray-200">
        <thead className="uppercase text-jwt-brown bg-dominos-sky border-b-2 border-dominos-blue">
          <tr>
            {['Name', 'Email', 'Role', 'Action'].map((header) => (
              <th key={header} scope="col" className="px-6 py-3 text-center text-xs font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dominos-gray-200">
          {userList.users.map((user) => (
            <tr key={user.id} className="bg-neutral-100">
              <td className="text-start px-2 whitespace-nowrap text-sm text-dominos-gray-900">{user.name}</td>
              <td className="text-start px-2 whitespace-nowrap text-sm text-dominos-gray-900">{user.email}</td>
              <td className="text-start px-2 whitespace-nowrap text-sm text-dominos-gray-900">{user.roles?.map((r) => r.role).join(', ')}</td>
              <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                <button type="button" aria-label={`Delete ${user.name}`} className="px-2 py-1 text-sm font-semibold rounded-lg border border-dominos-link text-dominos-link hover:border-jwt-red hover:text-jwt-red" onClick={() => setUserToDelete(user)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="px-1 py-1">
              <form onSubmit={search}>
                <input type="text" ref={filterRef} aria-label="Filter users" placeholder="Name" className="px-2 py-1 text-sm border border-dominos-gray-200 rounded-lg" />
                <button type="submit" className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-dominos-link text-dominos-link hover:border-jwt-red hover:text-jwt-red">
                  Search
                </button>
              </form>
            </td>
            <td colSpan={2} className="text-end text-sm font-medium">
              <button className="w-14 p-1 text-sm font-semibold rounded-lg border bg-white text-grey border-grey m-1 hover:bg-dominos-sky" onClick={prevPage}>
                Prev
              </button>
              <button className="w-14 p-1 text-sm font-semibold rounded-lg border bg-white text-grey border-grey m-1 hover:bg-dominos-sky disabled:bg-dominos-gray-200" onClick={nextPage} disabled={!userList.more}>
                Next
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
      {userToDelete && <DeleteUserModal user={userToDelete} onConfirm={deleteUser} onCancel={() => setUserToDelete(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit** — `git add src/components/usersTable.tsx && git commit -m "feat: add paginated, searchable users table"`

---

### Task 5: Tabs in AdminDashboard

**Files:**
- Modify: `src/views/adminDashboard.tsx`

- [ ] **Step 1: Add tab state and import**

```tsx
import UsersTable from '../components/usersTable';
// inside AdminDashboard:
const [tab, setTab] = React.useState<'franchises' | 'users'>('franchises');
```

- [ ] **Step 2: Render the tab bar and switch sections.** Inside `<View>`, before the existing `text-start` div:

```tsx
<div role="tablist" className="flex justify-center gap-2 pt-4">
  {(['franchises', 'users'] as const).map((t) => (
    <button key={t} role="tab" aria-selected={tab === t} className={`px-4 py-1 text-sm font-semibold capitalize border-b-2 ${tab === t ? 'border-orange-400 text-orange-400' : 'border-transparent text-neutral-300 hover:text-white'}`} onClick={() => setTab(t)}>
      {t}
    </button>
  ))}
</div>
```

Wrap the existing franchise `div` and the "Add Franchise" `div` in `{tab === 'franchises' && (<> ... </>)}`, and add:

```tsx
{tab === 'users' && (
  <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
    <h3 className="text-jwt-brown text-xl">Users</h3>
    <UsersTable />
  </div>
)}
```

- [ ] **Step 3: Type-check and lint** — `npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Run the new tests** — `npx playwright test tests/adminUsers.spec.ts` — Expected: 6 passed.

- [ ] **Step 5: Run the whole suite** — `npx playwright test` — Expected: all pass.

- [ ] **Step 6: Commit** — `git commit -am "feat: add users tab to admin dashboard"`
