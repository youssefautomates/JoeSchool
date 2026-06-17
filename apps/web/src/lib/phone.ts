/**
 * Normalizes a phone number to standard E.164 format.
 * Strips any non-digits, strips the dialing code from the start if present,
 * removes any leading zero from the national part, and prepends the dialing code with '+'.
 * 
 * @param value The raw phone input string from react-phone-input-2 (e.g. "2001012345678" or "966501234567")
 * @param dialCode The active country dialing code without '+' (e.g. "20" or "966")
 */
export function normalizePhoneNumber(value: string, dialCode: string): string {
  if (!value) return "";
  
  // Strip all non-digit characters
  const cleanVal = value.replace(/\D/g, "");
  
  // Clean the dialCode to remove any non-digits just in case
  const cleanDialCode = dialCode.replace(/\D/g, "");
  
  let nationalNumber = cleanVal;
  
  // Remove the dialing code from the start of the string if present
  if (cleanDialCode && cleanVal.startsWith(cleanDialCode)) {
    nationalNumber = cleanVal.slice(cleanDialCode.length);
  }
  
  // Remove any leading zeroes from the national number
  nationalNumber = nationalNumber.replace(/^0+/, "");
  
  // Return in E.164 format
  return `+${cleanDialCode}${nationalNumber}`;
}
