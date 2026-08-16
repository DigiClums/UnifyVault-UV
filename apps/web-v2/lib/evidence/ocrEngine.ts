import { ExtractedReceiptData } from './types';

export const OCR_LAYOUT_PASS_DELIMITER = '\n--- OCR_LAYOUT_PASS ---\n';

export interface OCRPassCandidate {
  amount?: number;
  isStructured: boolean;
  psm?: string;
}

/**
 * Normalizes raw amount strings by stripping currency symbols, abbreviations (e.g. Rs., INR), commas, and whitespace.
 */
export function normalizeAmountString(raw: string): number | undefined {
  if (!raw) return undefined;
  // Strip currency words/symbols cleanly without leaving stray dots
  let cleaned = raw.replace(/(?:Rs\.?|INR|USD|EUR|GBP|[₹$€£zZfF])/gi, '').trim();
  cleaned = cleaned.replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

/**
 * Extracts a candidate transaction amount from an individual OCR layout text pass.
 */
export function extractAmountCandidateFromText(rawText: string): number | undefined {
  if (!rawText || rawText.trim().length === 0) return undefined;
  const text = rawText.replace(/\r/g, ' ');

  // Priority A: Explicit labeled amounts (e.g. Paid: ₹500, Amount: INR 500.00, Payment of: ₹35)
  const labeledAmountRegexes = [
    /(?:Amount|Paid|Total|Value|Transfer(?:red)?(?:\s*Amount)?|Sent|Debited|Payment(?:\s*of)?)\s*[:\s]*[₹Rs\.\s]*\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:^|\s)(?:[₹$€£zZfF]?\s*)(\d+(?:\.\d{1,2})?)\s+Paid\s+via/i,
    /(?:[₹]|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)/i,
  ];

  for (const regex of labeledAmountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const lineContainingMatch = text.slice(
        Math.max(0, match.index! - 20),
        match.index! + match[0].length + 20,
      );
      // Skip reward promo lines like "Get up to ₹1,000 on every payment"
      if (
        !lineContainingMatch.toLowerCase().includes('get up to') &&
        !lineContainingMatch.toLowerCase().includes('cashback')
      ) {
        const parsed = normalizeAmountString(match[1]);
        if (parsed !== undefined && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  // Priority B: Standalone amount line placed near 'Paid via' or after payee info
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/paid\s+via/i.test(line) && i > 0) {
      const candidate = lines[i - 1];
      if (
        !candidate.toLowerCase().includes('get up to') &&
        !candidate.toLowerCase().includes('payment') &&
        !candidate.toLowerCase().includes('provition') &&
        !candidate.includes('@')
      ) {
        const parsed = normalizeAmountString(candidate);
        if (parsed !== undefined && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

/**
 * Resolves final transaction amount through multi-layout consensus.
 * Reconciles OCR currency glyph misrecognitions and fails closed to undefined if passes genuinely conflict.
 */
export function resolveConsensusAmount(candidates: OCRPassCandidate[]): number | undefined {
  const valid = candidates.filter(
    (c): c is OCRPassCandidate & { amount: number } => typeof c.amount === 'number' && c.amount > 0,
  );
  if (valid.length === 0) return undefined;

  const map = new Map<number, { total: number; structured: number }>();
  for (const c of valid) {
    const entry = map.get(c.amount) || { total: 0, structured: 0 };
    entry.total += 1;
    if (c.isStructured) entry.structured += 1;
    map.set(c.amount, entry);
  }

  const uniqueAmounts = Array.from(map.keys());
  if (uniqueAmounts.length === 1) {
    return uniqueAmounts[0];
  }

  // Handle OCR Rupee prefix artifact: where one candidate is X and another is "2" + X (₹ glyph misread as '2')
  for (const amt of uniqueAmounts) {
    const prefixed = Number('2' + amt.toString());
    if (map.has(prefixed)) {
      const xEntry = map.get(amt)!;
      const prefixedEntry = map.get(prefixed)!;

      // 1. If 2X has strong structured consensus (>= 2 structured votes) and X has 0 structured votes, preserve 2X
      if (prefixedEntry.structured >= 2 && xEntry.structured === 0) {
        map.delete(amt);
      }
      // 2. If structured support is split 1-vs-1 (e.g. AUTO=290 vs SINGLE_COL=90), do not reconcile (fail closed)
      else if (xEntry.structured === 1 && prefixedEntry.structured === 1) {
        // Leave both to fail closed
      }
      // 3. Otherwise (X has >= structured support, or 2X has only 1 structured vote while X is sparse artifact), reconcile 2X -> X
      else {
        xEntry.total += prefixedEntry.total;
        xEntry.structured += prefixedEntry.structured;
        map.delete(prefixed);
      }
    }
  }

  const reconciledAmounts = Array.from(map.keys());
  if (reconciledAmounts.length === 1) {
    return reconciledAmounts[0];
  }

  // 1. Check strong structured layout consensus (>= 2 structured passes agree)
  const structuredWinners = reconciledAmounts.filter((amt) => (map.get(amt)?.structured || 0) >= 2);
  if (structuredWinners.length === 1) {
    return structuredWinners[0];
  }

  // 2. Check single structured pass vs purely unstructured passes
  const structuredCandidates = reconciledAmounts.filter(
    (amt) => (map.get(amt)?.structured || 0) >= 1,
  );
  if (structuredCandidates.length === 1) {
    const winner = structuredCandidates[0];
    const nonStructured = reconciledAmounts.filter((amt) => amt !== winner);
    const allOthersUnstructured = nonStructured.every(
      (amt) => (map.get(amt)?.structured || 0) === 0,
    );
    if (allOthersUnstructured) {
      return winner;
    }
  }

  // 3. If AUTO and SINGLE_COLUMN produce different structured amounts, do not allow SPARSE_TEXT to resolve the conflict.
  // Return undefined so the verifier routes the transaction to manual review (fail-closed).
  return undefined;
}

/**
 * Extracts structured receipt data from extracted OCR text.
 * NEVER manufactures synthetic text or defaults to expected amount.
 * Preserves transaction references as exact strings with leading zeros intact.
 */
export function extractReceiptDataFromText(
  rawText: string,
  passResults?: OCRPassCandidate[],
): ExtractedReceiptData {
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

  // 1. Amount Extraction via Candidate Consensus
  if (passResults && passResults.length > 0) {
    amount = resolveConsensusAmount(passResults);
  } else if (rawText.includes(OCR_LAYOUT_PASS_DELIMITER)) {
    const passChunks = rawText.split(OCR_LAYOUT_PASS_DELIMITER);
    const candidates: OCRPassCandidate[] = passChunks.map((chunk, idx) => ({
      amount: extractAmountCandidateFromText(chunk),
      // Pass 0 (AUTO) and Pass 1 (SINGLE_COLUMN) are structured layouts
      isStructured: idx < 2,
      psm: idx === 0 ? 'AUTO' : idx === 1 ? 'SINGLE_COLUMN' : 'SPARSE_TEXT',
    }));
    amount = resolveConsensusAmount(candidates);
  } else {
    amount = extractAmountCandidateFromText(text);
  }

  // Currency extraction
  if (/₹|INR|Rs/i.test(text)) currency = 'INR';
  else if (/\$|USD/i.test(text)) currency = 'USD';
  else if (/€|EUR/i.test(text)) currency = 'EUR';
  else if (/£|GBP/i.test(text)) currency = 'GBP';

  // 2. UTR / Bank Reference Number Extraction Regexes (Generic Multi-UPI support)
  // Supports all UPI apps (Navi, GPay, PhonePe, Paytm, BHIM, MobiKwik, Cred, Bank UPI)
  const utrRegexes = [
    /(?:UPI\s*(?:txn|trans|transaction)?\s*ID|UTR(?:\s*No\.?)?|RRN|UPI\s*Ref(?:\s*No\.?)?|Transaction\s*(?:ID|Ref|Reference|Number)|Txn\s*ID|Bank\s*Ref(?:\s*No\.?)?|Ref\s*(?:No\.?)?|Reference\s*(?:Number|ID|No\.?)?)[:\s#]*([A-Za-z0-9\-_]{6,36})/i,
    /\b(\d{12})\b/, // 12-digit Indian banking UTR
  ];

  for (const regex of utrRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanRef = match[1].replace(/[^A-Za-z0-9\-_]/g, '').trim();
      // Valid reference numbers must be 6-36 chars and contain at least one digit (to ignore pure words like "available")
      if (cleanRef.length >= 6 && /\d/.test(cleanRef)) {
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
  } else if (/Pending|Processing|In Progress|Awaiting/i.test(text)) {
    paymentStatus = 'PENDING';
  } else if (
    /Success|Successful|Completed|Paid|Approved|Transferred|Payment Successful/i.test(text)
  ) {
    paymentStatus = 'SUCCESSFUL';
  }

  // 4. Date & Time Extraction
  // Formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, 15 Aug 2026, 16 Aug 2026, etc.
  const dateMatch = text.match(
    /\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i,
  );
  if (dateMatch) transactionDate = dateMatch[1];

  const timeMatch = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/);
  if (timeMatch) transactionTime = timeMatch[1];

  // 5. UPI VPAs & Payer/Payee Extraction
  const vpaRegex = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g;
  const rawVpaMatches = text.match(vpaRegex);
  const cleanedVpas: string[] = rawVpaMatches
    ? Array.from(new Set(rawVpaMatches.map((v) => v.replace(/^\\+/, ''))))
    : [];

  // Semantic contextual label matchers for VPAs
  // To / Paid To / Receiver / Beneficiary / Credited To / Payee => receiverVpa
  const receiverVpaPatterns = [
    /(?:(?:To|Paid\s+To|Receiver|Beneficiary|Credited\s+To|Payee(?:\s*(?:UPI\s*ID|VPA))?|Payment(?:\s+successful)?\s+to)\s*[:\s-]*\s*)(?:[^\n@]*\n\s*)?([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/i,
    /([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})\s*(?:\([^\)]*\)\s*)?(?:credited|received|beneficiary|payee)/i,
  ];

  // From / Paid By / Sender / Debited From / Payer => senderVpa
  const senderVpaPatterns = [
    /(?:(?:From|Paid\s+By|Sender|Debited\s+From|Payer(?:\s*(?:UPI\s*ID|VPA))?)\s*[:\s-]*\s*)(?:[^\n@]*\n\s*)?([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/i,
    /([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})\s*(?:\([^\)]*\)\s*)?(?:debited|sent|payer)/i,
  ];

  for (const pattern of receiverVpaPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      receiverVpa = match[1].replace(/^\\+/, '').trim();
      break;
    }
  }

  for (const pattern of senderVpaPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      senderVpa = match[1].replace(/^\\+/, '').trim();
      break;
    }
  }

  // Fallback: Resolve remaining VPAs when contextual labels are partially or completely absent
  if (cleanedVpas.length === 1) {
    if (!receiverVpa && !senderVpa) {
      receiverVpa = cleanedVpas[0];
    }
  } else if (cleanedVpas.length >= 2) {
    if (receiverVpa && !senderVpa) {
      senderVpa = cleanedVpas.find((v) => v.toLowerCase() !== receiverVpa?.toLowerCase());
    } else if (senderVpa && !receiverVpa) {
      receiverVpa = cleanedVpas.find((v) => v.toLowerCase() !== senderVpa?.toLowerCase());
    } else if (!receiverVpa && !senderVpa) {
      senderVpa = cleanedVpas[0];
      receiverVpa = cleanedVpas[1];
    }
  }

  const senderMatch = text.match(/(?:From|Paid By|Sender|Debited From)[:\s]*([^\n]{2,40})/i);
  if (senderMatch) {
    senderName = senderMatch[1].replace(/^(?:from|paid by|sender|debited from)[:\s]*/i, '').trim();
  }

  const receiverMatch = text.match(
    /(?:To|Paid To|Receiver|Beneficiary|Credited To)[:\s]*([^\n]{2,40})/i,
  );
  if (receiverMatch) {
    receiverName = receiverMatch[1]
      .replace(/^(?:to|paid to|receiver|beneficiary|credited to)[:\s]*/i, '')
      .trim();
  }

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
 * Runs multi-layout page segmentation passes with consensus voting for high accuracy.
 * Manages worker lifecycle safely without leaking child processes.
 */
export async function performRealReceiptOCR(
  fileBytes: Uint8Array,
  mimeType: string,
  fileName: string = 'receipt',
): Promise<{ text: string; confidence: number; passResults?: OCRPassCandidate[] }> {
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
      const rawString = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
      return {
        text: rawString,
        confidence: 0.5,
      };
    }
  }

  // Image Optical Character Recognition (JPG, JPEG, PNG, WEBP)
  let worker: any = null;
  try {
    const tesseractModule = await import('tesseract.js');
    const { createWorker, PSM } = tesseractModule as any;
    const buffer = Buffer.from(fileBytes);

    worker = await createWorker('eng');

    // Pass 1: Standard AUTO page segmentation
    const autoResult = await worker.recognize(buffer);
    const autoText = autoResult.data?.text || '';
    const autoConfidence = (autoResult.data?.confidence || 0) / 100;

    // Pass 2: Explicit SINGLE_COLUMN layout segmentation
    let singleColText = '';
    let singleColConfidence = 0.0;
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
      const singleColResult = await worker.recognize(buffer);
      singleColText = singleColResult.data?.text || '';
      singleColConfidence = (singleColResult.data?.confidence || 0) / 100;
    } catch {
      // Non-fatal fallback
    }

    // Pass 3: SPARSE_TEXT segmentation to capture detached labels/amounts
    let sparseText = '';
    let sparseConfidence = 0.0;
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const sparseResult = await worker.recognize(buffer);
      sparseText = sparseResult.data?.text || '';
      sparseConfidence = (sparseResult.data?.confidence || 0) / 100;
    } catch {
      // Non-fatal fallback
    }

    const passTexts = [autoText, singleColText, sparseText].filter((t) => t.trim().length > 0);
    const combinedText = passTexts.join(OCR_LAYOUT_PASS_DELIMITER);
    const maxConfidence = Math.max(autoConfidence, singleColConfidence, sparseConfidence);

    const passResults: OCRPassCandidate[] = [
      {
        amount: extractAmountCandidateFromText(autoText),
        isStructured: true,
        psm: 'AUTO',
      },
      {
        amount: extractAmountCandidateFromText(singleColText),
        isStructured: true,
        psm: 'SINGLE_COLUMN',
      },
      {
        amount: extractAmountCandidateFromText(sparseText),
        isStructured: false,
        psm: 'SPARSE_TEXT',
      },
    ];

    return {
      text: combinedText,
      confidence: maxConfidence,
      passResults,
    };
  } catch (ocrErr) {
    console.error('Tesseract OCR image extraction error:', ocrErr);
    return {
      text: '',
      confidence: 0.0,
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        console.warn('Tesseract worker termination warning:', termErr);
      }
    }
  }
}
