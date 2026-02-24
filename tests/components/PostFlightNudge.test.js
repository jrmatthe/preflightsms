import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PostFlightNudge from "../../components/PostFlightNudge";

const baseFlight = {
  id: "flight-123",
  departure: "KLAX",
  destination: "KSFO",
  aircraft: "Cessna 172",
  tailNumber: "N12345",
};

function renderNudge(flightOverrides = {}, handlers = {}) {
  const flight = { ...baseFlight, ...flightOverrides };
  const onSubmitReport = handlers.onSubmitReport ?? vi.fn();
  const onNothingToReport = handlers.onNothingToReport ?? vi.fn();
  const onRemindLater = handlers.onRemindLater ?? vi.fn();
  const onDismiss = handlers.onDismiss ?? vi.fn();

  const { container } = render(
    <PostFlightNudge
      flight={flight}
      onSubmitReport={onSubmitReport}
      onNothingToReport={onNothingToReport}
      onRemindLater={onRemindLater}
      onDismiss={onDismiss}
    />
  );

  return { container, onSubmitReport, onNothingToReport, onRemindLater, onDismiss };
}

describe("PostFlightNudge", () => {
  it("renders flight route as departure → destination", () => {
    renderNudge();
    expect(screen.getByText("KLAX → KSFO")).toBeInTheDocument();
  });

  it("renders aircraft and tail number separated by ·", () => {
    renderNudge();
    expect(screen.getByText("Cessna 172 · N12345")).toBeInTheDocument();
  });

  it("falls back to flight.id when aircraft and tailNumber are absent", () => {
    renderNudge({ aircraft: undefined, tailNumber: undefined });
    expect(screen.getByText("flight-123")).toBeInTheDocument();
  });

  it("calls onSubmitReport when 'Submit a Safety Report' is clicked", () => {
    const { onSubmitReport } = renderNudge();
    fireEvent.click(screen.getByRole("button", { name: /submit a safety report/i }));
    expect(onSubmitReport).toHaveBeenCalledTimes(1);
  });

  it("calls onNothingToReport when 'Nothing to Report' is clicked", () => {
    const { onNothingToReport } = renderNudge();
    fireEvent.click(screen.getByRole("button", { name: /nothing to report/i }));
    expect(onNothingToReport).toHaveBeenCalledTimes(1);
  });

  it("calls onRemindLater when 'Remind Me Later' is clicked", () => {
    const { onRemindLater } = renderNudge();
    fireEvent.click(screen.getByRole("button", { name: /remind me later/i }));
    expect(onRemindLater).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when clicking the outer overlay", () => {
    const { container, onDismiss } = renderNudge();
    // The outer div is the first child of the container
    const overlay = container.firstChild;
    fireEvent.click(overlay);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onDismiss when clicking inside the modal content", () => {
    const { onDismiss } = renderNudge();
    // Clicking a button inside the modal — stopPropagation prevents overlay handler
    fireEvent.click(screen.getByRole("button", { name: /submit a safety report/i }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("shows the 'Flight Complete' heading", () => {
    renderNudge();
    expect(screen.getByText("Flight Complete")).toBeInTheDocument();
  });

  it("shows the 'Click outside to skip' hint", () => {
    renderNudge();
    expect(screen.getByText("Click outside to skip")).toBeInTheDocument();
  });
});
