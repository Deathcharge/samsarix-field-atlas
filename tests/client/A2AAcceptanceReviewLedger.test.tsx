import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { A2AAcceptanceManifest } from "../../client/src/acceptance";
import A2AAcceptanceReviewLedger from "../../client/src/components/A2AAcceptanceReviewLedger";
import type { A2ATckEvidenceReceipt } from "../../client/src/evidence";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as T;
}

function profileFile(
  value: unknown = readFixture<unknown>(
    "examples/incident.a2a-review-profile.json"
  )
): File {
  const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
  const file = new File([bytes], "review-profile.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "arrayBuffer", {
    configurable: true,
    value: async () => Uint8Array.from(bytes).buffer,
  });
  return file;
}

function sources() {
  return {
    plan: readFixture<A2AAcceptanceManifest>(
      "examples/incident.a2a-acceptance.json"
    ),
    receipt: readFixture<A2ATckEvidenceReceipt>(
      "examples/incident.a2a-tck-receipt.json"
    ),
  };
}

describe("A2A acceptance review browser workflow", () => {
  it("preserves entered authority values while the upstream receipt is unavailable", () => {
    const { plan, receipt } = sources();
    const { rerender } = render(
      <A2AAcceptanceReviewLedger
        acceptanceManifest={plan}
        tckReceipt={receipt}
      />
    );
    const owner = screen.getByLabelText(/case review owner/i);

    fireEvent.change(owner, { target: { value: "Independent Review Team" } });
    rerender(
      <A2AAcceptanceReviewLedger
        acceptanceManifest={plan}
        tckReceipt={undefined}
      />
    );

    expect(screen.getByLabelText(/case review owner/i)).toBeDisabled();
    expect(screen.getByLabelText(/case review owner/i)).toHaveValue(
      "Independent Review Team"
    );
  });

  it("imports a complete profile and exports the blocked ledger locally", async () => {
    const { plan, receipt } = sources();
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:samsarix-review-ledger");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
    const user = userEvent.setup();
    render(
      <A2AAcceptanceReviewLedger
        acceptanceManifest={plan}
        tckReceipt={receipt}
      />
    );

    await waitFor(
      () =>
        expect(
          screen.queryByText(/computing canonical source digests/i)
        ).not.toBeInTheDocument(),
      { timeout: 15_000 }
    );

    await user.upload(
      screen.getByLabelText(/import review profile/i),
      profileFile()
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /ledger records a blocked release/i,
        })
      ).toBeVisible()
    );
    expect(screen.getByText(/^21$/, { selector: "dd" })).toBeVisible();
    expect(screen.getByText(/TCK caveats dispositioned/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /export review ledger/i })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: /export review ledger/i })
    );
    expect(screen.getByText(/proof boundary intact/i)).toBeVisible();
    expect(createObjectUrl).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(revokeObjectUrl).toHaveBeenCalledWith(
        "blob:samsarix-review-ledger"
      )
    );
  });

  it("rejects duplicate review rows before keyed browser state can normalize them", async () => {
    const { plan, receipt } = sources();
    const profile = readFixture<{
      caseReviews: Record<string, unknown>[];
    }>("examples/incident.a2a-review-profile.json");
    profile.caseReviews.push(structuredClone(profile.caseReviews[0]!));
    const user = userEvent.setup();
    render(
      <A2AAcceptanceReviewLedger
        acceptanceManifest={plan}
        tckReceipt={receipt}
      />
    );
    await waitFor(
      () =>
        expect(
          screen.queryByText(/computing canonical source digests/i)
        ).not.toBeInTheDocument(),
      { timeout: 15_000 }
    );

    await user.upload(
      screen.getByLabelText(/import review profile/i),
      profileFile(profile)
    );

    expect(
      await screen.findByText(/was rejected: INVALID_CASE_REVIEW/i)
    ).toBeVisible();
    expect(screen.getByLabelText(/case review owner/i)).toHaveValue(
      "Incident Platform Team"
    );
  });
});
