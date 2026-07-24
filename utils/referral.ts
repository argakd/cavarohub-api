
export const REFERRAL_POINTS_AWARDED = 10_000;
export const REFERRAL_REWARD_EXPIRY_MONTHS = 3;

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

export function computeReferralRewardExpiry(now: Date = new Date()): Date {
  return addMonths(now, REFERRAL_REWARD_EXPIRY_MONTHS);
}

export type ReferralReward = {
  referrerPointsAwarded: number;
  referrerPointsExpiresAt: Date;
  refereeCouponDiscountPercent: number;
  refereeCouponExpiresAt: Date;
};

export function computeReferralReward(now: Date = new Date()): ReferralReward {
  const expiresAt = computeReferralRewardExpiry(now);
  return {
    referrerPointsAwarded: REFERRAL_POINTS_AWARDED,
    referrerPointsExpiresAt: expiresAt,
    refereeCouponDiscountPercent: 10,
    refereeCouponExpiresAt: expiresAt,
  };
}
