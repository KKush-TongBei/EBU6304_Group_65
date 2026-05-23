import { describe, expect, it } from "vitest";
import { formatFileSize, validateFile } from "./fileValidator";

function mockFile(name: string, size: number, type: string): File {
  return new File([new ArrayBuffer(size)], name, { type });
}

describe("formatFileSize", () => {
  it("returns 0 B for zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });
});

describe("validateFile", () => {
  it("accepts a valid PDF", () => {
    const file = mockFile("resume.pdf", 1024, "application/pdf");
    expect(validateFile(file)).toEqual({ isValid: true });
  });

  it("rejects oversize files", () => {
    const file = mockFile("large.pdf", 6 * 1024 * 1024, "application/pdf");
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("5");
  });

  it("rejects invalid MIME type", () => {
    const file = mockFile("notes.txt", 100, "text/plain");
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects invalid extension", () => {
    const file = mockFile("resume.exe", 100, "application/pdf");
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
