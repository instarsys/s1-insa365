-- payslip_email_logs: RLS + FORCE RLS
ALTER TABLE "payslip_email_logs" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payslip_email_logs' AND policyname = 'tenant_isolation_payslip_email_logs') THEN
    CREATE POLICY tenant_isolation_payslip_email_logs ON "payslip_email_logs"
      USING (company_id = current_setting('app.company_id', true)::text)
      WITH CHECK (company_id = current_setting('app.company_id', true)::text);
  END IF;
END $$;

ALTER TABLE "payslip_email_logs" FORCE ROW LEVEL SECURITY;

-- SECURITY DEFINER function: 트래킹 픽셀 엔드포인트에서 RLS 우회하여 열람 상태 업데이트
CREATE OR REPLACE FUNCTION record_payslip_email_open(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id FROM payslip_email_logs
    WHERE tracking_token = p_token AND status != 'OPENED';
  IF v_id IS NOT NULL THEN
    UPDATE payslip_email_logs SET status = 'OPENED', opened_at = NOW() WHERE id = v_id;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;
