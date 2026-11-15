import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";

export class CleanAgent extends AIChatAgent<Env> {
  async onChatMessage(_onFinish: unknown, _options?: OnChatMessageOptions) {
    // 绕过 AI 模型，直接强行返回一段流式文本
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("你好！测试成功，我能收到消息了！"));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
