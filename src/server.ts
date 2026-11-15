import { createWorkersAI } from "workers-ai-provider";
import { callable, routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  streamText,
} from "ai";

export class ChatAgent extends AIChatAgent<Env> {
  maxPersistedMessages = 100;
  chatRecovery = true;

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      // 依然使用强大的 70B 模型
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        sessionAffinity: this.sessionAffinity
      }),
      // 这里我把它设定成了专业客服
      system: `你是一个专业、耐心、礼貌的电商客服助手。你的名字叫小智。
你可以解答用户关于产品、订单、物流、退换货等常见问题。
请始终用简体中文回答。回答要简洁明了，不要啰嗦，千万不要重复自己说过的话（不要出现复读机现象）。
如果遇到你无法解答的问题，或者用户情绪激动，请回复："抱歉，这个问题我暂时无法处理，我将为您转接人工客服，请稍候。"`,
      messages: await convertToModelMessages(this.messages),
      // 清空所有测试用的多余工具
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
