declare global {
  interface Window { Razorpay: new (opts: RazorpayOptions) => RazorpayInstance; }
}

export interface RazorpayOptions {
  key:         string;
  amount:      number;   // paise
  currency:    string;
  name:        string;
  description: string;
  order_id:    string;
  prefill?:    { name?: string; email?: string; contact?: string };
  theme?:      { color?: string };
  notes?:      Record<string, string>;
  handler:     (response: RazorpaySuccessResponse) => void;
  modal?:      { ondismiss?: () => void; confirm_close?: boolean };
}

export interface RazorpaySuccessResponse {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}

export interface RazorpayInstance { open(): void; close(): void; }

// ─────────────────────────────────────────
// Load Razorpay checkout.js dynamically
// ─────────────────────────────────────────
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src   = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─────────────────────────────────────────
// Open Razorpay checkout modal
// ─────────────────────────────────────────
export async function openRazorpayCheckout(params: {
  orderId:    string;
  amount:     number;   // paise
  keyId:      string;
  bookingId:  string;
  description:string;
  userName?:  string;
  userEmail?: string;
  userPhone?: string;
  onSuccess:  (response: RazorpaySuccessResponse) => void;
  onDismiss?: () => void;
}): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error("Failed to load Razorpay. Check your internet connection.");

  const rzp = new window.Razorpay({
    key:         params.keyId,
    amount:      params.amount,
    currency:    "INR",
    name:        "DineSpot",
    description: params.description,
    order_id:    params.orderId,
    prefill: {
      name:    params.userName,
      email:   params.userEmail,
      contact: params.userPhone,
    },
    theme: { color: "#f97316" },
    notes: { bookingId: params.bookingId },
    handler: params.onSuccess,
    modal: {
      ondismiss:     params.onDismiss,
      confirm_close: true,
    },
  });

  rzp.open();
}
