import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AsapProgram from '../../components/AsapProgram';

// ── Section 17: ASAP Program (Enterprise) ──

// Mock recharts to avoid SVG rendering issues
vi.mock('recharts', () => ({
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
}));

const adminProfile = { id: 'u1', role: 'admin', full_name: 'Admin User' };
const org = { id: 'org-1', name: 'Test Aviation', tier: 'enterprise' };

function makeReport(overrides = {}) {
  return {
    id: 'asap-1',
    report_code: 'ASAP-001',
    reporter_name: 'Test Pilot',
    event_date: '2025-06-15',
    event_type: 'deviation',
    flight_phase: 'cruise',
    description: 'Altitude deviation during cruise',
    status: 'submitted',
    severity: 'Minor',
    likelihood: 'Remote',
    created_at: '2025-06-15T14:00:00Z',
    ...overrides,
  };
}

const baseReports = [
  makeReport({ id: 'asap-1', status: 'submitted' }),
  makeReport({ id: 'asap-2', status: 'erc_review', report_code: 'ASAP-002' }),
  makeReport({ id: 'asap-3', status: 'accepted', report_code: 'ASAP-003' }),
  makeReport({ id: 'asap-4', status: 'closed', report_code: 'ASAP-004' }),
];

function renderASAP(props = {}) {
  const { container } = render(
    <AsapProgram
      profile={props.profile ?? adminProfile}
      session={props.session ?? { user: { id: 'u1' } }}
      org={props.org ?? org}
      orgProfiles={props.orgProfiles ?? [adminProfile]}
      asapConfig={props.asapConfig ?? null}
      asapReports={props.asapReports ?? baseReports}
      asapCorrActions={props.asapCorrActions ?? []}
      asapMeetings={props.asapMeetings ?? []}
      onSaveConfig={vi.fn()}
      onCreateReport={vi.fn()}
      onUpdateReport={vi.fn()}
      onDeleteReport={vi.fn()}
      onFetchErcReviews={vi.fn()}
      onCreateErcReview={vi.fn()}
      onUpdateErcReview={vi.fn()}
      onCreateCorrAction={vi.fn()}
      onUpdateCorrAction={vi.fn()}
      onDeleteCorrAction={vi.fn()}
      onCreateMeeting={vi.fn()}
      onUpdateMeeting={vi.fn()}
      onDeleteMeeting={vi.fn()}
      onRefresh={vi.fn()}
      onCreateAction={vi.fn()}
      onInitSetup={vi.fn()}
    />
  );
  return { container };
}

describe('AsapProgram', () => {
  it('renders ASAP header', () => {
    renderASAP();
    // Multiple elements may match; just verify at least one exists
    expect(screen.getAllByText(/ASAP/)[0]).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = renderASAP();
    expect(container).toBeTruthy();
  });

  it('shows dashboard stats when reports provided', () => {
    renderASAP();
    // Dashboard view shows stats like "Total Reports"
    expect(screen.getAllByText(/report/i).length).toBeGreaterThan(0);
  });

  it('shows empty state when no reports', () => {
    renderASAP({ asapReports: [] });
    expect(screen.getAllByText(/no.*report|get started/i)[0]).toBeInTheDocument();
  });

  it('handles null asapConfig gracefully', () => {
    const { container } = renderASAP({ asapConfig: null });
    expect(container).toBeTruthy();
  });
});
