import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function BrokenChild(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <p>content ok</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("content ok")).toBeInTheDocument();
  });

  it("shows fallback UI when a child throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("页面出错了")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("uses custom fallback when provided", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <BrokenChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
