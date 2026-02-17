// lib/i18n/invite-errors.ts
// Standardized error codes for the invitation API.
// The API returns { error: <code> } and the frontend maps it to t.invite.<key>

/**
 * Error codes returned by /api/invitations/[code]/complete
 * The frontend catches these and displays the translated message from t.invite.*
 */
export const INVITE_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FIRST_NAME_REQUIRED: 'FIRST_NAME_REQUIRED',
  FIRST_NAME_MIN_LENGTH: 'FIRST_NAME_MIN_LENGTH',
  FIRST_NAME_LETTERS_ONLY: 'FIRST_NAME_LETTERS_ONLY',
  LAST_NAME_REQUIRED: 'LAST_NAME_REQUIRED',
  LAST_NAME_MIN_LENGTH: 'LAST_NAME_MIN_LENGTH',
  LAST_NAME_LETTERS_ONLY: 'LAST_NAME_LETTERS_ONLY',
  TERMS_REQUIRED: 'TERMS_REQUIRED',
  PHONE_INVALID: 'PHONE_INVALID',
  NATIONAL_ID_INVALID: 'NATIONAL_ID_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  EXPIRED: 'EXPIRED',
  ALREADY_USED: 'ALREADY_USED',
} as const

export type InviteErrorCode = (typeof INVITE_ERROR_CODES)[keyof typeof INVITE_ERROR_CODES]

/**
 * Maps API error codes to dictionary keys under `t.invite.*`
 * Used by the frontend to translate API errors.
 */
export const ERROR_CODE_TO_I18N_KEY: Record<string, string> = {
  AUTH_REQUIRED: 'errorTitle',
  FIRST_NAME_REQUIRED: 'firstNameRequired',
  FIRST_NAME_MIN_LENGTH: 'firstNameMinLength',
  FIRST_NAME_LETTERS_ONLY: 'firstNameLettersOnly',
  LAST_NAME_REQUIRED: 'lastNameRequired',
  LAST_NAME_MIN_LENGTH: 'lastNameMinLength',
  LAST_NAME_LETTERS_ONLY: 'lastNameLettersOnly',
  TERMS_REQUIRED: 'termsAndPrivacyRequired',
  PHONE_INVALID: 'phoneInvalid',
  NATIONAL_ID_INVALID: 'nationalIdInvalid',
  NOT_FOUND: 'notFound',
  EXPIRED: 'expired',
  ALREADY_USED: 'alreadyUsed',
}

/**
 * Translates an API error code to a user-facing message using the invite dictionary.
 * @param code - Error code from the API response
 * @param inviteDict - The `t.invite` section of the current dictionary
 * @param fallback - Fallback message if code is unknown
 */
export function translateInviteError(
  code: string,
  inviteDict: Record<string, string>,
  fallback = 'An error occurred'
): string {
  const key = ERROR_CODE_TO_I18N_KEY[code]
  if (key && inviteDict[key]) {
    return inviteDict[key]
  }
  return fallback
}