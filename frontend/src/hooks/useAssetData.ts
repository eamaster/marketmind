import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { PricePoint, AssetType, Timeframe } from '../services/types';

interface UseAssetDataParams {
    assetType: AssetType;
    symbol: string;
    timeframe: Timeframe;
}

export function useAssetData({ assetType, symbol, timeframe }: UseAssetDataParams) {
    const [data, setData] = useState<PricePoint[] | null>(null);
    const [metadata, setMetadata] = useState<any>(null); // Store API response metadata
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isLive, setIsLive] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('Fetching asset data:', { assetType, symbol, timeframe });
            const response = await apiClient.getAssetData({ assetType, symbol, timeframe });
            console.log('API response:', response);
            setData(response.data || []);
            setMetadata(response.metadata || null); // Capture metadata
            setIsLive(response.isLive || false); // Store isLive flag from API
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch asset data'));
            setData(null);
            setIsLive(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetType, symbol, timeframe]);

    return {
        data,
        metadata, // Expose metadata (includes hasOhlc for crypto)
        isLoading,
        error,
        isLive,
        refetch: fetchData,
    };
}
