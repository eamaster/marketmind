import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { AssetDataResponse, PricePoint, AssetType, Timeframe } from '../services/types';

interface UseAssetDataParams {
    assetType: AssetType;
    symbol: string;
    timeframe: Timeframe;
}

type AssetDataApiResponse = AssetDataResponse & { isLive?: boolean };

export function useAssetData({ assetType, symbol, timeframe }: UseAssetDataParams) {
    const [data, setData] = useState<PricePoint[] | null>(null);
    const [metadata, setMetadata] = useState<AssetDataResponse['metadata'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isLive, setIsLive] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('Fetching asset data:', { assetType, symbol, timeframe });
            const response: AssetDataApiResponse = await apiClient.getAssetData({
                assetType,
                symbol,
                timeframe,
            });
            console.log('API response:', response);
            setData(response.data || []);
            setMetadata(response.metadata || null);
            setIsLive(response.isLive || false);
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
