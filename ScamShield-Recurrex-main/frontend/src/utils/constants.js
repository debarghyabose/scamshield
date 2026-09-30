/*
  UI constants shared with the backend. Scoring logic lives in the FastAPI
  service (backend/services); the frontend only needs labels and defaults.
*/

// Default risk bands; every scan response also returns `thresholds`.
export const DEFAULT_THRESHOLDS = { suspicious: 30, dangerous: 70 }

// Behaviour the user can report on the payment scanner (ids match the API).
export const PAYMENT_FLAGS = [
  { id: 'contacted_first', label: 'The payee contacted me first' },
  { id: 'pay_to_receive', label: 'I’m told to pay or scan a QR code to receive money' },
  { id: 'urgency', label: 'The payee is pressuring me to pay quickly' },
  { id: 'otp_request', label: 'The payee asked for my OTP or UPI PIN' },
  { id: 'remote_app', label: 'I was asked to install a screen-sharing app' },
  { id: 'unknown_qr', label: 'Payment is via a QR code or collect request I didn’t expect' },
]

// Must match SCAM_TYPES in backend/models/schemas.py
export const SCAM_TYPES = [
  'Prize / lottery',
  'Phishing link',
  'Fake KYC / bank',
  'UPI collect request',
  'Job / task scam',
  'Investment / crypto',
  'Delivery / courier',
  'Impersonation',
  'Other',
]

export const SCAN_TYPE_LABEL = { message: 'Message', url: 'URL', payment: 'Payment' }
export const LEVEL_LABEL = { SAFE: 'Safe', SUSPICIOUS: 'Suspicious', DANGEROUS: 'Dangerous' }
