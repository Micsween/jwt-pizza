import React from 'react';
import { pizzaService } from '../service/service';
import { User, UserList } from '../service/pizzaService';
import DeleteUserModal from './deleteUserModal';

const pageSize = 10;

// Fixed column widths keep the table from resizing between pages. Email is sized to fit a
// typical long address (r6trak3333kkbg33@franchisee.com) with headroom, since glyph widths
// vary; only an unusually long email widens the table. Long names are truncated.
const columns = [
  ['Name', 'w-[12rem]'],
  ['Email', 'w-[18rem]'],
  ['Role', 'w-[8rem]'],
  ['Action', 'w-[6rem]'],
];

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

  // The backend computes offset = (page - 1) * limit, so page 0 would be a negative offset.
  function prevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  // Only advance when the backend says there is another page, so we never land on an empty one.
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
            {columns.map(([header, width]) => (
              <th key={header} scope="col" className={`${width} px-6 py-3 text-center text-xs font-medium`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dominos-gray-200">
          {userList.users.map((user) => (
            <tr key={user.id} className="h-10 bg-neutral-100">
              <td className="text-start px-2 text-sm text-dominos-gray-900">
                <div className="truncate max-w-[11rem]" title={user.name}>
                  {user.name}
                </div>
              </td>
              <td className="text-start px-2 whitespace-nowrap text-sm text-dominos-gray-900">{user.email}</td>
              <td className="text-start px-2 text-sm text-dominos-gray-900">{user.roles?.map((r) => r.role).join(', ')}</td>
              <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                <button type="button" aria-label={`Delete ${user.name}`} className="px-2 py-1 text-sm font-semibold rounded-lg border border-dominos-link text-dominos-link hover:border-jwt-red hover:text-jwt-red" onClick={() => setUserToDelete(user)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {/* Pad short pages with blank rows so the table keeps the same height on every page. */}
          {Array.from({ length: pageSize - userList.users.length }, (_, i) => (
            <tr key={`filler-${i}`} aria-hidden="true" className="h-10 bg-neutral-100">
              <td colSpan={4} />
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
