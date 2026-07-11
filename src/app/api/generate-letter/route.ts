import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import type { Message } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { recipient, sender } = await request.json();

    if (!recipient || !sender) {
      return new Response(
        JSON.stringify({ error: '请提供收信人和写信人的名字' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位深情、浪漫、文采斐然的情书作家。你的文字充满真挚的感情，既有诗意的浪漫，又有朴实的真诚。

你的任务是为用户写一封表白情书。要求：
1. 信的开头要以"亲爱的{收信人名字}："或类似的亲密称呼开始
2. 内容要深情、专一、充满热情，表达出写信人对收信人深深的爱意
3. 文字要优美但不矫揉造作，真诚而不浮夸
4. 可以运用比喻、排比等修辞手法，让文字更有感染力
5. 信的长度适中，大约300-500字
6. 信的结尾要自然地过渡到写信人的署名
7. 最后一行以"—— {写信人名字}"或类似的署名格式结束
8. 每次生成的内容要有独特性，不要千篇一律

注意：直接输出信件内容，不要加任何解释或前缀。`;

    const userPrompt = `请为我写一封情书。收信人的名字是「${recipient}」，写信人（也就是我）的名字是「${sender}」。`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const stream = client.stream(messages, {
      temperature: 1.2,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const data = JSON.stringify({ content: chunk.content.toString() });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamError) {
          console.error('Stream error:', streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate letter error:', error);
    return new Response(
      JSON.stringify({ error: '生成情书失败，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
