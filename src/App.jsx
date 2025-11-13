import React, { useState, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';

export default function CandlestickChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverData, setHoverData] = useState(null);
  const [chartState, setChartState] = useState({
    offsetX: 0,
    scale: 1,
    priceScale: 1,
    isDragging: false,
    startX: 0,
    startOffsetX: 0
  });
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV file is empty or invalid');
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredHeaders = ['timestamp', 'open', 'high', 'low', 'close'];
    
    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new Error(`Missing required column: ${header}`);
      }
    }
    
    const candleData = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 5) continue;
      
      const timestamp = values[headers.indexOf('timestamp')].trim();
      const open = parseFloat(values[headers.indexOf('open')]);
      const high = parseFloat(values[headers.indexOf('high')]);
      const low = parseFloat(values[headers.indexOf('low')]);
      const close = parseFloat(values[headers.indexOf('close')]);
      
      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
        continue;
      }
      
      // Extract time from timestamp
      const timeMatch = timestamp.match(/T(\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : timestamp;
      
      candleData.push({ time, open, high, low, close, timestamp });
    }
    
    if (candleData.length === 0) {
      throw new Error('No valid data found in CSV');
    }
    
    return candleData.reverse(); // Reverse to show oldest first (left to right)
  };

  const handleFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        setData(parsed);
        setError(null);
        setChartState({ offsetX: 0, scale: 1, priceScale: 1, isDragging: false, startX: 0, startOffsetX: 0 });
      } catch (err) {
        setError(err.message);
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    
    const ctx = canvas.getContext('2d');
    
    // Get device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set display size (css pixels)
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Set actual size in memory (scaled for DPI)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to match DPI
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);
    
    const padding = { top: 60, right: 50, bottom: 50, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Find min/max prices
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    data.forEach(d => {
      minPrice = Math.min(minPrice, d.low);
      maxPrice = Math.max(maxPrice, d.high);
    });
    
    const priceRange = maxPrice - minPrice;
    const basePricePadding = priceRange * 0.1;
    const adjustedPadding = basePricePadding / chartState.priceScale;
    minPrice -= adjustedPadding;
    maxPrice += adjustedPadding;
    
    // Calculate candle width and spacing
    const totalCandles = data.length;
    const baseWidth = chartWidth / totalCandles;
    const candleWidth = Math.max(2, (baseWidth * chartState.scale * 0.7));
    const spacing = Math.max(3, (baseWidth * chartState.scale * 0.3));
    
    // Price to Y coordinate
    const priceToY = (price) => {
      return padding.top + chartHeight * (1 - (price - minPrice) / (maxPrice - minPrice));
    };
    
    // Draw grid lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Draw Y-axis labels (prices)
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const price = maxPrice - (maxPrice - minPrice) * (i / gridLines);
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.fillText(price.toFixed(2), padding.left - 10, y + 4);
    }
    
    // Draw candles
    let hoverIndex = -1;
    data.forEach((candle, i) => {
      const x = padding.left + chartState.offsetX + i * (candleWidth + spacing);
      
      // Skip if outside visible area
      if (x + candleWidth < padding.left || x > width - padding.right) return;
      
      const isBullish = candle.close >= candle.open;
      const color = isBullish ? '#26a69a' : '#ef5350';
      
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      
      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();
      
      // Draw body
      ctx.fillStyle = color;
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      ctx.fillRect(x, bodyY, candleWidth, Math.max(1, bodyHeight));
      
      // Check hover
      if (hoverData && Math.abs(hoverData.x - (x + candleWidth / 2)) < (candleWidth + spacing) / 2) {
        hoverIndex = i;
        
        // Draw crosshair
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, padding.top);
        ctx.lineTo(x + candleWidth / 2, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    
    // Draw X-axis labels (time)
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    const labelInterval = Math.max(1, Math.floor(totalCandles / 10));
    data.forEach((candle, i) => {
      if (i % labelInterval === 0) {
        const x = padding.left + chartState.offsetX + i * (candleWidth + spacing) + candleWidth / 2;
        if (x >= padding.left && x <= width - padding.right) {
          ctx.fillText(candle.time, x, height - padding.bottom + 20);
        }
      }
    });
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Draw horizontal crosshair and Y-axis price label at cursor position
    if (hoverData && hoverData.y >= padding.top && hoverData.y <= height - padding.bottom) {
      // Calculate price at cursor Y position
      const priceAtCursor = maxPrice - (hoverData.y - padding.top) / chartHeight * (maxPrice - minPrice);
      
      // Draw horizontal line
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, hoverData.y);
      ctx.lineTo(width - padding.right, hoverData.y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw Y-axis label background
      const labelWidth = 70;
      const labelHeight = 24;
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(padding.left - labelWidth - 5, hoverData.y - labelHeight / 2, labelWidth, labelHeight);
      
      // Draw Y-axis label text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(priceAtCursor.toFixed(2), padding.left - 10, hoverData.y + 4);
    }
    
    // Draw OHLC info if hovering
    if (hoverIndex >= 0 && hoverIndex < data.length) {
      const candle = data[hoverIndex];
      const isBullish = candle.close >= candle.open;
      
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(padding.left + 10, padding.top - 50, 350, 45);
      
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      
      const infos = [
        { label: 'O', value: candle.open, color: '#888' },
        { label: 'H', value: candle.high, color: '#888' },
        { label: 'L', value: candle.low, color: '#888' },
        { label: 'C', value: candle.close, color: isBullish ? '#26a69a' : '#ef5350' }
      ];
      
      let xPos = padding.left + 20;
      infos.forEach(info => {
        ctx.fillStyle = info.color;
        ctx.fillText(`${info.label}: ${info.value.toFixed(2)}`, xPos, padding.top - 25);
        xPos += 85;
      });
      
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.fillText(candle.timestamp, padding.left + 20, padding.top - 10);
    }
  };

  useEffect(() => {
    if (!data) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    drawChart();
    
    const handleResize = () => {
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, chartState, hoverData]);

  const handleMouseDown = (e) => {
    if (!data) return;
    setChartState(prev => ({
      ...prev,
      isDragging: true,
      startX: e.clientX,
      startOffsetX: prev.offsetX
    }));
  };

  const handleMouseMove = (e) => {
    if (!data) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    setHoverData({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    
    if (chartState.isDragging) {
      const dx = e.clientX - chartState.startX;
      setChartState(prev => ({
        ...prev,
        offsetX: prev.startOffsetX + dx
      }));
    }
  };

  const handleMouseUp = () => {
    setChartState(prev => ({ ...prev, isDragging: false }));
  };

  const handleWheel = (e) => {
    if (!data) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    const padding = { top: 60, right: 50, bottom: 50, left: 80 };
    
    // Check if mouse is over Y-axis (price area)
    const isOverYAxis = mouseX < padding.left;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    if (isOverYAxis) {
      // Vertical zoom (price scale)
      setChartState(prev => ({
        ...prev,
        priceScale: Math.max(0.1, Math.min(10, prev.priceScale * delta))
      }));
    } else {
      // Horizontal zoom (time scale)
      setChartState(prev => ({
        ...prev,
        scale: Math.max(0.1, Math.min(10, prev.scale * delta))
      }));
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              w-96 h-64 border-4 border-dashed rounded-lg
              flex flex-col items-center justify-center cursor-pointer
              transition-all duration-200
              ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
            `}
          >
            <Upload size={64} className="text-gray-400 mb-4" />
            <p className="text-xl text-gray-300 mb-2">Drop CSV file here</p>
            <p className="text-sm text-gray-500">or click to browse</p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          cursor: 'move',
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      
      <button
        onClick={() => {
          setData(null);
          setError(null);
          setHoverData(null);
        }}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          padding: '10px 24px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          zIndex: 10
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
      >
        Load New
      </button>
    </div>
  );
}