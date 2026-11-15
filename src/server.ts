import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  streamText,
} from "ai";

// ⚠️ 名字改成了 CSAgent，强制生成全新记录
export class CSAgent extends AIChatAgent<Env> {
  maxPersistedMessages = 50;
  chatRecovery = true;

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      // 换成官方目前最稳的 8B 模型，不搞花里胡哨的
      model: workersai("@cf/meta/llama-3-8b-instruct", {
        sessionAffinity: this.sessionAffinity
      }),
      // 设置极低的温度，防止它发疯复读
      temperature: 0.1,
      system: `你是一个专业、耐心的电商客服助手。你的名字叫小智。
请始终用简体中文回答。绝对不要重复自己说过的话。
如果无法解答，请说："抱歉，我将为您转接人工客服。"`,
      messages: await convertToModelMessages(this.messages),
      tools: {},
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
