export type WithdrawalMethod = "FPS" | "PayMe" | "PayPal";

export type WithdrawalStatus = "pending" | "completed" | "rejected";

export type Withdrawal = {
  id: number;
  user_id: string;
  amount: number;
  method: WithdrawalMethod;
  details: string;
  status: WithdrawalStatus;
  created_at: string;
  updated_at: string;
};

export type WithdrawalWithProfile = Withdrawal & {
  profiles: {
    email: string;
    phone: string;
  } | null;
};

export type SubmitWithdrawalResult =
  | { ok: true; withdrawalId: number }
  | { ok: false; code: string; message: string };

export type WithdrawalActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
