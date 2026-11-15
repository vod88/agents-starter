import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { convertToModelMessages, streamText } from "ai";

// ⚠️ 名字改成了 CleanAgent，强制抛弃旧历史
export class CleanAgent extends AIChatAgent<Env> {
  chatRecovery = true;

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      // 换回官方最稳定的 Llama 3 模型
      model: workersai("@cf/meta/llama-3-8b-instruct", {
        sessionAffinity: this.sessionAffinity
      }),
      temperature: 0.1, // 极低温度，防止发疯
      system: `你是一个专业、耐心的电商客服助手，名字叫小智。
请始终用简体中文回答。回答要简洁明了，绝对不要重复自己说过的话。
如果你不知道如何回答，请说："抱歉，我将为您转接人工客服。"`,
      messages: await convertToModelMessages(this.messages),
      tools: {}, // 清空所有工具，避免干扰
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse();
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
