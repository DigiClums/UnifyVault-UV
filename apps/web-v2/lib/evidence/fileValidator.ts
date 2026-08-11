export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_FILE_SIZE_BYTES = 100; // 100 Bytes

export interface FileValidationResult {
  isValid: boolean;
  errorMessage?: string;
  mimeType?: string;
}

export interface GenericReceiptFile {
  name: string;
  type: string;
  size: number;
  bytes?: Uint8Array | (() => Promise<Uint8Array>);
}

/**
 * Validates receipt file format, size, and header signature
 */
export function validateReceiptFile(file: GenericReceiptFile): FileValidationResult {
  if (!file) {
    return { isValid: false, errorMessage: 'No file provided.' };
  }

  // Size check
  if (file.size < MIN_FILE_SIZE_BYTES) {
    return { isValid: false, errorMessage: 'Corrupted or empty file (file size too small).' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, errorMessage: 'File exceeds maximum allowed size of 10MB.' };
  }

  // Extension & MIME type check
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['pdf', 'jpg', 'jpeg', 'png'];

  if (!validExts.includes(ext || '')) {
    return {
      isValid: false,
      errorMessage: `Unsupported file extension .${ext}. Only PDF, JPG, JPEG, and PNG are allowed.`,
    };
  }

  const mime = file.type?.toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.includes(mime)) {
    return {
      isValid: false,
      errorMessage: `Unsupported MIME type ${mime}. Only PDF, JPG, JPEG, and PNG are allowed.`,
    };
  }

  // Header Magic Bytes Verification (if bytes are available)
  const rawBytes = typeof file.bytes === 'function' ? undefined : file.bytes;
  if (rawBytes && rawBytes.length >= 4) {
    const header = Array.from(rawBytes.slice(0, 4))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    // PDF magic bytes: 25 50 44 46 (%PDF)
    // PNG magic bytes: 89 50 4E 47 (.PNG)
    // JPEG magic bytes: FF D8 FF
    const isPdfMagic = header.startsWith('25504446');
    const isPngMagic = header.startsWith('89504E47');
    const isJpgMagic = header.startsWith('FFD8FF');

    if (!isPdfMagic && !isPngMagic && !isJpgMagic) {
      return {
        isValid: false,
        errorMessage: 'Corrupted or spoofed file header signature.',
      };
    }
  }

  return { isValid: true, mimeType: file.type };
}
