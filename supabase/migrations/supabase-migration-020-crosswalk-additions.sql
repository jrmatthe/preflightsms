-- Additional compliance crosswalk mappings
-- Adds defensible Part 5 → international framework mappings that were missing
-- Run this in the Supabase SQL editor

INSERT INTO compliance_crosswalk (source_framework, source_section, target_framework, target_section, mapping_notes) VALUES

-- §5.91 (Training) → Transport Canada recurrent and specialized training
-- Part 5 training requirement is not limited to initial training
('faa_part5', '5.91', 'transport_canada', '4.2', 'Part 5 training encompasses recurrent training, not just initial'),
('faa_part5', '5.91', 'transport_canada', '4.3', 'Part 5 training encompasses specialized/role-specific training'),

-- §5.93 (Safety Communication) → EASA lessons learned
-- Lessons learned dissemination is a core safety communication activity
('faa_part5', '5.93', 'easa', '4.3', 'Lessons learned dissemination is a form of safety communication'),

-- §5.21 (Safety Policy) → IS-BAO 7.1 (SMS Safety Policy)
-- IS-BAO has safety policy in two places (1.1 under Management, 7.1 under SMS); both map to Part 5 safety policy
('faa_part5', '5.21', 'is_bao', '7.1', 'IS-BAO SMS safety policy section — same concept as 1.1 under Management'),

-- §5.21 (Safety Policy) → Transport Canada non-punitive reporting
-- Non-punitive reporting provisions are a standard component of the Part 5 safety policy
('faa_part5', '5.21', 'transport_canada', '1.2', 'Non-punitive reporting is a standard element of the Part 5 safety policy'),

-- §5.71 (Safety Performance Monitoring) → IS-BAO safety data analysis
-- Safety data analysis is an integral part of performance monitoring
('faa_part5', '5.71', 'is_bao', '7.6', 'Safety data analysis is a component of safety performance monitoring'),

-- §5.71 (Safety Performance Monitoring) → Transport Canada management review
-- Management review is driven by and evaluates safety performance data
('faa_part5', '5.71', 'transport_canada', '1.7', 'Management review evaluates safety performance monitoring outputs'),

-- §5.51 (SRM Applicability) → Transport Canada reactive processes
-- SRM includes reactive hazard identification from occurrences and incidents
('faa_part5', '5.51', 'transport_canada', '3.1', 'SRM includes reactive processes — reporting and analyzing safety occurrences'),

-- §5.53 (System Analysis / Hazard ID) → Transport Canada investigation
-- System analysis and hazard identification encompasses structured investigation
('faa_part5', '5.53', 'transport_canada', '3.3', 'System analysis encompasses investigation to identify causes and contributing factors');
