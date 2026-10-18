import { supabase } from "@/integrations/supabase/client";

type ErrorSource = 'foodintel' | 'marketintel' | 'economic' | 'population' | 'expenditure';

interface LogErrorParams {
  userId: string;
  source: ErrorSource;
  errorType: string;
  errorMessage: string;
  kabupatenKotaInput: string;
  kabupatenKotaResolved?: string | null;
  province?: string | null;
  district?: string | null;
  context?: Record<string, any>;
}

export async function logAnalysisError(params: LogErrorParams): Promise<void> {
  try {
    await supabase.from("analysis_error_logs" as any).insert({
      user_id: params.userId,
      source: params.source,
      kabupaten_kota_input: params.kabupatenKotaInput,
      kabupaten_kota_resolved: params.kabupatenKotaResolved || null,
      province: params.province || null,
      district: params.district || null,
      error_type: params.errorType,
      error_message: params.errorMessage,
      context: params.context || null,
    } as any);
  } catch (e) {
    console.error("[AnalysisErrorLog] Failed to log:", e);
  }
}
