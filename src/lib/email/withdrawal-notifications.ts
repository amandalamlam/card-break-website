import { sendEmail } from "@/lib/email/send";
import type { WithdrawalWithProfile } from "@/lib/wallet/withdrawals";

function formatAmount(amount: number) {
  return amount.toFixed(2);
}

function getRecipientEmail(withdrawal: WithdrawalWithProfile) {
  return withdrawal.profiles?.email?.trim() ?? "";
}

function buildCompletedEmail(withdrawal: WithdrawalWithProfile) {
  const amount = formatAmount(withdrawal.amount);
  const subject = `Withdrawal completed — HK$${amount} / 提現已完成`;

  const text = [
    "Your cash out request has been completed.",
    "",
    `Amount: HK$${amount}`,
    `Method: ${withdrawal.method}`,
    `Recipient: ${withdrawal.details}`,
    `Reference: #${withdrawal.id}`,
    "",
    "The payout should arrive via your selected method shortly.",
    "",
    "---",
    "您的提現申請已完成。",
    "",
    `金額：HK$${amount}`,
    `方式：${withdrawal.method}`,
    `收款資料：${withdrawal.details}`,
    `參考編號：#${withdrawal.id}`,
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.5rem;">Withdrawal completed / 提現已完成</h2>
      <p>Your cash out request has been completed.<br />您的提現申請已完成。</p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Amount / 金額</td><td><strong>HK$${amount}</strong></td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Method / 方式</td><td>${withdrawal.method}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Recipient / 收款資料</td><td>${withdrawal.details}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Reference / 參考編號</td><td>#${withdrawal.id}</td></tr>
      </table>
      <p style="color: #666;">The payout should arrive via your selected method shortly.<br />款項將透過您選擇的方式到帳。</p>
    </div>
  `;

  return { subject, text, html };
}

function buildRejectedEmail(withdrawal: WithdrawalWithProfile) {
  const amount = formatAmount(withdrawal.amount);
  const subject = `Withdrawal rejected — HK$${amount} refunded / 提現被拒，已退回錢包`;

  const text = [
    "Your cash out request could not be processed and has been rejected.",
    "",
    `Amount refunded to wallet: HK$${amount}`,
    `Method: ${withdrawal.method}`,
    `Recipient: ${withdrawal.details}`,
    `Reference: #${withdrawal.id}`,
    "",
    "Please review your recipient details and submit a new request if needed.",
    "",
    "---",
    "您的提現申請未能處理，已被拒絕。",
    "",
    `已退回錢包金額：HK$${amount}`,
    `方式：${withdrawal.method}`,
    `收款資料：${withdrawal.details}`,
    `參考編號：#${withdrawal.id}`,
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.5rem;">Withdrawal rejected / 提現被拒</h2>
      <p>Your cash out request could not be processed and has been rejected.<br />您的提現申請未能處理，已被拒絕。</p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Refunded / 已退回</td><td><strong>HK$${amount}</strong></td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Method / 方式</td><td>${withdrawal.method}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Recipient / 收款資料</td><td>${withdrawal.details}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Reference / 參考編號</td><td>#${withdrawal.id}</td></tr>
      </table>
      <p style="color: #666;">Please review your recipient details and submit a new request if needed.<br />請檢查收款資料後再重新提交。</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendWithdrawalCompletedEmail(withdrawal: WithdrawalWithProfile) {
  const to = getRecipientEmail(withdrawal);

  if (!to) {
    console.warn("[email] No recipient email for withdrawal", withdrawal.id);
    return { ok: false, skipped: true as const };
  }

  const content = buildCompletedEmail(withdrawal);
  return sendEmail({ to, ...content });
}

export async function sendWithdrawalRejectedEmail(withdrawal: WithdrawalWithProfile) {
  const to = getRecipientEmail(withdrawal);

  if (!to) {
    console.warn("[email] No recipient email for withdrawal", withdrawal.id);
    return { ok: false, skipped: true as const };
  }

  const content = buildRejectedEmail(withdrawal);
  return sendEmail({ to, ...content });
}
