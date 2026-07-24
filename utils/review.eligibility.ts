
export function isEligibleForReview(params: {
  transactionStatus: string;
  eventEndDate: Date;
  now?: Date;
}): { eligible: boolean; reason?: string } {
  const now = params.now ?? new Date();
  if (params.transactionStatus !== "DONE") {
    return { eligible: false, reason: "Only completed (paid & confirmed) transactions can be reviewed" };
  }
  if (params.eventEndDate > now) {
    return { eligible: false, reason: "You can only review an event after it has ended" };
  }
  return { eligible: true };
}
