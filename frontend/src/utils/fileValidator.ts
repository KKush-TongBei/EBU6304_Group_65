import { getStoredLocale, translate } from "../locales";

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxSizeMB: 5,
  allowedTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  allowedExtensions: [".pdf", ".doc", ".docx"],
};

export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const locale = getStoredLocale();
  const ext = opts.allowedExtensions?.join(", ") ?? "";

  if (!file) {
    return { isValid: false, error: translate(locale, "common.selectFile") };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (opts.maxSizeMB && sizeMB > opts.maxSizeMB) {
    return {
      isValid: false,
      error: translate(locale, "common.fileTooBig", {
        max: opts.maxSizeMB,
        current: sizeMB.toFixed(2),
      }),
    };
  }

  if (opts.allowedTypes && opts.allowedTypes.length > 0) {
    const isMimeValid = opts.allowedTypes.some(
      (type) => file.type === type || file.type.includes(type)
    );
    if (!isMimeValid) {
      return {
        isValid: false,
        error: translate(locale, "common.fileTypeInvalid", { ext }),
      };
    }
  }

  if (opts.allowedExtensions && opts.allowedExtensions.length > 0) {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = opts.allowedExtensions.some((e) =>
      fileName.endsWith(e.toLowerCase())
    );
    if (!hasValidExtension) {
      return {
        isValid: false,
        error: translate(locale, "common.fileExtInvalid", { ext }),
      };
    }
  }

  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
