import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const promoCode   = (fd.get("promo_code") ?? "").toString().trim().toUpperCase();
  const discountType = (fd.get("discount_type") ?? "percent").toString();
  const amountRaw   = parseFloat((fd.get("amount") ?? "0").toString());
  const duration    = (fd.get("duration") ?? "once").toString() as "once" | "repeating" | "forever";
  const durationMonths = parseInt((fd.get("duration_months") ?? "0").toString(), 10) || undefined;
  const maxRedemptions = parseInt((fd.get("max_redemptions") ?? "").toString(), 10) || undefined;

  if (!promoCode) return NextResponse.json({ ok: false, error: "Promo code is required." });
  if (!amountRaw || amountRaw <= 0) return NextResponse.json({ ok: false, error: "Amount must be > 0." });

  try {
    const stripe = getStripe();

    // Create coupon
    const couponParams: Parameters<typeof stripe.coupons.create>[0] = {
      duration,
      ...(duration === "repeating" && durationMonths ? { duration_in_months: durationMonths } : {}),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
      ...(discountType === "percent"
        ? { percent_off: amountRaw }
        : { amount_off: Math.round(amountRaw * 100), currency: "usd" }),
      name: promoCode,
    };

    const coupon = await stripe.coupons.create(couponParams);

    // Attach a promotion code that fans enter at checkout
    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: promoCode,
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
    });

    return NextResponse.json({ ok: true, code: promoCode, couponId: coupon.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
