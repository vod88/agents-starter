import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { convertToModelMessages, streamText } from "ai";

export class OkAgent extends AIChatAgent<Env> {
  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      // ⭐️ 换成通义千问（Qwen），这是目前 Cloudflare 上中文最流畅、最不容易复读的模型
      model: workersai("@cf/qwen/qwen1.5-14b-chat-awq", {
        sessionAffinity: this.sessionAffinity
      }),
      // 温度调到极低，锁死它的发散思维
      temperature: 0.01,
      // 加上强硬的指令
      system: `你是一个专业、友好的电商客服助手，名字叫小智。
你的回答必须非常干脆、流畅。绝对、绝对不允许重复任何字词！例如：不准出现“你你好”，必须直接说“你好”。
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
