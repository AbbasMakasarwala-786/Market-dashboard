"use client";
import { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function StockPredictionChart() {
  const [symbol, setSymbol] = useState('ADANIENT.NS');
  const [inputSymbol, setInputSymbol] = useState('ADANIENT.NS');
  const [isConnected, setIsConnected] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [predictedData, setPredictedData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [stats, setStats] = useState({ open: 0, high: 0, low: 0, volume: 0 });
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const plotRef = useRef(null);

  useEffect(() => {
    fetchHistoricalData(symbol);
    connectWebSocket(symbol);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol]);

  useEffect(() => {
    if (plotRef.current && (historicalData.length > 0 || predictedData.length > 0)) {
      updateChart();
    }
  }, [historicalData, predictedData]);

  const fetchHistoricalData = async (stockSymbol) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/historical/${stockSymbol}`);
      const result = await response.json();
      
      if (result.data) {
        // Take last 60 data points (approximately last hour for 1-minute data)
        const lastHourData = result.data.slice(-60).map(item => ({
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
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateChart = () => {
    const traces = [];

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

    // Predicted data trace (red/orange)
    if (predictedData.length > 0) {
      traces.push({
        x: predictedData.map(d => d.timestamp),
        y: predictedData.map(d => d.predicted),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Predicted Price',
        line: { color: '#f97316', width: 3, dash: 'dash' },
        marker: { size: 7, symbol: 'diamond' }
      });
    }

    const layout = {
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
        title: 'Price ($)',
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

    const config = { responsive: true };

    Plotly.react(plotRef.current, traces, layout, config);
  };

  const connectWebSocket = (stockSymbol) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/predict/${stockSymbol}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
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

      // Add to predicted data array
      setPredictedData(prevData => {
        const updated = [...prevData, {
          timestamp: new Date(newData.timestamp),
          actual: newData.actual_price,
          predicted: newData.predicted_price
        }];
        
        // Keep only last 30 predicted points
        return updated.slice(-30);
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket Disconnected');
    };

    wsRef.current = ws;
  };

  const handleSymbolChange = () => {
    setHistoricalData([]);
    setPredictedData([]);
    setSymbol(inputSymbol.toUpperCase());
  };

  const priceChange = currentPrice && predictedPrice 
    ? ((predictedPrice - currentPrice) / currentPrice * 100).toFixed(2)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br p-8 bg:black">
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

          {/* Symbol Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleSymbolChange()}
              placeholder="Enter stock symbol (e.g., ADANIENT.NS)"
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800"
            />
            <button
              onClick={handleSymbolChange}
              disabled={loading}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-black transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Load Symbol'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-gray-800">
              ${currentPrice ? currentPrice.toFixed(2) : '--'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Predicted Price</p>
            <p className="text-2xl font-bold text-orange-600">
              ${predictedPrice ? predictedPrice.toFixed(2) : '--'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Change %</p>
            <p className={`text-2xl font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange}%
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">High / Low</p>
            <p className="text-lg font-bold text-gray-800">
              ${stats.high.toFixed(2)} / ${stats.low.toFixed(2)}
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
                <p className="text-lg">Loading historical data...</p>
              </div>
            </div>
          ) : historicalData.length > 0 || predictedData.length > 0 ? (
            <div ref={plotRef} style={{ width: '100%', height: '500px' }} />
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">No data available for {symbol}</p>
                <p className="text-sm mt-2">Try a different symbol</p>
              </div>
            </div>
          )}
        </div>

        {/* Data Info */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {historicalData.length > 0 && (
            <p>
              Showing {historicalData.length} historical points
              {predictedData.length > 0 && ` and ${predictedData.length} live predictions`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}