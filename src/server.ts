import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { convertToModelMessages, streamText } from "ai";

export class OkAgent extends AIChatAgent<Env> {
  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      // 换成官方目前主推的 70B 旗舰模型，绝不会过期，中文极佳
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        sessionAffinity: this.sessionAffinity
      }),
      // 极低温度，防止发癫
      temperature: 0.1,
      // 这里是你客服的工作手册，可以随时修改
      system: `你是一个专业、友好的电商客服助手，名字叫小智。
请始终用简体中文回答，回答要简洁明了，绝对不要重复自己说过的话。
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
