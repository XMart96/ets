import { supabase } from "@/lib/supabase";

/** Clinic name by id; null if unknown or the request failed (it is only a label). */
export async function getClinicName(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return data?.name ?? null;
}
