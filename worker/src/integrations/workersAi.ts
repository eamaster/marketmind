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
    | 'throttle'
    | 'capacity'
    | 'invalid_output'
    | 'timeout';

export class AiProviderError extends Error {
    readonly category: AiErrorCategory;
    readonly statusHint: number;
    readonly providerCode?: number;

    constructor(
        message: string,
        category: AiErrorCategory,
        statusHint = 502,
        providerCode?: number
    ) {
        super(message);
        this.name = 'AiProviderError';
        this.category = category;
        this.statusHint = statusHint;
        this.providerCode = providerCode;
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
        reasoning?: string | null;
    } | null;
}

interface ChatCompletionResponse {
    id?: string;
    object?: string;
    model?: string;
    choices?: Array<ChatCompletionChoice | null>;
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

    const data = raw as ChatCompletionResponse;

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
    if (choice == null || typeof choice !== 'object') {
        throw new AiProviderError(
            'Workers AI choices[0] is missing or not an object',
            'invalid_output'
        );
    }

    const message = choice.message;
    if (message == null || typeof message !== 'object') {
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

    if (choice.finish_reason === 'tool_calls') {
        throw new AiProviderError(
            'Workers AI finished with tool_calls; tools are not enabled for this endpoint',
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
            'Workers AI output was truncated. Try a shorter question or raise AI_MAX_COMPLETION_TOKENS.',
            'invalid_output'
        );
    }

    // Only return final assistant content — never reasoning fields.
    return content.trim();
}

/** Extract documented Workers AI internal error codes from thrown errors. */
export function extractWorkersAiErrorCode(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
        const record = error as Record<string, unknown>;
        for (const key of ['code', 'internalCode', 'errorCode']) {
            const value = record[key];
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
        }
        if (Array.isArray(record.errors)) {
            for (const item of record.errors) {
                if (item && typeof item === 'object') {
                    const code = (item as Record<string, unknown>).code;
                    if (typeof code === 'number') return code;
                    if (typeof code === 'string' && /^\d+$/.test(code)) return Number(code);
                }
            }
        }
    }

    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/\b(300[3678]|3023|3036|3039|304[012]|500[457]|501[689]|5035)\b/);
    return match ? Number(match[1]) : undefined;
}

function classifyProviderFailure(error: unknown): AiProviderError {
    if (error instanceof AiProviderError) {
        return error;
    }
    if (error instanceof AiConfigError) {
        return new AiProviderError(error.message, 'config', 500);
    }

    const code = extractWorkersAiErrorCode(error);
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    // Documented Workers AI codes:
    // 3036 Account limited (daily free neurons) → 429
    // 3040 Out of capacity → 429
    // 3007/3008 Timeout/Aborted → 408
    // 5035 Model requires Workers Paid → 403
    if (code === 3036 || lower.includes('daily free allocation') || lower.includes('10,000 neurons')) {
        return new AiProviderError(
            'Workers AI daily free Neuron allocation is exhausted. Try again after the daily reset (00:00 UTC) or upgrade the Workers plan.',
            'quota',
            429,
            3036
        );
    }

    if (code === 3040 || lower.includes('out of capacity') || lower.includes('capacity temporarily exceeded')) {
        return new AiProviderError(
            'Workers AI is temporarily out of capacity. Please try again shortly.',
            'capacity',
            503,
            3040
        );
    }

    if (code === 3007 || code === 3008 || lower.includes('timed out') || lower.includes('timeout') || lower.includes('aborted')) {
        return new AiProviderError(
            'Workers AI request timed out. Please try again.',
            'timeout',
            504,
            code
        );
    }

    if (code === 5035 || lower.includes('requires a workers paid plan')) {
        return new AiProviderError(
            'Configured Workers AI model is not available on the current plan.',
            'config',
            500,
            5035
        );
    }

    if (code === 5007 || code === 3042 || lower.includes('no such model') || lower.includes('model name is invalid')) {
        return new AiProviderError(
            'Configured Workers AI model is invalid or unavailable.',
            'config',
            500,
            code
        );
    }

    // Generic HTTP 429 without account-allocation markers → request throttling
    if (/\b429\b/.test(message) || lower.includes('rate limit') || lower.includes('too many requests')) {
        return new AiProviderError(
            'Workers AI request was throttled. Please try again shortly.',
            'throttle',
            429,
            code
        );
    }

    return new AiProviderError(
        'Workers AI request failed. Please try again later.',
        'provider',
        502,
        code
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
        const raw = await ai.run(config.model as Parameters<Ai['run']>[0], {
            messages: [
                { role: 'system', content: ANALYST_SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            max_completion_tokens: config.maxCompletionTokens,
            temperature: config.temperature,
            chat_template_kwargs: {
                enable_thinking: config.enableThinking,
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
            `[WorkersAI] error category=${mapped.category}` +
                (mapped.providerCode != null ? ` code=${mapped.providerCode}` : '') +
                ` durationMs=${Date.now() - started}`
        );
        throw mapped;
    }
}
