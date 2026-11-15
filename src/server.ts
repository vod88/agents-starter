import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { convertToModelMessages, streamText } from "ai";

export class CleanAgent extends AIChatAgent<Env> {
  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      // 1. 换成通义千问，彻底解决 Llama 中文结巴的问题
      model: workersai("@cf/qwen/qwen1.5-14b-chat-awq", {
        sessionAffinity: this.sessionAffinity
      }),
      // 2. 把温度调到 0.1，锁死随机性，让它老老实实说话，绝不发癫复读
      temperature: 0.1,
      // 3. 你的人设与业务规则（可以随时修改这里）
      system: `你是一个专业、友好的电商客服助手，名字叫小智。
请始终用简体中文回答，回答要简洁明了，绝对不要重复自己说过的话（不要出现结巴现象）。
如果用户问发货时间，告诉他们是下午3点前付款当天发货。
如果遇到你无法解答的问题，请回复："抱歉，这个问题我暂时无法处理，我将为您转接人工客服，请稍候。"`,
      messages: await convertToModelMessages(this.messages),
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
