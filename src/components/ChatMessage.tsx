import React, { useMemo } from 'react';
import { marked } from 'marked';
import {
  Sparkles,
  User,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Brain,
} from 'lucide-react';
import type { Message } from '../types.ts';
import { ToolExecutionCard } from './ToolExecutionCard.tsx';

interface ChatMessageProps {
  message: Message;
  toolResultsMap?: Record<string, any>;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  toolResultsMap = {},
}) => {
  const [copied, setCopied] = React.useState(false);

  const isUser = message.role === 'user';
  const isTool = message.role === 'toolResult';

  if (isTool) {
    return null;
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const parseMarkdown = (content: string) => {
    try {
      return marked.parse(content, { breaks: true, gfm: true }) as string;
    } catch {
      return content;
    }
  };

  const renderContent = () => {
    if (typeof message.content === 'string') {
      const html = parseMarkdown(message.content);
      return (
        <div
          className="markdown-body select-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    if (!Array.isArray(message.content)) {
      return null;
    }

    return (
      <div className="space-y-2.5">
        {message.content.map((block, idx) => {
          if (block.type === 'thinking') {
            return (
              <details
                key={idx}
                className="group/think my-2 rounded-xl bg-neutral-900/40 border border-neutral-800/60 overflow-hidden text-xs"
              >
                <summary className="px-3 py-1.5 flex items-center gap-2 text-neutral-400 hover:text-neutral-200 cursor-pointer select-none font-mono text-[11px]">
                  <Brain className="w-3.5 h-3.5 text-cyan-400" />
                  <span>深度思考过程</span>
                </summary>
                <div className="p-3 bg-neutral-950/60 border-t border-neutral-800/40 text-neutral-400 font-mono whitespace-pre-wrap text-[11px] leading-relaxed">
                  {block.thinking}
                </div>
              </details>
            );
          }

          if (block.type === 'text') {
            const html = parseMarkdown(block.text);
            return (
              <div
                key={idx}
                className="markdown-body select-text"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          if (block.type === 'toolCall') {
            const toolResult = toolResultsMap[block.id];
            return (
              <ToolExecutionCard
                key={block.id || idx}
                name={block.name}
                args={block.arguments}
                result={toolResult?.content}
                isExecuting={!toolResult}
                isError={toolResult?.isError}
              />
            );
          }

          return null;
        })}
      </div>
    );
  };

  const rawFullText = () => {
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
      return message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
    }
    return '';
  };

  const textToCopy = rawFullText();

  return (
    <div
      className={`group relative flex gap-3.5 py-4 px-4 sm:px-6 transition-colors duration-150 ${
        isUser
          ? 'bg-neutral-900/30 border-l-2 border-cyan-500/80'
          : 'bg-neutral-950/40 border-l-2 border-transparent'
      }`}
    >
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shadow-sm">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950/50">
            <Sparkles className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-300">
              {isUser ? 'User' : message.model || 'Pi Agent'}
            </span>
            {message.timestamp && (
              <span className="text-[11px] text-neutral-500">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
            {message.usage && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                {message.usage.totalTokens} tok
              </span>
            )}
          </div>

          {textToCopy && (
            <button
              onClick={() => handleCopy(textToCopy)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-800"
              title="Copy text"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {renderContent()}

        {message.errorMessage && (
          <div className="mt-2.5 p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">执行异常</div>
              <div className="font-mono text-[11px] text-rose-400/90">
                {message.errorMessage}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
