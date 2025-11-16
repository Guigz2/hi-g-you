import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  // Lire profil
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  let profile: Profile | null = profileData as Profile | null;

  // Lazy create si absent (profil jamais provisionné) avec gestion collision username
  if (!profile) {
    const usernameFromMeta = (user.user_metadata as any)?.username ||
      `user_${user.id.substring(0, 8)}`;
    const fullNameFromMeta = (user.user_metadata as any)?.full_name || null;

    let insertUsername = usernameFromMeta;
    let inserted = false;
    for (let i = 0; i < 2 && !inserted; i++) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        username: insertUsername,
        full_name: fullNameFromMeta,
      });
      if (!insertError) {
        inserted = true;
        break;
      }
      if ((insertError as any)?.code === "23505") {
        insertUsername = `${usernameFromMeta}_${Math.random().toString(36).slice(2, 6)}`;
      } else {
        break;
      }
    }

    const { data: created } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = (created || null) as Profile | null;
  }

  const errorParam = typeof searchParams?.error === "string" ? searchParams?.error : undefined;
  const successParam = typeof searchParams?.success === "string" ? searchParams?.success : undefined;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center text-sm text-indigo-600 hover:underline">
          &larr; Retour
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">Mon profil</h1>
      {errorParam === "username_taken" && (
        <p className="text-sm text-red-600">Ce nom d'utilisateur est déjà pris.</p>
      )}
      {successParam === "1" && (
        <p className="text-sm text-green-600">Profil mis à jour.</p>
      )}
      <section className="space-y-2">
        <p><span className="font-medium">Email:</span> {user.email}</p>
        <p><span className="font-medium">Username:</span> {profile?.username}</p>
        <p><span className="font-medium">Nom complet:</span> {profile?.full_name || "—"}</p>
      </section>
      <EditProfileForm profile={profile} />
      <SignOutButton />
    </main>
  );
}

function EditProfileForm({ profile }: { profile: Profile | null }) {
  if (!profile) return null;
  return (
    <form action={updateProfileAction} className="space-y-4">
      <input type="hidden" name="id" value={profile.id} />
      <div>
        <label className="block text-sm mb-1">Username</label>
        <input
          name="username"
          defaultValue={profile.username ?? ""}
          minLength={3}
          maxLength={32}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Nom complet</label>
        <input
          name="full_name"
          defaultValue={profile.full_name ?? ""}
          maxLength={80}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Avatar (URL)</label>
        <input
          name="avatar_url"
          defaultValue={profile.avatar_url ?? ""}
          className="w-full border rounded px-3 py-2"
          placeholder="https://..."
        />
      </div>
      <button
        type="submit"
        className="bg-indigo-600 text-white rounded px-4 py-2"
      >
        Mettre à jour
      </button>
    </form>
  );
}

function SignOutButton() {
  return (
    <form action={signOutAction} className="pt-4">
      <button type="submit" className="bg-gray-900 text-white rounded px-3 py-2">
        Se déconnecter
      </button>
    </form>
  );
}

async function signOutAction() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function updateProfileAction(formData: FormData) {
  "use server";
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const username = String(formData.get("username"));
  const full_name = (formData.get("full_name") || "") as string;
  const avatar_url = (formData.get("avatar_url") || "") as string;

  // Validation simple
  if (username.length < 3 || username.length > 32) {
    redirect("/profile?error=bad_username");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: username.trim(), full_name: full_name.trim(), avatar_url: avatar_url.trim() || null })
    .eq("id", id);

  if (error) {
    if ((error as any).code === "23505" || /duplicate key/i.test(error.message)) {
      redirect("/profile?error=username_taken");
    }
    redirect("/profile?error=update_failed");
  }

  redirect("/profile?success=1");
}
