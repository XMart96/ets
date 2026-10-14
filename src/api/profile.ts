import { supabase } from "@/lib/supabase";
import { currentUserId } from "./auth";
import { ApiError, unwrap } from "./errors";

export type Profile = {
  firstName: string;
  lastName: string;
  role: string;
};

/** Profile of the signed-in user, or null if it is not filled in yet. */
export async function getMyProfile(userId?: string): Promise<Profile | null> {
  const id = userId ?? (await currentUserId());
  if (!id) return null;
  const data = unwrap(
    await supabase
      .from("profiles")
      .select("first_name, last_name, role")
      .eq("id", id)
      .maybeSingle(),
  );
  return data
    ? { firstName: data.first_name, lastName: data.last_name, role: data.role }
    : null;
}

export async function createProfile(firstName: string, lastName: string) {
  const id = await currentUserId();
  if (!id) throw new ApiError("not_authenticated");
  unwrap(
    await supabase
      .from("profiles")
      .insert({ id, first_name: firstName, last_name: lastName }),
  );
}

export async function updateProfile(firstName: string, lastName: string) {
  const id = await currentUserId();
  if (!id) throw new ApiError("not_authenticated");
  unwrap(
    await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", id),
  );
}
