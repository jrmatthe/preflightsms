-- ═══════════════════════════════════════════════════════════════
-- RESET: Delete all test data, preserve seed/reference tables
-- Run this in the Supabase SQL Editor
-- After running, log in and you'll go through org setup as a new admin
-- ═══════════════════════════════════════════════════════════════

-- Disable triggers temporarily to avoid FK constraint issues
SET session_replication_role = 'replica';

-- ── ADS-B / Flight Tracking ──
TRUNCATE TABLE flight_positions CASCADE;
TRUNCATE TABLE adsb_provider_health CASCADE;

-- ── ASAP Program ──
TRUNCATE TABLE asap_corrective_actions CASCADE;
TRUNCATE TABLE asap_erc_reviews CASCADE;
TRUNCATE TABLE asap_meetings CASCADE;
TRUNCATE TABLE asap_reports CASCADE;
TRUNCATE TABLE asap_config CASCADE;

-- ── Audits & Internal Evaluation ──
TRUNCATE TABLE audit_responses CASCADE;
TRUNCATE TABLE audit_schedules CASCADE;
TRUNCATE TABLE audits CASCADE;
TRUNCATE TABLE audit_templates CASCADE;

-- ── AI Features ──
TRUNCATE TABLE ai_suggestions CASCADE;
TRUNCATE TABLE trend_alerts CASCADE;
TRUNCATE TABLE ai_usage_log CASCADE;
TRUNCATE TABLE safety_digests CASCADE;

-- ── API / Webhooks ──
TRUNCATE TABLE api_request_log CASCADE;
TRUNCATE TABLE webhooks CASCADE;
TRUNCATE TABLE api_keys CASCADE;

-- ── CBT Progress (keep courses and lessons) ──
TRUNCATE TABLE cbt_progress CASCADE;
TRUNCATE TABLE cbt_enrollments CASCADE;

-- ── Compliance (keep checklist_items and crosswalk) ──
TRUNCATE TABLE compliance_status CASCADE;
TRUNCATE TABLE compliance_frameworks CASCADE;

-- ── Culture Surveys ──
TRUNCATE TABLE culture_survey_results CASCADE;
TRUNCATE TABLE culture_survey_responses CASCADE;
TRUNCATE TABLE culture_surveys CASCADE;

-- ── Declarations ──
TRUNCATE TABLE declarations CASCADE;

-- ── Emergency Response Plans ──
TRUNCATE TABLE erp_drills CASCADE;
TRUNCATE TABLE erp_call_tree CASCADE;
TRUNCATE TABLE erp_checklist_items CASCADE;
TRUNCATE TABLE erp_plans CASCADE;

-- ── Engagement ──
TRUNCATE TABLE pilot_engagement CASCADE;
TRUNCATE TABLE safety_recognitions CASCADE;

-- ── Fatigue ──
TRUNCATE TABLE fatigue_assessments CASCADE;

-- ── Flights & FRATs ──
TRUNCATE TABLE flights CASCADE;
TRUNCATE TABLE frat_submissions CASCADE;

-- ── ForeFlight ──
TRUNCATE TABLE foreflight_flights CASCADE;
TRUNCATE TABLE foreflight_config CASCADE;

-- ── Insurance ──
TRUNCATE TABLE insurance_exports CASCADE;

-- ── Invitations ──
TRUNCATE TABLE invitations CASCADE;

-- ── Management of Change ──
TRUNCATE TABLE moc_attachments CASCADE;
TRUNCATE TABLE management_of_change CASCADE;

-- ── Notifications ──
TRUNCATE TABLE notifications CASCADE;

-- ── Aircraft ──
TRUNCATE TABLE aircraft CASCADE;

-- ── SchedAero ──
TRUNCATE TABLE schedaero_trips CASCADE;
TRUNCATE TABLE schedaero_config CASCADE;

-- ── Safety Performance Indicators ──
TRUNCATE TABLE spi_measurements CASCADE;
TRUNCATE TABLE safety_performance_targets CASCADE;
TRUNCATE TABLE safety_performance_indicators CASCADE;

-- ── Trial Emails ──
TRUNCATE TABLE trial_emails_sent CASCADE;

-- ── Safety Reports (if table exists from earlier schema) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'safety_reports') THEN
    EXECUTE 'TRUNCATE TABLE safety_reports CASCADE';
  END IF;
END $$;

-- ── Hazards / Corrective Actions (if tables exist) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corrective_actions') THEN
    EXECUTE 'TRUNCATE TABLE corrective_actions CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hazards') THEN
    EXECUTE 'TRUNCATE TABLE hazards CASCADE';
  END IF;
END $$;

-- ── SMS Manuals / Documents (if tables exist) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_manuals') THEN
    EXECUTE 'TRUNCATE TABLE sms_manuals CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_sections') THEN
    EXECUTE 'TRUNCATE TABLE manual_sections CASCADE';
  END IF;
END $$;

-- ── Platform Admins ──
TRUNCATE TABLE platform_admins CASCADE;

-- ── Profiles & Organizations (last, since many tables FK to these) ──
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE organizations CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ═══════════════════════════════════════════════════════════════
-- PRESERVED (not deleted):
--   compliance_checklist_items  (ICAO, IS-BAO, EASA, TC requirements)
--   compliance_crosswalk        (Part 5 → international mappings)
--   cbt_courses                 (training course definitions)
--   cbt_lessons                 (training lesson content)
-- ═══════════════════════════════════════════════════════════════
