export type DiscountType = "PERCENTAGE" | "FIXED";

export type PricingInput = {
  subtotalIdr: number;
  voucher?: { discountType: DiscountType; discountValue: number } | null;
  coupon?: { discountType: DiscountType; discountValue: number } | null;
  pointsAvailableIdr: number;
  pointsToUseIdr: number;
};

export type PricingResult = {
  subtotalIdr: number;
  voucherDiscIdr: number;
  couponDiscIdr: number;
  pointsUsedIdr: number;
  totalIdr: number;
};

function discountAmount(subtotal: number, discount: { discountType: DiscountType; discountValue: number }) {
  if (discount.discountType === "PERCENTAGE") {
    return Math.round((subtotal * discount.discountValue) / 100);
  }
  return discount.discountValue;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const { subtotalIdr } = input;
  if (subtotalIdr < 0) throw new Error("subtotalIdr must be >= 0");
  if (input.pointsToUseIdr < 0) throw new Error("pointsToUseIdr must be >= 0");
  if (input.pointsToUseIdr > input.pointsAvailableIdr) {
    throw new Error("Cannot use more points than available balance");
  }

  const voucherDiscIdr = input.voucher
    ? Math.min(discountAmount(subtotalIdr, input.voucher), subtotalIdr)
    : 0;

  const afterVoucher = subtotalIdr - voucherDiscIdr;

  const couponDiscIdr = input.coupon
    ? Math.min(discountAmount(afterVoucher, input.coupon), afterVoucher)
    : 0;

  const afterCoupon = afterVoucher - couponDiscIdr;

  const pointsUsedIdr = Math.min(input.pointsToUseIdr, afterCoupon);

  const totalIdr = Math.max(afterCoupon - pointsUsedIdr, 0);

  return { subtotalIdr, voucherDiscIdr, couponDiscIdr, pointsUsedIdr, totalIdr };
}
