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
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Unable to delete user');
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
          Delete <b>{user.name}</b> ({user.email})? This cannot be undone. Type the user&apos;s name to confirm.
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
