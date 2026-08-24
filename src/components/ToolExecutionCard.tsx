import React, { useState } from 'react';
import { Terminal, Check, Copy, ChevronDown, ChevronRight, Wrench } from 'lucide-react';

interface ToolExecutionCardProps {
  name: string;
  args: Record<string, any>;
  result?: any;
  isExecuting?: boolean;
  isError?: boolean;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  name,
  args,
  result,
  isExecuting = false,
  isError = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getResultContent = () => {
    if (!result) return null;
    if (Array.isArray(result)) {
      return result.map((c) => (typeof c === 'string' ? c : c.text || JSON.stringify(c, null, 2))).join('\n');
    }
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  };

  const rawResult = getResultContent();

  return (
    <div className="my-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur overflow-hidden transition-all duration-200 shadow-sm">
      <div
        className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900/90 cursor-pointer hover:bg-neutral-800/60 select-none border-b border-neutral-800/60"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-semibold text-neutral-200">
            工具调用::{name}
          </span>
          {isExecuting && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              执行中
            </span>
          )}
          {!isExecuting && !isError && result !== undefined && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              已完成
            </span>
          )}
          {isError && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
              失败
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-neutral-400">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-3.5 space-y-3 font-mono text-xs">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
              调用参数
            </div>
            <pre className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800/80 text-cyan-300/90 overflow-x-auto select-text">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {rawResult && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                  执行输出
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(rawResult);
                  }}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? '已复制' : '复制结果'}
                </button>
              </div>
              <pre
                className={`p-2.5 rounded-lg border max-h-60 overflow-y-auto select-text ${
                  isError
                    ? 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                    : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-300'
                }`}
              >
                {rawResult}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
