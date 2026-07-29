import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "../../client/src/App";
import ErrorBoundary from "../../client/src/components/ErrorBoundary";

function BrokenView(): never {
  throw new Error("Expected render failure");
}

describe("Samsarix Field Atlas", () => {
  it("states its local reference scope before the user runs anything", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /trace the handoffs before you trust the system/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/this is a reference simulator/i)).toBeVisible();
    expect(screen.getByText(/nothing runs until/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /export json/i })).toBeDisabled();
  });

  it("switches scenarios and exposes their acceptance criteria", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("radio", { name: /triage a production incident/i })
    );
    fireEvent.click(screen.getByText("Acceptance criteria"));

    expect(
      screen.getByText(/symptoms and confirmed facts remain separate/i)
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /triage a production incident/i })
    ).toBeChecked();
  });

  it("completes the primary trace and enables a local export", async () => {
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:samsarix-blueprint");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Run trace" }));
    expect(
      screen.getByText(/running a deterministic local trace/i)
    ).toBeVisible();

    for (let step = 0; step < 10; step += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
    }

    expect(screen.getByText(/blueprint is ready to export/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /export json/i })).toBeEnabled();
    expect(
      screen.getByText(/evidence: immutable decision record/i)
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /export json/i }));
    expect(screen.getByText(/blueprint exported/i)).toBeVisible();
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:samsarix-blueprint");
  });

  it("lets a user cancel and retry without preserving a partial result", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Run trace" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel trace" }));

    expect(screen.getByText(/trace cancelled after/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Run again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /export json/i })).toBeDisabled();
  });

  it("fails safely when a render error reaches the boundary", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: /atlas could not render/i })
    ).toBeVisible();
    expect(screen.getByText(/no data was sent/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /reload the atlas/i })
    ).toBeEnabled();
  });
});
