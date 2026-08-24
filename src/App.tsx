import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Square,
  Compass,
  ArrowDownToLine,
  RotateCcw,
  Settings,
  Sparkles,
  Layers,
  Terminal,
  Cpu,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatMessage } from './components/ChatMessage.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import type { SessionSummary, SessionDetail, ModelInfo, Message } from './types.ts';

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default-session');
  const [currentSession, setCurrentSession] = useState<SessionDetail | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Configuration state
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an intelligent coding agent powered by Pi SDK (@earendil-works/pi-agent-core). You have access to tools: read, bash, edit, write.',
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch models
  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch (e) {
      console.error('Failed to fetch models', e);
    }
  };

  // Fetch session list
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      console.error('Failed to fetch sessions', e);
    }
  };

  // Fetch single session detail
  const fetchSessionDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentSession(data);
      }
    } catch (e) {
      console.error('Failed to fetch session detail', e);
    }
  };

  useEffect(() => {
    fetchModels();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchSessionDetail(activeSessionId);
    }
  }, [activeSessionId]);

  // Connect SSE for active session
  useEffect(() => {
    if (!activeSessionId) return;

    const eventSource = new EventSource(`/api/sessions/${activeSessionId}/events`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        // Refresh session state on meaningful lifecycle events
        if (
          event.type === 'message_end' ||
          event.type === 'tool_execution_end' ||
          event.type === 'agent_end' ||
          event.type === 'agent_settled' ||
          event.type === 'agent_start' ||
          event.type === 'turn_end'
        ) {
          fetchSessionDetail(activeSessionId);
          fetchSessions();
        }
      } catch (err) {
        // Ping or malformed event
      }
    };

    return () => {
      eventSource.close();
    };
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.state.messages]);

  // Switch active session
  const handleSelectSession = async (id: string, sessionPath?: string) => {
    if (id === activeSessionId && currentSession) return;
    setActiveSessionId(id);
    setCurrentSession(null);

    if (sessionPath) {
      try {
        await fetch('/api/sessions/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionPath }),
        });
      } catch (err) {
        console.error('Failed to switch persistent session:', err);
      }
    }
    await fetchSessionDetail(id);
  };

  const handleCreateSession = async () => {
    try {
      const activeModel = models.find((m) => m.id === currentSession?.model?.id) || models[0];
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '新对话',
          modelId: activeModel?.id,
          provider: activeModel?.provider,
        }),
      });
      const data = await res.json();
      await fetchSessions();
      handleSelectSession(data.id);
    } catch (e) {
      console.error('Failed to create session', e);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || !activeSessionId) return;

    const promptText = inputPrompt;
    setInputPrompt('');

    // Optimistic user message append
    if (currentSession) {
      const optimisticMsg: Message = {
        role: 'user',
        content: [{ type: 'text', text: promptText }],
        timestamp: Date.now(),
      };
      setCurrentSession({
        ...currentSession,
        state: {
          ...currentSession.state,
          messages: [...currentSession.state.messages, optimisticMsg],
          isStreaming: true,
        },
      });
    }

    try {
      await fetch(`/api/sessions/${activeSessionId}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });
    } catch (err) {
      console.error('Prompt error', err);
    }
  };

  const handleSteer = async () => {
    if (!inputPrompt.trim() || !activeSessionId) return;
    const promptText = inputPrompt;
    setInputPrompt('');
    try {
      await fetch(`/api/sessions/${activeSessionId}/steer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });
    } catch (err) {
      console.error('Steer error', err);
    }
  };

  const handleFollowUp = async () => {
    if (!inputPrompt.trim() || !activeSessionId) return;
    const promptText = inputPrompt;
    setInputPrompt('');
    try {
      await fetch(`/api/sessions/${activeSessionId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });
    } catch (err) {
      console.error('Follow-up error', err);
    }
  };

  const handleAbort = async () => {
    if (!activeSessionId) return;
    try {
      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          state: {
            ...currentSession.state,
            isStreaming: false,
          },
        });
      }
      await fetch(`/api/sessions/${activeSessionId}/abort`, { method: 'POST' });
      await fetchSessionDetail(activeSessionId);
      await fetchSessions();
    } catch (err) {
      console.error('Abort error', err);
    }
  };

  const handleReset = async () => {
    if (!activeSessionId) return;
    try {
      await fetch(`/api/sessions/${activeSessionId}/reset`, { method: 'POST' });
      fetchSessionDetail(activeSessionId);
    } catch (err) {
      console.error('Reset error', err);
    }
  };

  const handleChangeModel = async (newModelId: string) => {
    if (!activeSessionId) return;
    const targetModel = models.find((m) => m.id === newModelId);
    try {
      await fetch(`/api/sessions/${activeSessionId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: newModelId,
          provider: targetModel?.provider,
        }),
      });
      fetchSessionDetail(activeSessionId);
    } catch (err) {
      console.error('Change model error', err);
    }
  };

  // Build tool results lookup map for rendered cards
  const buildToolResultsMap = (messages: Message[]) => {
    const map: Record<string, any> = {};
    for (const msg of messages) {
      if (msg.role === 'toolResult' && msg.toolCallId) {
        map[msg.toolCallId] = {
          content: msg.content,
          isError: msg.isError,
        };
      }
    }
    return map;
  };

  const toolResultsMap = currentSession ? buildToolResultsMap(currentSession.state.messages) : {};
  const isStreaming = currentSession?.state.isStreaming || false;

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        models={models}
        selectedModelId={currentSession?.model.id || models[0]?.id || ''}
        onChangeModel={handleChangeModel}
        workspaceDir={currentSession?.workspaceDir || '/workspace'}
      />

      {/* Main Agent Studio Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-neutral-950/40 relative">
        {/* Top Navbar */}
        <header className="h-14 border-b border-neutral-900 px-6 flex items-center justify-between bg-neutral-950/80 backdrop-blur z-10 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="font-semibold text-sm text-neutral-100 truncate">
              {currentSession?.title || 'Pi Agent Studio'}
            </div>
            {currentSession && (
              <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-cyan-400">
                <Cpu className="w-3 h-3" />
                {currentSession.model.name}
              </span>
            )}
            {isStreaming && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 animate-pulse font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                智能体运行中
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 text-xs font-medium transition-colors cursor-pointer border border-transparent hover:border-neutral-800"
              title="清空并重置当前对话记录"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">重置</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 text-xs font-medium transition-colors cursor-pointer border border-transparent hover:border-neutral-800"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">设置</span>
            </button>
          </div>
        </header>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-neutral-900/60 pb-52">
          {(!currentSession || currentSession.state.messages.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-950/40">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-neutral-100 mb-1">
                Pi 智能体工作台已就绪
              </h2>
              <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
                由本机 <code className="text-cyan-300">pi</code> 驱动的自主编码与系统任务 Agent。支持中途干预（Steer）、队列排队、工具自动执行及状态树追踪。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full text-left">
                {[
                  '检查当前目录中的所有文件与配置',
                  '运行自动化测试并排查代码错误',
                  '分析并重构后端代码结构',
                  '规划并实现一个全新的功能模块',
                ].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputPrompt(sample);
                      textareaRef.current?.focus();
                    }}
                    className="p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 transition-all cursor-pointer text-left"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentSession?.state.messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              message={msg}
              toolResultsMap={toolResultsMap}
            />
          ))}

          <div ref={messagesEndRef} className="h-6" />
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent backdrop-blur-sm">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Steering & Follow-up Action Hints */}
            {isStreaming && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300 animate-fadeIn">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Agent 正在执行 — 按 <strong>实时干预</strong> 立即引导，或按 <strong>队列排队</strong> 结束后执行</span>
                </div>
                <button
                  onClick={handleAbort}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-950/50 border border-rose-900 cursor-pointer"
                >
                  <Square className="w-3 h-3" />
                  <span>停止中断</span>
                </button>
              </div>
            )}

            {/* Input Box */}
            <div className="relative rounded-2xl bg-neutral-900 border border-neutral-800 focus-within:border-cyan-500/80 shadow-2xl transition-all">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (isStreaming) {
                      handleSteer();
                    } else {
                      handleSendMessage();
                    }
                  } else if (e.key === 'Enter' && (e.altKey || e.metaKey)) {
                    e.preventDefault();
                    handleFollowUp();
                  }
                }}
                placeholder={
                  isStreaming
                    ? '按 Enter 实时干预中断，按 Alt+Enter 放入后续队列...'
                    : '向 Pi Agent 提问或指派编码任务 (Enter 发送，Shift+Enter 换行)...'
                }
                rows={2}
                className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none"
              />

              {/* Action Buttons Row inside input */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px]">
                    {isStreaming ? 'Enter = 干预' : 'Enter = 发送'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px]">
                    Alt+Enter = 排队
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isStreaming ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSteer}
                        disabled={!inputPrompt.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                        title="在当前工具结束后立即干预并调整执行方向"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>干预 (Steer)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFollowUp}
                        disabled={!inputPrompt.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer border border-neutral-700"
                        title="等待当前回合全部完成后自动执行"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>排队 (Queue)</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim()}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-semibold disabled:opacity-30 transition-all cursor-pointer shadow-md shadow-cyan-950/50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>发送</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={setApiKey}
        baseUrl={baseUrl}
        onSaveBaseUrl={setBaseUrl}
        systemPrompt={systemPrompt}
        onSaveSystemPrompt={setSystemPrompt}
        models={models}
        currentModelId={currentSession?.model.id || ''}
        onChangeModel={handleChangeModel}
      />
    </div>
  );
}
