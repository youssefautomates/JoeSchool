/**
 * Utility functions for validating and extracting Meta Pixel details.
 */

export function extractMetaPixelId(code: string): string | null {
  if (!code) return null;

  // Try to find fbq('init', '123456...')
  const initMatch = code.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]\s*\)/);
  if (initMatch && initMatch[1]) {
    return initMatch[1];
  }

  // Try to find id=123456... in noscript src url
  const noscriptMatch = code.match(/id=(\d+)(?:&ev=PageView|&)/);
  if (noscriptMatch && noscriptMatch[1]) {
    return noscriptMatch[1];
  }

  // Or if they just paste the ID itself, validate it's digits
  const idOnlyMatch = code.trim().match(/^\d+$/);
  if (idOnlyMatch) {
    return idOnlyMatch[0];
  }

  return null;
}
