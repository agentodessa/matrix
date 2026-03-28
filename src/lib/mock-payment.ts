// TODO: Replace with real Stripe SDK / Apple Pay integration

export type PaymentMethod = "stripe" | "apple_pay";

interface PaymentResult {
  success: boolean;
  transactionId: string;
  error?: string;
}

export async function processPayment(
  amount: number,
  method: PaymentMethod,
): Promise<PaymentResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock: always succeeds
  return {
    success: true,
    transactionId: `mock_${method}_${Date.now()}`,
  };
}
