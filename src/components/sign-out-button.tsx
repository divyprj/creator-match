"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return <button className="quiet-button" onClick={async () => { await createClient().auth.signOut(); router.push("/"); router.refresh(); }}><SignOut size={17} /> Sign out</button>;
}
