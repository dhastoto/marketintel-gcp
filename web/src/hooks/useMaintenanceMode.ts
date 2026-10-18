import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMaintenanceMode() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "maintenance_mode")
        .maybeSingle();
      setIsMaintenanceMode(data?.config_value === "true");
      setLoading(false);
    };
    fetch();

    // Re-check every 30s so admin toggle takes effect quickly
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, []);

  return { isMaintenanceMode, loading };
}
