import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Price } from "@/components/ui/price";

describe("Price", () => {
  it("renders a plain price with an accessible label", () => {
    render(<Price amountCents={6800} />);

    expect(screen.getByText("Price:")).toBeInTheDocument();
    expect(screen.getByText("$68")).toBeInTheDocument();
    expect(screen.queryByText("Original price:")).not.toBeInTheDocument();
  });

  it("renders a sale price alongside the original", () => {
    render(<Price amountCents={12000} compareAtPriceCents={14500} />);

    expect(screen.getByText("Sale price:")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();
    expect(screen.getByText("Original price: $145")).toBeInTheDocument();
    expect(screen.getByText("$145")).toBeInTheDocument();
  });

  it("ignores a compare-at price that is not a real discount", () => {
    render(<Price amountCents={12000} compareAtPriceCents={9000} />);

    expect(screen.getByText("Price:")).toBeInTheDocument();
    expect(screen.queryByText("$90")).not.toBeInTheDocument();
  });
});
