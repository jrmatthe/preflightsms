import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SafetyPerformanceIndicators from '../../components/SafetyPerformanceIndicators';

// ── Section 29: Safety Performance Indicators (SPI) ──

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

const adminProfile = { id: 'u1', role: 'admin', full_name: 'Admin User' };
const org = { id: 'org-1', name: 'Test Aviation', tier: 'professional' };

function makeSPI(overrides = {}) {
  return {
    id: 'spi-1',
    name: 'FRAT Completion Rate',
    description: 'Percentage of flights with completed FRATs',
    category: 'proactive',
    data_source: 'frats',
    calculation_method: 'percentage',
    unit: '%',
    measurement_period: 'monthly',
    sort_order: 0,
    is_active: true,
    ...overrides,
  };
}

const baseSPIs = [
  makeSPI({ id: 'spi-1', name: 'FRAT Completion Rate', category: 'proactive' }),
  makeSPI({ id: 'spi-2', name: 'Overdue Corrective Actions', category: 'reactive', unit: 'count', data_source: 'corrective_actions' }),
];

function renderSPI(props = {}) {
  const { container } = render(
    <SafetyPerformanceIndicators
      profile={props.profile ?? adminProfile}
      org={props.org ?? org}
      spis={props.spis ?? baseSPIs}
      spiMeasurements={props.spiMeasurements ?? []}
      onCreateSpi={vi.fn()}
      onUpdateSpi={vi.fn()}
      onDeleteSpi={vi.fn()}
      onCreateTarget={vi.fn()}
      onUpdateTarget={vi.fn()}
      onDeleteTarget={vi.fn()}
      onLoadTargets={vi.fn().mockResolvedValue([])}
      onLoadMeasurements={vi.fn().mockResolvedValue([])}
      onCreateMeasurement={vi.fn()}
      onInitDefaults={vi.fn()}
    />
  );
  return { container };
}

describe('SafetyPerformanceIndicators', () => {
  it('renders SPI header', () => {
    renderSPI();
    expect(screen.getAllByText(/Safety Performance Indicator/)[0]).toBeInTheDocument();
  });

  it('displays SPI cards with names', () => {
    renderSPI();
    expect(screen.getByText('FRAT Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Overdue Corrective Actions')).toBeInTheDocument();
  });

  it('shows empty state when no SPIs configured', () => {
    renderSPI({ spis: [] });
    expect(screen.getAllByText(/no.*indicator|no.*spi/i)[0]).toBeInTheDocument();
  });

  it('shows category labels', () => {
    renderSPI();
    // Categories are rendered as badges - use getAllByText since they may appear in multiple places
    expect(screen.getAllByText(/Proactive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reactive/i).length).toBeGreaterThan(0);
  });

  it('renders without crashing', () => {
    const { container } = renderSPI();
    expect(container).toBeTruthy();
  });
});
