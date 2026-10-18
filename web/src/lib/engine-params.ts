import { supabase } from "@/integrations/supabase/client";

let paramCache: Map<string, number> | null = null;

export async function loadParams(): Promise<Map<string, number>> {
  if (paramCache) return paramCache;

  const { data } = await supabase
    .from('engine_parameters')
    .select('category, param_key, param_value');

  paramCache = new Map();
  for (const row of data || []) {
    paramCache.set(`${row.category}::${row.param_key}`, Number(row.param_value));
  }
  return paramCache;
}

export function getParam(
  params: Map<string, number>,
  category: string,
  key: string,
  fallback: number = 0
): number {
  return params.get(`${category}::${key}`)
    ?? params.get(`_global::${key}`)
    ?? fallback;
}

export function clearParamCache() {
  paramCache = null;
}
