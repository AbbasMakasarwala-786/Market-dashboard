"use client";
import { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { STOCK_LIST } from '@/lib/constants';

interface HistoricalDataPoint {
  timestamp: Date;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface PredictionDataPoint {
  timestamp: Date;
  actual: number;
  predicted: number;
}

interface Stats {
  open: number;
  high: number;
  low: number;
  volume: number;
}

export default function StockPredictionChart() {
  const [symbol, setSymbol] = useState<string>('ADANIENT');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [recentPredictions, setRecentPredictions] = useState<PredictionDataPoint[]>([]);
  const [livePredictions, setLivePredictions] = useState<PredictionDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ open: 0, high: 0, low: 0, volume: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadStockData(symbol);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol]);

  useEffect(() => {
    if (plotRef.current && (historicalData.length > 0 || recentPredictions.length > 0 || livePredictions.length > 0)) {
      updateChart();
    }
  }, [historicalData, recentPredictions, livePredictions]);

  const loadStockData = async (stockSymbol: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch historical data
      await fetchHistoricalData(stockSymbol);
      
      // Fetch recent predictions (last 15 minutes)
      await fetchRecentPredictions(stockSymbol);
      
      // Connect to WebSocket for live updates
      connectWebSocket(stockSymbol);
    } catch (err) {
      console.error('Error loading stock data:', err);
      setError('Failed to load stock data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async (stockSymbol: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/historical/${stockSymbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data && result.data.length > 0) {
        // Take last 60 data points (approximately last hour for 1-minute data)
        const lastHourData: HistoricalDataPoint[] = result.data.slice(-60).map((item: any) => ({
          timestamp: new Date(item.timestamp),
          price: item.close,
          open: item.open,
          high: item.high,
          low: item.low,
          volume: item.volume
        }));
        
        setHistoricalData(lastHourData);
        
        // Set initial stats from last data point
        if (lastHourData.length > 0) {
          const latest = lastHourData[lastHourData.length - 1];
          setCurrentPrice(latest.price);
          setStats({
            open: latest.open,
            high: latest.high,
            low: latest.low,
            volume: latest.volume
          });
        }
      } else {
        throw new Error('No data available for this symbol');
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  };

  const fetchRecentPredictions = async (stockSymbol: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/recent-predictions/${stockSymbol}?minutes=15`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.predictions && result.predictions.length > 0) {
        const predictions: PredictionDataPoint[] = result.predictions.map((item: any) => ({
          timestamp: new Date(item.timestamp),
          actual: item.actual_price,
          predicted: item.predicted_price
        }));
        
        setRecentPredictions(predictions);
        
        // Update current and predicted price from latest prediction
        const latest = predictions[predictions.length - 1];
        setCurrentPrice(latest.actual);
        setPredictedPrice(latest.predicted);
        
        // Get stats from the original result
        const latestItem = result.predictions[result.predictions.length - 1];
        setStats({
          open: latestItem.open,
          high: latestItem.high,
          low: latestItem.low,
          volume: latestItem.volume
        });
      }
    } catch (error) {
      console.error('Error fetching recent predictions:', error);
      // Don't throw here - recent predictions are optional
    }
  };

  const updateChart = () => {
    if (!plotRef.current) return;

    const traces: any[] = [];

    // Historical data trace (blue)
    if (historicalData.length > 0) {
      traces.push({
        x: historicalData.map(d => d.timestamp),
        y: historicalData.map(d => d.price),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Historical Price',
        line: { color: '#3b82f6', width: 2 },
        marker: { size: 5 }
      });
    }

    // Recent predictions - actual prices (green)
    if (recentPredictions.length > 0) {
      traces.push({
        x: recentPredictions.map(d => d.timestamp),
        y: recentPredictions.map(d => d.actual),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Actual Price (Recent)',
        line: { color: '#10b981', width: 2 },
        marker: { size: 6 }
      });
    }

    // Recent predictions - predicted prices (orange dashed)
    if (recentPredictions.length > 0) {
      traces.push({
        x: recentPredictions.map(d => d.timestamp),
        y: recentPredictions.map(d => d.predicted),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Predicted Price (Recent)',
        line: { color: '#f97316', width: 2, dash: 'dash' },
        marker: { size: 6, symbol: 'diamond' }
      });
    }

    // Live predictions (red bold)
    if (livePredictions.length > 0) {
      traces.push({
        x: livePredictions.map(d => d.timestamp),
        y: livePredictions.map(d => d.actual),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Actual Price (Live)',
        line: { color: '#ef4444', width: 2 },
        marker: { size: 7 }
      });

      traces.push({
        x: livePredictions.map(d => d.timestamp),
        y: livePredictions.map(d => d.predicted),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Predicted Price (Live)',
        line: { color: '#dc2626', width: 3, dash: 'dash' },
        marker: { size: 8, symbol: 'diamond' }
      });
    }

    const layout: any = {
      title: {
        text: `${symbol} - Price Analysis & Live Prediction`,
        font: { size: 24, color: '#1f2937' }
      },
      xaxis: {
        title: 'Time',
        gridcolor: '#e5e7eb',
        showgrid: true
      },
      yaxis: {
        title: 'Price (₹)',
        gridcolor: '#e5e7eb',
        showgrid: true
      },
      plot_bgcolor: '#f9fafb',
      paper_bgcolor: '#ffffff',
      hovermode: 'x unified',
      showlegend: true,
      legend: {
        x: 0.01,
        y: 0.99,
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        bordercolor: '#e5e7eb',
        borderwidth: 1
      },
      margin: { l: 60, r: 40, t: 80, b: 60 },
      autosize: true
    };

    const config: any = { responsive: true };

    Plotly.react(plotRef.current, traces, layout, config);
  };

  const connectWebSocket = (stockSymbol: string) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Clear live predictions when connecting to new symbol
    setLivePredictions([]);

    const ws = new WebSocket(`ws://localhost:8000/ws/predict/${stockSymbol}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        console.log('Received:', newData);

        setCurrentPrice(newData.actual_price);
        setPredictedPrice(newData.predicted_price);
        setStats({
          open: newData.open,
          high: newData.high,
          low: newData.low,
          volume: newData.volume
        });

        // Add to live predictions array
        setLivePredictions(prevData => {
          const updated: PredictionDataPoint[] = [...prevData, {
            timestamp: new Date(newData.timestamp),
            actual: newData.actual_price,
            predicted: newData.predicted_price
          }];
          
          // Keep only last 30 live predictions
          return updated.slice(-30);
        });
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setError('WebSocket connection error. Retrying...');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket Disconnected');
    };

    wsRef.current = ws;
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSymbol = e.target.value;
    if (newSymbol && STOCK_LIST.includes(newSymbol)) {
      setHistoricalData([]);
      setRecentPredictions([]);
      setLivePredictions([]);
      setError(null);
      setSymbol(newSymbol);
    }
  };

  const priceChange = currentPrice && predictedPrice 
    ? ((predictedPrice - currentPrice) / currentPrice * 100).toFixed(2)
    : '0';

  const priceChangeNum = parseFloat(priceChange);

  return (
    <div className="min-h-screen bg-gradient-to-br p-8 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              Stock Price Prediction Dashboard
            </h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm font-medium text-gray-600">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Stock Symbol Dropdown */}
          <div className="flex gap-3">
            <select
              value={symbol}
              onChange={handleSymbolChange}
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {STOCK_LIST.map((stock) => (
                <option key={stock} value={stock}>
                  {stock}
                </option>
              ))}
            </select>
            <div className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold flex items-center">
              {loading ? 'Loading...' : `${symbol}.NS`}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-gray-800">
              ₹{currentPrice !== null ? currentPrice.toFixed(2) : '--'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Predicted Price</p>
            <p className="text-2xl font-bold text-orange-600">
             ₹{predictedPrice !== null ? predictedPrice.toFixed(2) : '--'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Change %</p>
            <p className={`text-2xl font-bold ${priceChangeNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChangeNum >= 0 ? '+' : ''}{priceChange}%
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">High / Low</p>
            <p className="text-lg font-bold text-gray-800">
              ₹{stats.high.toFixed(2)} / ₹{stats.low.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Volume</p>
            <p className="text-lg font-bold text-gray-800">
              {(stats.volume / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg">Loading stock data...</p>
              </div>
            </div>
          ) : historicalData.length > 0 || recentPredictions.length > 0 || livePredictions.length > 0 ? (
            <div ref={plotRef} style={{ width: '100%', height: '500px' }} />
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">No data available for {symbol}</p>
                <p className="text-sm mt-2">Try selecting a different stock</p>
              </div>
            </div>
          )}
        </div>

        {/* Data Info */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {historicalData.length > 0 && (
            <p>
              Showing {historicalData.length} historical points
              {recentPredictions.length > 0 && `, ${recentPredictions.length} recent predictions`}
              {livePredictions.length > 0 && `, ${livePredictions.length} live predictions`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}