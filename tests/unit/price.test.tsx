import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// Price reads its accessible labels through the i18n context. I18nProvider calls
// next/navigation's useRouter, so stub it for jsdom; the provider defaults to
// English, which matches the strings asserted below.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { Price } from "@/components/ui/price";
import { I18nProvider } from "@/i18n/client";

function renderPrice(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("Price", () => {
  it("renders a plain price with an accessible label", () => {
    renderPrice(<Price amountCents={185000} />);

    expect(screen.getByText("Price:")).toBeInTheDocument();
    expect(screen.getByText("TZS 1,850")).toBeInTheDocument();
    expect(screen.queryByText("Original price:")).not.toBeInTheDocument();
  });

  it("renders a sale price alongside the original", () => {
    renderPrice(<Price amountCents={320000} compareAtPriceCents={385000} />);

    expect(screen.getByText("Sale price:")).toBeInTheDocument();
    expect(screen.getByText("TZS 3,200")).toBeInTheDocument();
    expect(screen.getByText("Original price: TZS 3,850")).toBeInTheDocument();
    expect(screen.getByText("TZS 3,850")).toBeInTheDocument();
  });

  it("ignores a compare-at price that is not a real discount", () => {
    renderPrice(<Price amountCents={320000} compareAtPriceCents={250000} />);

    expect(screen.getByText("Price:")).toBeInTheDocument();
    expect(screen.queryByText("TZS 2,500")).not.toBeInTheDocument();
  });
});
