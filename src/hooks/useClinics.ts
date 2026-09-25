import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Clinic = { id: string; name: string };

export function useClinics() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name")
        .order("name");

      if (!error && data) setClinics(data);
      setLoading(false);
    })();
  }, []);

  return { clinics, loading };
}
