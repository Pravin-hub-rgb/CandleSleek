import React, { useState, useRef } from 'react'
import UploadScreen from './UploadScreen'
import ChartCanvas from './ChartCanvas'

export default function CandlestickChart() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverData, setHoverData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [chartState, setChartState] = useState({
    offsetX: 0,
    scale: 1,
    priceScale: 1,
    isDragging: false,
    startX: 0,
    startOffsetX: 0,
  })
  const fileInputRef = useRef(null)

  // === CSV PARSING ===
  const parseCSV = text => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) throw new Error('CSV file is empty or invalid')
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    const required = ['timestamp', 'open', 'high', 'low', 'close']
    
    for (const h of required) {
      if (!headers.includes(h)) throw new Error(`Missing column: ${h}`)
    }
    
    const out = []
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',')
      if (vals.length < 5) continue
      
      const timestamp = vals[headers.indexOf('timestamp')].trim()
      const open = parseFloat(vals[headers.indexOf('open')])
      const high = parseFloat(vals[headers.indexOf('high')])
      const low = parseFloat(vals[headers.indexOf('low')])
      const close = parseFloat(vals[headers.indexOf('close')])
      
      if ([open, high, low, close].some(isNaN)) continue
      
      // Extract time in H:MM format from timestamp (remove leading zero from hour)
      let time = timestamp;
      // Match either '2025-11-21 09:15:00+05:30' or '09:15:00' format
      const timeMatch = timestamp.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        // Remove leading zero from hour if present
        const hour = timeMatch[1].startsWith('0') ? timeMatch[1].substring(1) : timeMatch[1];
        time = `${hour}:${timeMatch[2]}`;
      }
      
      out.push({ time, open, high, low, close, timestamp })
    }
    
    if (!out.length) throw new Error('No valid rows')
    return out.reverse()
  }

  const handleFile = file => {
    console.log('Handling file:', file?.name);
    if (!file) {
      console.log('No file provided');
      return;
    }
    if (!file.name.endsWith('.csv')) {
      console.log('Not a CSV file');
      return setError('Please upload a CSV file');
    }
    
    console.log('Setting filename to:', file.name);
    setFileName(file.name)
    
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target.result)
        setData(parsed)
        setError(null)
        setChartState({ offsetX: 0, scale: 1, priceScale: 1, isDragging: false, startX: 0, startOffsetX: 0 })
      } catch (err) {
        setError(err.message)
      }
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }

  const handleDrop = e => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = e => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)
  
  const handleClick = () => fileInputRef.current?.click()
  
  const handleFileChange = e => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const handleReset = () => {
    setData(null)
    setError(null)
    setHoverData(null)
    setFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!data) {
    return (
      <div className="h-full">
        <UploadScreen
          isDragging={isDragging}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          error={error}
        />
      </div>
    )
  }

  return (
    <div className="h-full relative">
      {fileName && (
        <div 
          className="absolute left-4 top-4 text-gray-200 text-sm font-mono px-3 py-1 rounded z-10"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          {fileName}
        </div>
      )}
      <div className="h-full">
        <ChartCanvas
          data={data}
          chartState={chartState}
          hoverData={hoverData}
          setHoverData={setHoverData}
          setChartState={setChartState}
          onReset={handleReset}
        />
      </div>
    </div>
  )
}