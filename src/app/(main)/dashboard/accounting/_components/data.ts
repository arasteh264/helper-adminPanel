export type AccountingSummary = {
  allTimePaidVolumeToman: number;
  currentMonthPaidVolumeToman: number;
  allTimePlatformCommissionToman: number;
  currentMonthPlatformCommissionToman: number;
  providerGrossEarningsToman: number;
  currentMonthProviderGrossEarningsToman: number;
  providerAvailableBalanceToman: number;
  providerFundsHeldToman: number;
  pendingPayoutAmountToman: number;
  pendingPayoutCount: number;
  totalPaidOutToman: number;
  currentMonthPaidOutToman: number;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type WalletTransactionType = "EARNING" | "COMMISSION" | "PAYOUT_REQUEST" | "PAYOUT_REFUND" | "ADJUSTMENT";
export type WalletTransaction = {
  id: string;
  providerName: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
  payoutStatus: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | null;
};

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type CustomerPayment = {
  id: string;
  serviceRequestId: string;
  requestTitle: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  providerName: string | null;
  amountToman: number;
  status: PaymentStatus;
  referenceId: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type PayoutStatus = "PENDING" | "PAID" | "REJECTED" | "CANCELLED";
export type PayoutRequest = {
  id: string;
  providerProfileId: string;
  providerName: string;
  amount: number;
  status: PayoutStatus;
  holderName: string;
  sheba: string;
  bankName: string | null;
  referenceCode: string | null;
  rejectReason: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type WalletConfiguration = {
  commissionRate: number;
  minWithdrawal: number;
};

export const transactionTypeLabels: Record<WalletTransactionType, string> = {
  EARNING: "درآمد سرویس‌دهنده",
  COMMISSION: "کمیسیون پلتفرم",
  PAYOUT_REQUEST: "درخواست برداشت",
  PAYOUT_REFUND: "بازگشت برداشت",
  ADJUSTMENT: "اصلاح موجودی",
};

export const payoutStatusLabels: Record<PayoutStatus, string> = {
  PENDING: "در انتظار بررسی",
  PAID: "واریزشده",
  REJECTED: "ردشده",
  CANCELLED: "لغوشده",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
};

export function formatToman(value: number): string {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function dateBoundary(value: string, end = false): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0).toISOString();
}
