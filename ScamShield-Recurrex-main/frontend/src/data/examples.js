/*
  Example inputs shown as quick-fill chips on the scanner pages.
  These are sample texts for trying the scanners — not user data.
*/

export const EXAMPLE_MESSAGES = [
  {
    label: 'Prize scam',
    text: 'Congratulations! You have won ₹50,000 in the SBI Lucky Draw. Click http://sbi-rewards-claim.xyz immediately to claim your reward. Offer expires in 2 hours.',
  },
  {
    label: 'Fake KYC alert',
    text: 'Dear customer, your HDFC account will be blocked today due to pending KYC. Update PAN details now: bit.ly/hdfc-kyc-upd or call 9876543210.',
  },
  {
    label: 'Job offer',
    text: 'Part-time job! Earn ₹3,000 daily by liking YouTube videos. Work from home, no experience. WhatsApp HR on 9123456780 to join our Telegram task group.',
  },
  {
    label: 'Parcel fee',
    text: 'India Post: Your parcel is on hold due to an incomplete address. Pay the ₹25 redelivery fee within 12 hours at indiapost-redelivery.info',
  },
  {
    label: 'Genuine OTP',
    text: 'Your OTP for login is 482913. It is valid for 10 minutes. Do not share it with anyone. -Team Zomato',
  },
  {
    label: 'Friend',
    text: 'Hey, are we still on for dinner at 8? I booked a table near the station.',
  },
]

export const EXAMPLE_URLS = [
  { label: 'Lookalike', url: 'http://amaz0n-offers.shop/claim/gift?id=8812' },
  { label: 'Fake bank', url: 'https://secure-login.hdfc-netbanking-verify.com/kyc/update' },
  { label: 'Shortened', url: 'bit.ly/3xRw9Kp' },
  { label: 'IP address', url: 'http://103.21.58.14/paytm/refund' },
  { label: 'Official', url: 'https://www.onlinesbi.sbi/' },
  { label: 'Everyday site', url: 'https://www.wikipedia.org/' },
]

export const EXAMPLE_PAYMENTS = [
  {
    label: 'Refund QR',
    values: {
      amount: '24999',
      payee_type: 'new',
      time: '21:40',
      frequency_24h: '3',
      average_amount: '1800',
      flags: ['contacted_first', 'pay_to_receive', 'urgency'],
    },
  },
  {
    label: 'Large rent payment',
    values: { amount: '32000', payee_type: 'existing', time: '10:15', frequency_24h: '1', average_amount: '2500', flags: [] },
  },
  {
    label: 'Late-night new payee',
    values: { amount: '18000', payee_type: 'new', time: '02:30', frequency_24h: '2', average_amount: '1500', flags: [] },
  },
  {
    label: 'Everyday',
    values: { amount: '240', payee_type: 'existing', time: '13:05', frequency_24h: '4', average_amount: '450', flags: [] },
  },
]

