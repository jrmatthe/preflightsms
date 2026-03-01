import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ManagementOfChange from '../../components/ManagementOfChange';

// ── Section 18: Management of Change ──

const adminProfile = { id: 'u1', role: 'admin', full_name: 'Admin User' };

function makeItem(overrides = {}) {
  return {
    id: 'moc-1',
    title: 'New Route to KLAX',
    description: 'Adding direct route from KJFK to KLAX',
    change_type: 'new_route',
    priority: 'medium',
    status: 'identified',
    created_at: '2025-06-01T12:00:00Z',
    created_by: 'u1',
    initiator_name: 'Admin User',
    pre_risk_likelihood: 0,
    pre_risk_severity: 0,
    post_risk_likelihood: 0,
    post_risk_severity: 0,
    ...overrides,
  };
}

const baseItems = [
  makeItem({ id: 'moc-1', title: 'New Route to KLAX', status: 'identified' }),
  makeItem({ id: 'moc-2', title: 'Fleet Change PC-12', status: 'analyzing', change_type: 'fleet_change', priority: 'high' }),
];

function renderMOC(props = {}) {
  const { container } = render(
    <ManagementOfChange
      profile={props.profile ?? adminProfile}
      session={props.session ?? { user: { id: 'u1' } }}
      orgProfiles={props.orgProfiles ?? [adminProfile]}
      mocItems={props.mocItems ?? baseItems}
      onCreateMoc={props.onCreateMoc ?? vi.fn()}
      onUpdateMoc={props.onUpdateMoc ?? vi.fn()}
      onDeleteMoc={props.onDeleteMoc ?? vi.fn()}
      onUploadFile={props.onUploadFile ?? vi.fn()}
      onFetchAttachments={props.onFetchAttachments ?? vi.fn().mockResolvedValue([])}
      onCreateAttachment={props.onCreateAttachment ?? vi.fn()}
      onDeleteAttachment={props.onDeleteAttachment ?? vi.fn()}
      onAiIdentifyHazards={props.onAiIdentifyHazards ?? vi.fn()}
    />
  );
  return { container };
}

describe('ManagementOfChange', () => {
  it('renders MOC header', () => {
    renderMOC();
    expect(screen.getAllByText(/Management of Change/)[0]).toBeInTheDocument();
  });

  it('shows status column headers', () => {
    renderMOC();
    expect(screen.getByText('Identified')).toBeInTheDocument();
    expect(screen.getByText('Analyzing')).toBeInTheDocument();
  });

  it('displays item titles in Kanban board', () => {
    renderMOC();
    expect(screen.getByText('New Route to KLAX')).toBeInTheDocument();
    expect(screen.getByText('Fleet Change PC-12')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    renderMOC({ mocItems: [] });
    expect(screen.getAllByText(/no.*change|start.*change/i)[0]).toBeInTheDocument();
  });

  it('clicking an item opens the detail view', () => {
    renderMOC();
    fireEvent.click(screen.getByText('New Route to KLAX'));
    expect(screen.getByText('Adding direct route from KJFK to KLAX')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = renderMOC();
    expect(container).toBeTruthy();
  });
});
