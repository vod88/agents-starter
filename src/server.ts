import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
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
      // 1. 换成对中文支持极好、不容易复读的 Qwen 模型
      model: workersai("@cf/qwen/qwen1.5-14b-chat-awq", {
        sessionAffinity: this.sessionAffinity
      }),
      // 2. 设定客服人设
      system: `你是一个专业、耐心、礼貌的电商客服助手。你的名字叫小智。
你可以解答用户关于产品、订单、物流、退换货等常见问题。
请始终用简体中文回答。回答要简洁明了，不要啰嗦，千万不要重复自己说过的话（绝对不要出现复读机现象）。
如果遇到你无法解答的问题，或者用户情绪激动，请回复："抱歉，这个问题我暂时无法处理，我将为您转接人工客服，请稍候。"`,
      // 3. 关键：只取最近 4 条消息，强制模型遗忘之前的报错历史，防止被带偏
      messages: (await convertToModelMessages(this.messages)).slice(-4),
      // 4. 清空所有测试用的多余工具，保持纯粹对话
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
