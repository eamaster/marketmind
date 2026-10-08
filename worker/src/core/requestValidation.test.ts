import { describe, expect, it } from 'vitest';
import { AiRequestValidationError, validateAiAnalyzeRequest } from './requestValidation';

const valid = {
    assetType: 'stock',
    symbol: 'AAPL',
    timeframe: '7D',
    chartData: [
        { timestamp: '2026-01-01T00:00:00.000Z', close: 100 },
        { timestamp: '2026-01-02T00:00:00.000Z', close: 105 },
    ],
    news: [
        {
            id: 'n1',
            title: 'News',
            url: 'https://example.com',
            snippet: 's',
            publishedAt: '2026-01-02T00:00:00.000Z',
            source: 'Wire',
        },
    ],
    question: 'What is the trend?',
};

describe('validateAiAnalyzeRequest', () => {
    it('accepts a valid frontend-shaped payload', () => {
        const parsed = validateAiAnalyzeRequest(valid);
        expect(parsed.question).toBe('What is the trend?');
        expect(parsed.chartData).toHaveLength(2);
    });

    it('rejects non-objects and invalid enums', () => {
        expect(() => validateAiAnalyzeRequest(null)).toThrow(AiRequestValidationError);
        expect(() => validateAiAnalyzeRequest({ ...valid, assetType: 'forex' })).toThrow(
            /assetType/
        );
        expect(() => validateAiAnalyzeRequest({ ...valid, timeframe: '1D' })).toThrow(/timeframe/);
    });

    it('rejects non-finite or non-positive closes', () => {
        expect(() =>
            validateAiAnalyzeRequest({
                ...valid,
                chartData: [{ timestamp: 't', close: 0 }],
            })
        ).toThrow(/> 0/);
        expect(() =>
            validateAiAnalyzeRequest({
                ...valid,
                chartData: [{ timestamp: 't', close: Number.NaN }],
            })
        ).toThrow(/finite/);
    });

    it('rejects oversized question/arrays', () => {
        expect(() =>
            validateAiAnalyzeRequest({ ...valid, question: 'x'.repeat(501) })
        ).toThrow(/at most 500/);
        expect(() =>
            validateAiAnalyzeRequest({
                ...valid,
                chartData: Array.from({ length: 1001 }, (_, i) => ({
                    timestamp: `t${i}`,
                    close: 1,
                })),
            })
        ).toThrow(/1000/);
    });
});
