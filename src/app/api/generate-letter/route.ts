import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "coze-coding-dev-sdk";
import { getAuthUser } from "@/lib/member";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. 登录校验
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  }

  // 2. 参数
  let body: { recipient?: string; sender?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const recipient = (body.recipient || "").trim().slice(0, 30);
  const sender = (body.sender || "").trim().slice(0, 30);
  if (!recipient || !sender) {
    return NextResponse.json({ error: "MISSING_PARAMS", message: "请填写收信人与写信人" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let isControllerClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sse = (obj: unknown) => {
        if (isControllerClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          isControllerClosed = true;
        }
      };

      try {
        // 3. 会员 + 额度校验（行级校验并预扣 1 额度，原子操作）
        const db = getSupabaseClient();

        // 原子扣减：仅当会员有效且额度>0时扣 1
        const { data: deduct, error: deductErr } = await db.rpc("consume_credit", {
          p_user_id: user.id,
        });

        if (deductErr) {
          const m = deductErr.message || "";
          if (m.includes("NO_MEMBER") || m.includes("会员")) {
            sse({ error: "MEMBER_REQUIRED", message: "需要开通会员" });
          } else if (m.includes("NO_CREDIT") || m.includes("额度")) {
            sse({ error: "NO_CREDITS", message: "写信额度不足" });
          } else {
            sse({ error: "DB_ERROR", message: "会员校验失败" });
          }
          if (!isControllerClosed) controller.close();
          return;
        }

        if (!deduct || (deduct as { ok?: boolean }).ok === false) {
          sse({ error: "NO_CREDITS", message: "写信额度不足或会员已过期" });
          if (!isControllerClosed) controller.close();
          return;
        }

        // 4. 记录消耗
        const { error: usageErr } = await db.from("usage_records").insert({
          user_id: user.id,
          recipient,
          sender,
          credits_used: 1,
        });
        if (usageErr) {
          // 记录失败不阻断流程
          console.error("usage record failed:", usageErr.message);
        }

        // 5. 调用 LLM 流式生成
        const client = new LLMClient();
        const streamResult = await client.stream(
          [
            {
              role: "system",
              content: `你是一位深情、专一、文笔细腻的情书撰写者。请用中文写一封真挚动人的表白信。
要求：
1. 信的开头是"亲爱的${recipient}："，信的结尾署名是"—— ${sender}"。
2. 正文 300-500 字，从一个具体的生活小细节切入，情感层层递进，表达热烈而专一的爱意。
3. 语言真诚自然，避免空洞华丽辞藻堆砌，要有画面感和温度。
4. 不要出现"AI"、"人工智能"等字眼。
5. 只输出信件内容本身，不要加额外解释。
6. 用具体的意象和场景打动人，不要用"亲爱的宝贝"这种俗套称呼。`,
            },
            {
              role: "user",
              content: `请为我写一封表白信。收信人：${recipient}，写信人：${sender}。`,
            },
          ],
          { model: "doubao-seed-2-0-pro-260215", temperature: 0.9, streaming: true }
        );

        for await (const chunk of streamResult) {
          if (isControllerClosed) break;
          const delta = (chunk as { content?: string | { text?: string }[] })?.content;
          let text = "";
          if (typeof delta === "string") {
            text = delta;
          } else if (Array.isArray(delta)) {
            text = delta.map((c) => (typeof c === "string" ? c : c?.text || "")).join("");
          }
          if (text) sse({ content: text });
        }

        sse({ done: true });
      } catch (e) {
        const message = e instanceof Error ? e.message : "生成失败";
        console.error("Stream error:", e);
        sse({ error: "GEN_FAILED", message });
      } finally {
        if (!isControllerClosed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
    cancel() {
      isControllerClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
