import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { A2AAcceptanceManifest } from "../../client/src/acceptance";
import A2ATckEvidenceReceipt from "../../client/src/components/A2ATckEvidenceReceipt";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as T;
}

function uploadedReport(): File {
  const bytes = Uint8Array.from(
    readFileSync(
      resolve(repositoryRoot, "examples/incident.a2a-tck-compatibility.json")
    )
  );
  const file = new File([bytes], "compatibility.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "arrayBuffer", {
    configurable: true,
    value: async () => Uint8Array.from(bytes).buffer,
  });
  return file;
}

describe("A2A TCK evidence browser workflow", () => {
  it("preserves local provenance while the upstream plan becomes unavailable", () => {
    const plan = readFixture<A2AAcceptanceManifest>(
      "examples/incident.a2a-acceptance.json"
    );
    const { rerender } = render(
      <A2ATckEvidenceReceipt acceptanceManifest={plan} />
    );
    const owner = screen.getByLabelText(/evidence owner/i);

    fireEvent.change(owner, { target: { value: "Independent Review Team" } });
    rerender(<A2ATckEvidenceReceipt acceptanceManifest={undefined} />);

    expect(screen.getByLabelText(/evidence owner/i)).toBeDisabled();
    expect(screen.getByLabelText(/evidence owner/i)).toHaveValue(
      "Independent Review Team"
    );

    rerender(<A2ATckEvidenceReceipt acceptanceManifest={plan} />);
    expect(screen.getByLabelText(/evidence owner/i)).toBeEnabled();
    expect(screen.getByLabelText(/evidence owner/i)).toHaveValue(
      "Independent Review Team"
    );
  });

  it("imports, hashes, summarizes, and exports an owner-review receipt locally", async () => {
    const plan = readFixture<A2AAcceptanceManifest>(
      "examples/incident.a2a-acceptance.json"
    );
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:samsarix-tck-receipt");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
    const user = userEvent.setup();
    render(<A2ATckEvidenceReceipt acceptanceManifest={plan} />);

    fireEvent.change(screen.getByLabelText(/TCK implementation revision/i), {
      target: { value: "8b1d0c6e9050d88b71c43e1c40267b807e2d67f4" },
    });
    fireEvent.change(screen.getByLabelText(/redacted run command/i), {
      target: {
        value:
          "./run_tck.py --sut-host https://agent.example.com --transport http_json",
      },
    });
    await user.upload(
      screen.getByLabelText(/import compatibility\.json/i),
      uploadedReport()
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /receipt ready with review items/i,
        })
      ).toBeVisible()
    );
    expect(screen.getByLabelText(/evidence owner/i)).toHaveValue(
      "Incident Platform Team"
    );
    expect(screen.getByText(/100\.0%/i)).toBeVisible();
    expect(screen.getByText(/1 skipped requirement/i)).toBeVisible();
    expect(screen.getByText(/1 not-tested requirement/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /export evidence receipt/i })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: /export evidence receipt/i })
    );
    expect(screen.getByText(/owner-review-required status/i)).toBeVisible();
    expect(createObjectUrl).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:samsarix-tck-receipt")
    );
  });
});
