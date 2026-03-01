import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SafetyCultureSurvey from '../../components/SafetyCultureSurvey';

// ── Section 19: Safety Culture Survey (Professional+) ──

// Mock recharts
vi.mock('recharts', () => ({
  RadarChart: ({ children }) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const adminProfile = { id: 'u1', role: 'admin', full_name: 'Admin User' };
const pilotProfile = { id: 'u2', role: 'pilot', full_name: 'Pilot User' };

function makeSurvey(overrides = {}) {
  return {
    id: 'survey-1',
    title: 'Q1 2025 Safety Culture Survey',
    status: 'active',
    created_at: '2025-01-15T12:00:00Z',
    close_date: '2025-03-15',
    total_responses: 5,
    ...overrides,
  };
}

function renderSCS(props = {}) {
  const { container } = render(
    <SafetyCultureSurvey
      profile={props.profile ?? adminProfile}
      session={props.session ?? { user: { id: 'u1' } }}
      orgProfiles={props.orgProfiles ?? [adminProfile, pilotProfile]}
      surveys={props.surveys ?? [makeSurvey()]}
      onCreateSurvey={vi.fn()}
      onUpdateSurvey={vi.fn()}
      onDeleteSurvey={vi.fn()}
      onFetchResponses={vi.fn()}
      onSubmitResponse={vi.fn()}
      onCheckUserResponse={vi.fn().mockResolvedValue(false)}
      onFetchResults={vi.fn()}
      onUpsertResults={vi.fn()}
    />
  );
  return { container };
}

describe('SafetyCultureSurvey', () => {
  it('renders Safety Culture Survey header', () => {
    renderSCS();
    expect(screen.getAllByText(/Safety Culture Survey/)[0]).toBeInTheDocument();
  });

  it('displays survey title', () => {
    renderSCS();
    expect(screen.getAllByText('Q1 2025 Safety Culture Survey')[0]).toBeInTheDocument();
  });

  it('shows empty state when no surveys', () => {
    renderSCS({ surveys: [] });
    expect(screen.getAllByText(/no.*survey/i)[0]).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = renderSCS();
    expect(container).toBeTruthy();
  });
});
