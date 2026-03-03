/**
 * Encoding detection and decoding utilities
 *
 * Handles various text encodings commonly found in CSV files:
 * - UTF-8 (with/without BOM)
 * - UTF-16 (LE/BE)
 * - GBK (Windows Excel/WPS default encoding)
 */

/**
 * Detect encoding and decode content from ArrayBuffer
 * Supports UTF-8, UTF-16, and GBK encodings
 */
export function decodeWithEncodingDetection(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);

  // Check for UTF-8 BOM (EF BB BF)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    // UTF-8 with BOM - skip BOM and decode
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes.slice(3));
  }

  // Check for UTF-16 LE BOM (FF FE)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder("utf-16le");
    return decoder.decode(bytes.slice(2));
  }

  // Check for UTF-16 BE BOM (FE FF)
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const decoder = new TextDecoder("utf-16be");
    return decoder.decode(bytes.slice(2));
  }

  // Try UTF-8 first
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    const utf8Text = utf8Decoder.decode(bytes);

    // Validate UTF-8: check if there are replacement characters or obvious garbled text
    // If the text contains valid Chinese characters in UTF-8, it's likely correct
    const hasValidChinese = /[\u4e00-\u9fa5]/.test(utf8Text);
    const hasReplacementChar = utf8Text.includes('\uFFFD');

    if (hasValidChinese && !hasReplacementChar) {
      return utf8Text;
    }

    // If no Chinese or has replacement chars, might be GBK
  } catch {
    // UTF-8 decoding failed, try GBK
  }

  // Try GBK (common encoding for Windows Excel/WPS)
  // Node.js TextDecoder supports 'gbk' encoding
  try {
    const gbkDecoder = new TextDecoder("gbk");
    const gbkText = gbkDecoder.decode(bytes);

    // Check if GBK decoded text has valid Chinese
    if (/[\u4e00-\u9fa5]/.test(gbkText)) {
      return gbkText;
    }
  } catch {
    // GBK decoding failed
  }

  // Fallback to UTF-8 (non-fatal)
  const fallbackDecoder = new TextDecoder("utf-8");
  return fallbackDecoder.decode(bytes);
}

/**
 * Read text from a File with automatic encoding detection
 */
export async function readTextWithEncodingDetection(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return decodeWithEncodingDetection(arrayBuffer);
}
