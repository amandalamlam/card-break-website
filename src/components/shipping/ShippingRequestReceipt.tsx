import { getTranslations } from "next-intl/server";
import type { ShippingRequest } from "@/lib/shipping/types";

type ShippingRequestReceiptProps = {
  request: ShippingRequest;
};

export async function ShippingRequestReceipt({ request }: ShippingRequestReceiptProps) {
  const t = await getTranslations("shipping.receipt");

  return (
    <div className="space-y-4 rounded-2xl border border-success/30 bg-success/5 p-6 text-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-success">{t("submitted")}</p>
      <p className="text-muted">{t("lockedNote")}</p>

      <div className="space-y-3 border-t border-border/70 pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("slots")}</p>
          <p className="mt-1 font-medium">{request.slot_names_snapshot}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("option")}</p>
          <p className="mt-1 font-medium">{request.option_name}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("details")}</p>
          <p className="mt-1 whitespace-pre-wrap font-medium">{request.shipping_details}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("statusLabel")}</p>
          <p className="mt-1 font-medium capitalize">{t(`statusValues.${request.status}`)}</p>
        </div>
      </div>
    </div>
  );
}
