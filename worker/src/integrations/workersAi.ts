import type { Env, PricePoint, NewsArticle } from '../core/types';
import { AiConfigError, requireAiBinding, resolveAiConfig } from '../core/aiConfig';
import { ANALYST_SYSTEM_PROMPT } from '../core/promptBuilder';

interface AnalyzeInput {
    assetType: 'stock' | 'crypto' | 'metal';
    symbol?: string;
    timeframe: '7D' | '1M' | '3M' | '6M' | '1Y';
    chartData: PricePoint[];
    news: NewsArticle[];
    question: string;
}

export type AiErrorCategory =
    | 'config'
    | 'provider'
    | 'quota'
    | 'invalid_output'
    | 'timeout';

export class AiProviderError extends Error {
    readonly category: AiErrorCategory;
    readonly statusHint: number;

    constructor(message: string, category: AiErrorCategory, statusHint = 502) {
        super(message);
        this.name = 'AiProviderError';
        this.category = category;
        this.statusHint = statusHint;
    }
}

/** OpenAI-compatible chat completion envelope used by GLM-4.7-Flash on Workers AI. */
interface ChatCompletionChoice {
    index?: number;
    finish_reason?: string | null;
    message?: {
        role?: string;
        content?: string | null;
        tool_calls?: unknown[];
        reasoning_content?: string | null;
    };
}

interface ChatCompletionResponse {
    id?: string;
    object?: string;
    model?: string;
    choices?: ChatCompletionChoice[];
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

/**
 * Normalize a Workers AI / GLM chat-completion response into plain analyst text.
 * Does not assume Llama's top-level `response` field or Gemini candidates/parts.
 */
export function normalizeWorkersAiResponse(raw: unknown): string {
    if (raw == null || typeof raw !== 'object') {
        throw new AiProviderError(
            'Workers AI returned an empty or non-object response',
            'invalid_output'
        );
    }

    const data = raw as ChatCompletionResponse & { response?: unknown; result?: unknown };

    if (!Array.isArray(data.choices)) {
        throw new AiProviderError(
            'Workers AI response missing choices[] (expected chat-completion envelope)',
            'invalid_output'
        );
    }

    if (data.choices.length === 0) {
        throw new AiProviderError('Workers AI returned no choices', 'invalid_output');
    }

    const choice = data.choices[0];
    const message = choice.message;

    if (!message || typeof message !== 'object') {
        throw new AiProviderError(
            'Workers AI choice is missing message',
            'invalid_output'
        );
    }

    const toolCalls = message.tool_calls;
    const content = message.content;

    if (Array.isArray(toolCalls) && toolCalls.length > 0 && (content == null || content === '')) {
        throw new AiProviderError(
            'Workers AI returned tool calls without assistant content; tools are not enabled for this endpoint',
            'invalid_output'
        );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
        throw new AiProviderError(
            'Workers AI returned empty assistant content',
            'invalid_output'
        );
    }

    if (choice.finish_reason === 'length') {
        throw new AiProviderError(
            'Workers AI output was truncated (finish_reason=length). Try a shorter question or raise AI_MAX_COMPLETION_TOKENS.',
            'invalid_output'
        );
    }

    return content.trim();
}

function classifyProviderFailure(error: unknown): AiProviderError {
    if (error instanceof AiProviderError || error instanceof AiConfigError) {
        if (error instanceof AiConfigError) {
            return new AiProviderError(error.message, 'config', 500);
        }
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    if (
        lower.includes('3036') ||
        lower.includes('10,000 neurons') ||
        lower.includes('daily free allocation') ||
        lower.includes('quota') ||
        lower.includes('rate limit') ||
        lower.includes('429')
    ) {
        return new AiProviderError(
            'Workers AI quota or rate limit exceeded. Shared daily free Neurons may be exhausted; try again later or upgrade the Workers plan.',
            'quota',
            429
        );
    }

    if (lower.includes('3040') || lower.includes('out of capacity') || lower.includes('capacity')) {
        return new AiProviderError(
            'Workers AI is temporarily out of capacity. Please try again shortly.',
            'provider',
            503
        );
    }

    if (lower.includes('timeout') || lower.includes('timed out')) {
        return new AiProviderError(
            'Workers AI request timed out',
            'timeout',
            504
        );
    }

    return new AiProviderError(
        `Workers AI request failed: ${message}`,
        'provider',
        502
    );
}

/**
 * Analyze market context via the native Workers AI binding.
 * Application contract: returns analyst text (not a structured domain JSON object).
 */
export async function analyzeMarketContext(
    input: AnalyzeInput,
    prompt: string,
    env: Env
): Promise<string> {
    const config = resolveAiConfig(env);
    const ai = requireAiBinding(env);
    const started = Date.now();

    console.log(
        `[WorkersAI] model=${config.model} asset=${input.assetType} ${input.symbol || ''} ` +
            `chart=${input.chartData.length} news=${input.news.length} promptChars=${prompt.length}`
    );

    try {
        // Model id is validated in resolveAiConfig; cast needed because generated Ai
        // typings enumerate catalog models rather than accepting arbitrary @cf/ strings.
        const raw = await ai.run(config.model as Parameters<Ai['run']>[0], {
            messages: [
                { role: 'system', content: ANALYST_SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            max_completion_tokens: config.maxCompletionTokens,
            temperature: config.temperature,
            // Model supports reasoning; keep it off so analysis text stays user-facing.
            chat_template_kwargs: {
                enable_thinking: false,
            },
        });

        const answer = normalizeWorkersAiResponse(raw);
        const usage = (raw as ChatCompletionResponse).usage;
        const durationMs = Date.now() - started;

        console.log(
            `[WorkersAI] ok durationMs=${durationMs}` +
                (usage?.total_tokens != null ? ` totalTokens=${usage.total_tokens}` : '') +
                (usage?.prompt_tokens != null ? ` promptTokens=${usage.prompt_tokens}` : '') +
                (usage?.completion_tokens != null
                    ? ` completionTokens=${usage.completion_tokens}`
                    : '')
        );

        return answer;
    } catch (error) {
        const mapped = classifyProviderFailure(error);
        console.error(
            `[WorkersAI] error category=${mapped.category} durationMs=${Date.now() - started} message=${mapped.message}`
        );
        throw mapped;
    }
}
