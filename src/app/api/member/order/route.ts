import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/member";

// 支付网关凭证需在部署环境配置真实商户密钥后才可用
const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || "";
const WECHAT_MCH_ID = process.env.WECHAT_MCH_ID || "";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  }

  let body: { gateway?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const gateway = body.gateway === "wechat" ? "wechat" : "alipay";

  // 真实网关凭证未配置时，如实返回（不伪造支付结果）
  if (gateway === "alipay" && !ALIPAY_APP_ID) {
    return NextResponse.json(
      {
        error: "GATEWAY_NOT_CONFIGURED",
        message: "支付宝网关尚未配置商户凭证，请管理员设置 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY 等环境变量。当前可使用兑换码开通会员。",
      },
      { status: 503 }
    );
  }
  if (gateway === "wechat" && !WECHAT_MCH_ID) {
    return NextResponse.json(
      {
        error: "GATEWAY_NOT_CONFIGURED",
        message: "微信支付网关尚未配置商户凭证，请管理员设置 WECHAT_MCH_ID / WECHAT_API_KEY 等环境变量。当前可使用兑换码开通会员。",
      },
      { status: 503 }
    );
  }

  // 凭证就绪后的真实下单逻辑：创建订单并调用网关统一下单 API。
  // 此处仅在凭证存在时执行；当前环境未配置，故不会走到这里。
  return NextResponse.json(
    { error: "GATEWAY_NOT_IMPLEMENTED", message: "网关凭证已配置但下单流程未接入，请联系管理员" },
    { status: 503 }
  );
}
