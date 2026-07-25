"use client";

import Chat from "./components/Chat";
import NameForm from "./components/NameForm";
import { useUserName } from "./hooks/useUserName";

export default function Home() {
  const { name, ready, saveName } = useUserName();

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--ink)]" />
      </main>
    );
  }

  if (!name) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <NameForm onSubmit={saveName} />
      </main>
    );
  }

  return (
    <main className="flex-1">
      <Chat name={name} onChangeName={saveName} />
    </main>
  );
}
