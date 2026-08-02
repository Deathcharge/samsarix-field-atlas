import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ScenarioEditor from "../../client/src/components/ScenarioEditor";

describe("Scenario Studio", () => {
  it("validates edits live and hands off only a valid snapshot", () => {
    const onUseBlueprint = vi.fn();
    render(
      <ScenarioEditor onUseBlueprint={onUseBlueprint} scenarioId="incident" />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /open scenario studio/i })
    );
    expect(
      screen.getByRole("heading", { name: /build a challengeable scenario/i })
    ).toBeVisible();
    expect(screen.getByText(/ready to snapshot/i)).toBeVisible();

    fireEvent.change(screen.getByLabelText(/scenario id/i), {
      target: { value: "Invalid scenario ID" },
    });
    expect(screen.getByLabelText(/scenario id/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(screen.getByText(/blocked by contract errors/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /use in workbench/i })
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/scenario id/i), {
      target: { value: "customer-incident-review" },
    });
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "" },
    });
    expect(screen.getByLabelText(/^title$/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "Review a customer incident" },
    });
    fireEvent.click(screen.getByRole("button", { name: /use in workbench/i }));

    expect(onUseBlueprint).toHaveBeenCalledOnce();
    expect(onUseBlueprint.mock.calls[0]?.[0]).toMatchObject({
      scenario: { id: "customer-incident-review" },
      runtime: {
        executesAgents: false,
        callsExternalServices: false,
        storesRemoteData: false,
      },
    });
    expect(
      screen.getByText(/later draft edits do not change that snapshot/i)
    ).toBeVisible();
  });

  it("preserves a dirty draft across Field Lab changes and confirms replacement", () => {
    const onUseBlueprint = vi.fn();
    const view = render(
      <ScenarioEditor onUseBlueprint={onUseBlueprint} scenarioId="incident" />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /open scenario studio/i })
    );
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "My retained incident route" },
    });

    view.rerender(
      <ScenarioEditor
        onUseBlueprint={onUseBlueprint}
        scenarioId="breaking-change"
      />
    );

    expect(screen.getByLabelText(/^title$/i)).toHaveValue(
      "My retained incident route"
    );
    expect(screen.getByText(/your draft was preserved/i)).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: /replace with selected scenario/i })
    );
    expect(screen.getByText(/select the replace button again/i)).toBeVisible();
    expect(screen.getByLabelText(/^title$/i)).toHaveValue(
      "My retained incident route"
    );

    fireEvent.click(
      screen.getByRole("button", { name: /confirm replace draft/i })
    );
    expect(screen.getByLabelText(/scenario id/i)).toHaveValue(
      "breaking-change"
    );
    expect(screen.getByLabelText(/^title$/i)).toHaveValue(
      "Ship a breaking change"
    );
  });

  it("adds bounded authoring rows and exports a local JSON contract", async () => {
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:samsarix-authored-scenario");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
    render(<ScenarioEditor onUseBlueprint={vi.fn()} scenarioId="incident" />);
    fireEvent.click(
      screen.getByRole("button", { name: /open scenario studio/i })
    );

    fireEvent.click(screen.getByRole("button", { name: /add criterion/i }));
    expect(screen.getByText(/blocked by contract errors/i)).toBeVisible();
    const criteria = screen.getAllByRole("textbox", {
      name: /success criterion/i,
    });
    expect(criteria.at(-1)).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(criteria.at(-1)!, {
      target: { value: "A named owner accepts the retained evidence" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add stage/i }));
    const stageTitles = screen.getAllByLabelText(/stage title/i);
    const stageActions = screen.getAllByLabelText(/^action$/i);
    const stageEvidence = screen.getAllByLabelText(/expected evidence/i);
    expect(stageTitles.at(-1)).toHaveAttribute("aria-invalid", "true");
    expect(stageActions.at(-1)).toHaveAttribute("aria-invalid", "true");
    expect(stageEvidence.at(-1)).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(stageTitles.at(-1)!, {
      target: { value: "Record owner acceptance" },
    });
    fireEvent.change(stageActions.at(-1)!, {
      target: { value: "Attach the named owner's bounded decision." },
    });
    fireEvent.change(stageEvidence.at(-1)!, {
      target: { value: "Owner acceptance record" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /export blueprint json/i })
    );
    expect(
      screen.getByText(/scenario blueprint exported locally/i)
    ).toBeVisible();
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect((createObjectUrl.mock.calls[0]?.[0] as Blob).type).toBe(
      "application/json"
    );
    await waitFor(() =>
      expect(revokeObjectUrl).toHaveBeenCalledWith(
        "blob:samsarix-authored-scenario"
      )
    );
  });
});
