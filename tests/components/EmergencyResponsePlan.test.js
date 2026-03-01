import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmergencyResponsePlan from '../../components/EmergencyResponsePlan';

// ── Section 14: Emergency Response Plans ──

const adminProfile = { id: 'u1', role: 'admin', full_name: 'Admin User' };
const org = { id: 'org-1', name: 'Test Aviation', tier: 'professional' };

function makePlan(overrides = {}) {
  return {
    id: 'erp-1',
    name: 'Aircraft Accident Response',
    description: 'Response procedures for aircraft accidents',
    category: 'accident',
    status: 'active',
    created_at: '2025-01-15T12:00:00Z',
    ...overrides,
  };
}

const basePlans = [
  makePlan({ id: 'erp-1', name: 'Aircraft Accident Response', category: 'accident' }),
  makePlan({ id: 'erp-2', name: 'Medical Emergency Plan', category: 'medical' }),
];

function renderERP(props = {}) {
  const { container } = render(
    <EmergencyResponsePlan
      profile={props.profile ?? adminProfile}
      session={props.session ?? { user: { id: 'u1' } }}
      org={props.org ?? org}
      erpPlans={props.erpPlans ?? basePlans}
      erpDrills={props.erpDrills ?? []}
      onCreatePlan={props.onCreatePlan ?? vi.fn()}
      onUpdatePlan={props.onUpdatePlan ?? vi.fn()}
      onDeletePlan={props.onDeletePlan ?? vi.fn()}
      onLoadChecklist={props.onLoadChecklist ?? vi.fn().mockResolvedValue([])}
      onSaveChecklist={props.onSaveChecklist ?? vi.fn()}
      onLoadCallTree={props.onLoadCallTree ?? vi.fn().mockResolvedValue([])}
      onSaveCallTree={props.onSaveCallTree ?? vi.fn()}
      onCreateDrill={props.onCreateDrill ?? vi.fn()}
      onUpdateDrill={props.onUpdateDrill ?? vi.fn()}
      onDeleteDrill={props.onDeleteDrill ?? vi.fn()}
      onInitTemplates={props.onInitTemplates ?? vi.fn()}
      onCreateActionFromDrill={props.onCreateActionFromDrill ?? vi.fn()}
    />
  );
  return { container };
}

describe('EmergencyResponsePlan', () => {
  it('renders Emergency Response Plans header', () => {
    renderERP();
    expect(screen.getAllByText(/Emergency Response Plan/)[0]).toBeInTheDocument();
  });

  it('renders plan names in the list', () => {
    renderERP();
    expect(screen.getByText('Aircraft Accident Response')).toBeInTheDocument();
    expect(screen.getByText('Medical Emergency Plan')).toBeInTheDocument();
  });

  it('shows empty state when no plans exist', () => {
    renderERP({ erpPlans: [] });
    expect(screen.getAllByText(/no.*plan/i)[0]).toBeInTheDocument();
  });

  it('clicking a plan card shows its details', () => {
    renderERP();
    fireEvent.click(screen.getByText('Aircraft Accident Response'));
    expect(screen.getByText('Response procedures for aircraft accidents')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = renderERP();
    expect(container).toBeTruthy();
  });
});
