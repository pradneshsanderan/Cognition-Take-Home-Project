"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type SwitchableUser = {
  email: string;
  name: string;
  roles: string[];
};

export function UserSwitcher({
  users,
  currentEmail,
}: {
  users: SwitchableUser[];
  currentEmail: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Acting as</span>
      <select
        value={currentEmail ?? ""}
        disabled={pending}
        onChange={(event) => {
          const email = event.target.value;
          startTransition(async () => {
            await fetch("/api/identity", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email }),
            });
            router.push("/");
            router.refresh();
          });
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">No user selected</option>
        {users.map((user) => (
          <option key={user.email} value={user.email}>
            {user.name} ({user.roles.join(", ") || "no roles"})
          </option>
        ))}
      </select>
    </label>
  );
}
