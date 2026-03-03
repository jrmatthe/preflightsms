-- ═══════════════════════════════════════════════════════════════
-- Migration 005: Configurable FRAT Templates
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- FRAT Templates table
-- Each org can have multiple templates but only one active at a time
create table if not exists public.frat_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Default FRAT',
  is_active boolean not null default true,
  
  -- Risk threshold configuration
  risk_thresholds jsonb not null default '[
    {"level": "LOW", "label": "LOW RISK", "min": 0, "max": 15, "color": "green", "action": "Flight authorized — standard procedures"},
    {"level": "MODERATE", "label": "MODERATE RISK", "min": 16, "max": 30, "color": "yellow", "action": "Enhanced awareness — brief crew on elevated risk factors"},
    {"level": "HIGH", "label": "HIGH RISK", "min": 31, "max": 45, "color": "amber", "action": "Requires management approval before departure"},
    {"level": "CRITICAL", "label": "CRITICAL RISK", "min": 46, "max": 100, "color": "red", "action": "Flight should not depart without risk mitigation and executive approval"}
  ]'::jsonb,
  
  -- Aircraft types for this org
  aircraft_types jsonb not null default '["PC-12", "King Air"]'::jsonb,
  
  -- Risk categories and factors
  -- Array of: { id, name, factors: [{ id, label, score }] }
  categories jsonb not null default '[]'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure only one active template per org
create unique index if not exists idx_frat_templates_active 
  on public.frat_templates (org_id) where (is_active = true);

-- RLS
alter table public.frat_templates enable row level security;

create policy "Users can view their org templates"
  on public.frat_templates for select
  to authenticated
  using (org_id in (select org_id from profiles where id = auth.uid()));

create policy "Admins can insert templates"
  on public.frat_templates for insert
  to authenticated
  with check (org_id in (select org_id from profiles where id = auth.uid()));

create policy "Admins can update their org templates"
  on public.frat_templates for update
  to authenticated
  using (org_id in (select org_id from profiles where id = auth.uid()))
  with check (org_id in (select org_id from profiles where id = auth.uid()));

create policy "Admins can delete their org templates"
  on public.frat_templates for delete
  to authenticated
  using (org_id in (select org_id from profiles where id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- Seed the default template for existing orgs
-- This inserts the current PVTAIR template as the default
-- ═══════════════════════════════════════════════════════════════
insert into public.frat_templates (org_id, name, is_active, categories, aircraft_types)
select 
  id as org_id,
  'Default FRAT' as name,
  true as is_active,
  '[
    {
      "id": "weather",
      "name": "Weather",
      "factors": [
        {"id": "wx_ceiling", "label": "Ceiling < 1000'' AGL at departure or destination", "score": 4},
        {"id": "wx_vis", "label": "Visibility < 3 SM at departure or destination", "score": 4},
        {"id": "wx_xwind", "label": "Crosswind > 15 kts (or > 50% of max demonstrated)", "score": 3},
        {"id": "wx_ts", "label": "Thunderstorms forecast along route or at terminals", "score": 5},
        {"id": "wx_ice", "label": "Known or forecast icing conditions", "score": 4},
        {"id": "wx_turb", "label": "Moderate or greater turbulence forecast", "score": 3},
        {"id": "wx_wind_shear", "label": "Wind shear advisories", "score": 5},
        {"id": "wx_mountain", "label": "Mountain obscuration or high DA affecting performance", "score": 4}
      ]
    },
    {
      "id": "pilot",
      "name": "Pilot / Crew",
      "factors": [
        {"id": "plt_fatigue", "label": "Crew rest < 10 hours or significant fatigue factors", "score": 5},
        {"id": "plt_recency", "label": "PIC < 3 flights in aircraft type in last 30 days", "score": 3},
        {"id": "plt_new_crew", "label": "First time flying together as a crew pairing", "score": 2},
        {"id": "plt_stress", "label": "Significant personal stressors affecting crew", "score": 4},
        {"id": "plt_duty", "label": "Approaching max duty time limitations", "score": 3},
        {"id": "plt_unfam_apt", "label": "PIC unfamiliar with departure or destination airport", "score": 3}
      ]
    },
    {
      "id": "aircraft",
      "name": "Aircraft",
      "factors": [
        {"id": "ac_mel", "label": "Operating with MEL items", "score": 3},
        {"id": "ac_mx_defer", "label": "Deferred maintenance items", "score": 3},
        {"id": "ac_recent_mx", "label": "Aircraft recently out of major maintenance", "score": 2},
        {"id": "ac_perf_limit", "label": "Operating near weight/performance limits", "score": 4},
        {"id": "ac_known_issue", "label": "Known recurring squawk or system anomaly", "score": 3}
      ]
    },
    {
      "id": "environment",
      "name": "Environment",
      "factors": [
        {"id": "env_night", "label": "Night operations", "score": 2},
        {"id": "env_terrain", "label": "Mountainous terrain along route", "score": 3},
        {"id": "env_unfam_airspace", "label": "Complex or unfamiliar airspace", "score": 2},
        {"id": "env_short_runway", "label": "Runway length < 4000'' or contaminated surface", "score": 4},
        {"id": "env_remote", "label": "Limited alternate airports available", "score": 3},
        {"id": "env_notams", "label": "Significant NOTAMs affecting operation", "score": 2}
      ]
    },
    {
      "id": "operational",
      "name": "Operational",
      "factors": [
        {"id": "ops_pax_pressure", "label": "Significant schedule pressure from passengers/client", "score": 3},
        {"id": "ops_time_pressure", "label": "Tight schedule with minimal buffer", "score": 3},
        {"id": "ops_vip", "label": "High-profile passengers or sensitive mission", "score": 2},
        {"id": "ops_multi_leg", "label": "3+ legs in a single duty period", "score": 3},
        {"id": "ops_unfam_mission", "label": "Unusual mission profile or first-time operation type", "score": 3},
        {"id": "ops_hazmat", "label": "Hazardous materials on board", "score": 2}
      ]
    }
  ]'::jsonb as categories,
  '["PC-12", "King Air"]'::jsonb as aircraft_types
from public.organizations
where id not in (select org_id from public.frat_templates);
