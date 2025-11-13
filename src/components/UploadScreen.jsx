import React from 'react'
import { Upload, FileText } from 'lucide-react'

export default function UploadScreen({
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  fileInputRef,
  onFileChange,
  error,
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-16 px-6">
      {/* Header */}
      <header className="w-full max-w-2xl text-center">
        <h1 className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-6xl">
          CandleSleek
        </h1>
        <p className="mt-4 text-base text-gray-400 md:text-lg">
          Upload your CSV to visualize candlestick charts
        </p>
      </header>

      {/* Drop zone */}
      <section className="w-full max-w-xl">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={onClick}
          className={`
            group relative flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
            cursor-pointer transition-all duration-200
            ${isDragging
              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02]'
              : 'border-gray-700 bg-gray-900/50 hover:border-cyan-500/50 hover:bg-gray-800/50'
            }
          `}
        >
          <div className={`rounded-full p-4 transition-colors ${isDragging ? 'bg-cyan-500/20' : 'bg-gray-800 group-hover:bg-gray-700'}`}>
            <Upload size={40} className={`transition-colors ${isDragging ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-400'}`} />
          </div>
          
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-200">
              {isDragging ? 'Drop it here' : 'Drop your CSV file'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              or <span className="font-medium text-cyan-400">click to browse</span>
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-800/80 px-3 py-1.5">
            <FileText size={14} className="text-cyan-400" />
            <code className="text-xs font-mono text-gray-400">
              timestamp, open, high, low, close
            </code>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileChange} className="hidden" />
      </section>

      {/* CSV format example */}
      <section className="w-full max-w-2xl">
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1 w-1 rounded-full bg-cyan-400"></div>
            <h2 className="text-sm font-semibold text-gray-300">CSV Format</h2>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs font-mono text-green-400">
{`timestamp,open,high,low,close
2025-11-13T15:29:00+05:30,133.65,134.75,131.95,133.25
2025-11-13T15:28:00+05:30,132.30,133.80,131.00,133.25`}
          </pre>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="w-full max-w-xl rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}