import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InsuranceScorecard from '../../components/InsuranceScorecard';

// ── Section 28: Insurance Export / Scorecard ──

// Mock recharts
vi.mock('recharts', () => ({
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
}));

const adminProfile = { id: 'u1', role: 'admin', full_name: 'Admin User' };

function renderISC(props = {}) {
  const { container } = render(
    <InsuranceScorecard
      records={props.records ?? []}
      flights={props.flights ?? []}
      reports={props.reports ?? []}
      hazards={props.hazards ?? []}
      actions={props.actions ?? []}
      policies={props.policies ?? []}
      trainingReqs={props.trainingReqs ?? []}
      trainingRecs={props.trainingRecs ?? []}
      orgProfiles={props.orgProfiles ?? [adminProfile]}
      erpDrills={props.erpDrills ?? []}
      iepAudits={props.iepAudits ?? []}
      auditSchedules={props.auditSchedules ?? []}
      periodStart={props.periodStart ?? '2025-01-01'}
      periodEnd={props.periodEnd ?? '2025-12-31'}
    />
  );
  return { container };
}

describe('InsuranceScorecard', () => {
  it('renders scorecard header', () => {
    renderISC();
    // The scorecard shows "SMS Maturity Score" or similar
    expect(screen.getAllByText(/score/i).length).toBeGreaterThan(0);
  });

  it('displays metric rows', () => {
    renderISC();
    // Shows FRAT Completion metric
    expect(screen.getAllByText(/FRAT/i).length).toBeGreaterThan(0);
  });

  it('renders without crashing when all data arrays are empty', () => {
    const { container } = renderISC({
      records: [], flights: [], reports: [], hazards: [],
      actions: [], policies: [], trainingReqs: [], trainingRecs: [],
      orgProfiles: [adminProfile], erpDrills: [], iepAudits: [], auditSchedules: [],
    });
    expect(container).toBeTruthy();
  });
});
