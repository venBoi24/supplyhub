import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Price } from "@/components/ui/price";

describe("Price", () => {
  it("renders a plain price with an accessible label", () => {
    render(<Price amountCents={185000} />);

    expect(screen.getByText("Price:")).toBeInTheDocument();
    expect(screen.getByText("TZS 1,850")).toBeInTheDocument();
    expect(screen.queryByText("Original price:")).not.toBeInTheDocument();
  });

  it("renders a sale price alongside the original", () => {
    render(<Price amountCents={320000} compareAtPriceCents={385000} />);

    expect(screen.getByText("Sale price:")).toBeInTheDocument();
    expect(screen.getByText("TZS 3,200")).toBeInTheDocument();
    expect(screen.getByText("Original price: TZS 3,850")).toBeInTheDocument();
    expect(screen.getByText("TZS 3,850")).toBeInTheDocument();
  });

  it("ignores a compare-at price that is not a real discount", () => {
    render(<Price amountCents={320000} compareAtPriceCents={250000} />);

    expect(screen.getByText("Price:")).toBeInTheDocument();
    expect(screen.queryByText("TZS 2,500")).not.toBeInTheDocument();
  });
});
