import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { convertToModelMessages, streamText } from "ai";

export class OkAgent extends AIChatAgent<Env> {
  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      // 换回刚才能出字的 70B 模型
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        sessionAffinity: this.sessionAffinity
      }),
      temperature: 0.1,
      // ⭐️ 关键1：加频次惩罚，强迫它不准重复前面用过的词
      frequencyPenalty: 1.0, 
      // ⭐️ 关键2：限制采样范围，让它只选概率最高的词
      topP: 0.9,
      system: `你是一个电商客服助手，名字叫小智。
请注意：说话要极度精简，绝对绝对不要重复字词！直接说“你好”，不要说“你你好”。`,
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
