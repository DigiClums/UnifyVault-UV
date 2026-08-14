import { ExtractedReceiptData } from './types';

/**
 * Normalizes raw amount strings by stripping currency symbols, abbreviations (e.g. Rs., INR), commas, and whitespace.
 */
export function normalizeAmountString(raw: string): number | undefined {
  if (!raw) return undefined;
  // Strip currency words/symbols cleanly without leaving stray dots
  let cleaned = raw.replace(/(?:Rs\.?|INR|USD|EUR|GBP|[₹$€£])/gi, '').trim();
  cleaned = cleaned.replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

/**
 * Extracts structured receipt data from extracted OCR text.
 * NEVER manufactures synthetic text or defaults to expected amount.
 */
export function extractReceiptDataFromText(rawText: string): ExtractedReceiptData {
  if (!rawText || rawText.trim().length === 0) {
    return { confidenceScore: 0.0 };
  }

  const text = rawText.replace(/\r/g, ' ');

  let amount: number | undefined = undefined;
  let currency: string = 'INR';
  let utr: string | undefined = undefined;
  let transactionDate: string | undefined = undefined;
  let transactionTime: string | undefined = undefined;
  let paymentStatus: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'CANCELLED' | undefined = undefined;
  let senderName: string | undefined = undefined;
  let senderVpa: string | undefined = undefined;
  let receiverName: string | undefined = undefined;
  let receiverVpa: string | undefined = undefined;

  // 1. Amount Extraction Regexes
  // Matches: ₹10,000.00, ₹ 500, Paid: ₹500, Amount: INR 500.00, Rs. 500, 500.00 INR, Total: 500
  const amountRegexes = [
    /(?:Amount|Paid|Total|Value|Transfer(?:red)?(?:\s*Amount)?|Sent|Debited|Payment(?:\s*of)?)\s*[:\s]*[₹Rs\.\s]*\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:[₹]|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)/i,
    /(?:^|\s)(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{2}))\s*(?:paid|sent|transferred)/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = normalizeAmountString(match[1]);
      if (parsed !== undefined) {
        amount = parsed;
        break;
      }
    }
  }

  // Currency extraction
  if (/₹|INR|Rs/i.test(text)) currency = 'INR';
  else if (/\$|USD/i.test(text)) currency = 'USD';
  else if (/€|EUR/i.test(text)) currency = 'EUR';
  else if (/£|GBP/i.test(text)) currency = 'GBP';

  // 2. UTR / Bank Reference Number Extraction Regexes
  // Standard Indian UPI UTR is 12 digits, but banks also use alphanumeric references (e.g. UPI/CR/123456789012)
  const utrRegexes = [
    /(?:UTR(?:\s*No\.?)?|RRN|UPI\s*Ref(?:\s*No\.?)?|Transaction\s*(?:ID|Ref|Number)|Txn\s*ID|Bank\s*Ref(?:\s*No\.?)?)[:\s#]*([A-Za-z0-9\-_]{6,36})/i,
    /(?:Ref\s*(?:No\.?)?)[:\s#]*([A-Za-z0-9\-_]{6,36})/i,
    /\b(\d{12})\b/, // 12-digit Indian banking UTR
  ];

  for (const regex of utrRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanRef = match[1]
        .replace(/[^A-Za-z0-9\-_]/g, '')
        .trim()
        .toUpperCase();
      if (cleanRef.length >= 6) {
        utr = cleanRef;
        break;
      }
    }
  }

  // 3. Payment Status Extraction
  if (/Failed|Declined|Rejected|Payment Failed|Transaction Failed/i.test(text)) {
    paymentStatus = 'FAILED';
  } else if (/Cancelled|Canceled|Void/i.test(text)) {
    paymentStatus = 'CANCELLED';
  } else if (/Pending|Processing|In Progress|Awaiting Confirmation/i.test(text)) {
    paymentStatus = 'PENDING';
  } else if (
    /Success|Successful|Completed|Paid|Approved|Transferred|Payment Successful/i.test(text)
  ) {
    paymentStatus = 'SUCCESSFUL';
  }

  // 4. Date & Time Extraction
  // Formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, 14 Aug 2026, 14 August 2026
  const dateMatch = text.match(
    /\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i,
  );
  if (dateMatch) transactionDate = dateMatch[1];

  const timeMatch = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/);
  if (timeMatch) transactionTime = timeMatch[1];

  // 5. UPI VPAs & Payer/Payee Extraction
  const vpaMatches = text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g);
  if (vpaMatches && vpaMatches.length > 0) {
    if (vpaMatches.length === 1) {
      receiverVpa = vpaMatches[0];
    } else {
      senderVpa = vpaMatches[0];
      receiverVpa = vpaMatches[1];
    }
  }

  const senderMatch = text.match(/(?:From|Paid By|Sender|Debited From)[:\s]*([A-Za-z\s]{2,40})/i);
  if (senderMatch) senderName = senderMatch[1].trim();

  const receiverMatch = text.match(
    /(?:To|Paid To|Receiver|Beneficiary|Credited To)[:\s]*([A-Za-z\s]{2,40})/i,
  );
  if (receiverMatch) receiverName = receiverMatch[1].trim();

  // 6. Confidence Score Calculation
  let confidenceScore = 0.1;
  if (amount !== undefined) confidenceScore += 0.35;
  if (utr !== undefined) confidenceScore += 0.35;
  if (paymentStatus === 'SUCCESSFUL') confidenceScore += 0.1;
  if (transactionDate !== undefined) confidenceScore += 0.1;

  confidenceScore = Math.min(1.0, confidenceScore);

  return {
    amount,
    currency,
    utr,
    transactionDate,
    transactionTime,
    paymentStatus,
    senderName,
    senderVpa,
    receiverName,
    receiverVpa,
    confidenceScore,
    rawTextSample: rawText.slice(0, 300),
  };
}

/**
 * Performs actual Optical Character Recognition on image bytes or text extraction on PDF bytes.
 */
export async function performRealReceiptOCR(
  fileBytes: Uint8Array,
  mimeType: string,
  fileName: string = 'receipt',
): Promise<{ text: string; confidence: number }> {
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      // PDF text extraction using pdf-parse in Node.js
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const buffer = Buffer.from(fileBytes);
      const parsed = await pdfParse(buffer);
      const text = parsed.text || '';
      return {
        text,
        confidence: text.trim().length > 10 ? 0.95 : 0.2,
      };
    } catch (pdfErr) {
      console.warn('PDF parser error, falling back to string stream scan:', pdfErr);
      // Fallback: extract ASCII string streams from raw PDF byte chunks
      const rawString = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
      return {
        text: rawString,
        confidence: 0.5,
      };
    }
  }

  // Image Optical Character Recognition (JPG, JPEG, PNG, WEBP)
  try {
    const tesseractModule = await import('tesseract.js');
    const Tesseract = (tesseractModule as any).default || tesseractModule;
    const buffer = Buffer.from(fileBytes);

    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: () => {}, // silent in logs
    });

    return {
      text: result.data.text || '',
      confidence: (result.data.confidence || 0) / 100,
    };
  } catch (ocrErr) {
    console.error('Tesseract OCR image extraction error:', ocrErr);
    return {
      text: '',
      confidence: 0.0,
    };
  }
}
