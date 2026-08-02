import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
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

  it("checks a blueprint locally and exports a readable review packet", async () => {
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:samsarix-review");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /check current scenario/i })
    );

    expect(
      screen.getByRole("heading", {
        name: /blueprint is internally consistent/i,
      })
    ).toBeVisible();
    expect(screen.getByText("Passed checks")).toBeVisible();
    expect(screen.getByText("AUTHORITY ALIGNED")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /export review packet/i })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: /export review packet/i })
    );
    expect(
      screen.getByText(/review packet exported as markdown/i)
    ).toBeVisible();
    expect(createObjectUrl).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:samsarix-review")
    );
  });

  it("rejects a blueprint import that is not valid UTF-8 JSON", async () => {
    render(<App />);
    const bytes = Uint8Array.from([0xff, 0xfe, 0x7b, 0x7d]);
    const file = new File([bytes], "invalid-encoding.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "arrayBuffer", {
      configurable: true,
      value: async () => Uint8Array.from(bytes).buffer,
    });

    fireEvent.change(screen.getByLabelText(/import json/i), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(
        screen.getByText(/could not be parsed as UTF-8 JSON/i)
      ).toBeVisible()
    );
    expect(screen.getByText("IMPORT FAILED")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: /contract is not safe to rely on yet/i,
      })
    ).toBeVisible();
  });

  it("exports blueprint findings as a local SARIF 2.1.0 report", async () => {
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:samsarix-sarif");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /check current scenario/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /export sarif/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/SARIF 2\.1\.0 report exported locally/i)
      ).toBeVisible()
    );
    expect(createObjectUrl).toHaveBeenCalledOnce();
    const blob = createObjectUrl.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe("application/sarif+json");
    await waitFor(() =>
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:samsarix-sarif")
    );
  });

  it("turns a valid blueprint into an explicit A2A implementation handoff", async () => {
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:samsarix-a2a");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /check current scenario/i })
    );

    expect(
      screen.getByRole("heading", { name: /draft an a2a 1\.0 agent card/i })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /export draft agent card/i })
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/service endpoint/i), {
      target: { value: "https://agent.example.com/a2a" },
    });

    expect(
      screen.getByRole("heading", { name: /ready to hand off/i })
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: /turn the handoff into a testable owner contract/i,
      })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /export acceptance manifest/i })
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/acceptance owner/i), {
      target: { value: "Release Team" },
    });
    fireEvent.change(screen.getByLabelText(/support contact/i), {
      target: { value: "support@samsarix.com" },
    });

    fireEvent.change(screen.getByLabelText(/service endpoint/i), {
      target: { value: "https://agent.example.com/a2a?token=unsafe" },
    });
    expect(screen.getByLabelText(/acceptance owner/i)).toBeDisabled();
    expect(screen.getByLabelText(/acceptance owner/i)).toHaveValue(
      "Release Team"
    );
    fireEvent.change(screen.getByLabelText(/service endpoint/i), {
      target: { value: "https://agent.example.com/a2a" },
    });
    expect(screen.getByLabelText(/acceptance owner/i)).toBeEnabled();
    expect(screen.getByLabelText(/acceptance owner/i)).toHaveValue(
      "Release Team"
    );

    expect(
      screen.getByRole("heading", { name: /plan ready to execute elsewhere/i })
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: /export draft agent card/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /export implementation checklist/i,
      })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /export acceptance manifest/i })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /export execution checklist/i })
    );

    expect(
      screen.getByText(/execution checklist exported locally/i)
    ).toBeVisible();
    expect(createObjectUrl).toHaveBeenCalledTimes(4);
    expect(click).toHaveBeenCalledTimes(4);
    await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledTimes(4));
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
