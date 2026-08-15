/**
 * UPI ID Validation Utility for P2P Limit Orders & Settlements
 *
 * Requirements:
 * - Required for SELL orders
 * - Trim whitespace
 * - Basic UPI format: localpart@provider
 * - Reject spaces anywhere
 * - Inline and progressive validation errors
 */

export interface ValidateUpiResult {
  isValid: boolean;
  error?: string;
  trimmedUpi: string;
}

// Basic UPI format pattern: localpart@provider
// localpart: 2-256 alphanumeric characters, dots, hyphens, underscores
// provider: 2-64 alphanumeric characters, dots, hyphens, underscores
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;

/**
 * Validates a given UPI ID string against standard Indian UPI VPA specifications.
 */
export function validateUpiId(rawUpi?: string | null): ValidateUpiResult {
  if (rawUpi === undefined || rawUpi === null) {
    return {
      isValid: false,
      error: 'Seller UPI ID is required.',
      trimmedUpi: '',
    };
  }

  const trimmed = rawUpi.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Seller UPI ID is required.',
      trimmedUpi: '',
    };
  }

  // Reject spaces anywhere in the UPI ID
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      error: 'UPI ID cannot contain spaces.',
      trimmedUpi: trimmed,
    };
  }

  // Check basic localpart@provider format
  const atMatches = trimmed.match(/@/g);
  if (!atMatches || atMatches.length !== 1) {
    return {
      isValid: false,
      error: 'Invalid UPI ID format. Expected format: name@upi',
      trimmedUpi: trimmed,
    };
  }

  const [localPart, provider] = trimmed.split('@');
  if (!localPart || !provider || !UPI_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid UPI ID format. Expected format: name@upi',
      trimmedUpi: trimmed,
    };
  }

  return {
    isValid: true,
    trimmedUpi: trimmed,
  };
}

/**
 * Returns true if the UPI ID is valid, false otherwise.
 */
export function isValidUpiId(rawUpi?: string | null): boolean {
  return validateUpiId(rawUpi).isValid;
}
