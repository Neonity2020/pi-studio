import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  MessageSquare,
  Cpu,
  FolderTree,
  Activity,
  Search,
  Check,
  ChevronDown,
  X,
} from 'lucide-react';
import type { SessionSummary, ModelInfo } from '../types.ts';

interface SidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string;
  onSelectSession: (id: string, sessionPath?: string) => void;
  onCreateSession: () => void;
  models: ModelInfo[];
  selectedModelId: string;
  selectedProvider?: string;
  onChangeModel: (modelId: string, provider?: string) => void;
  workspaceDir: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  models,
  selectedModelId,
  selectedProvider,
  onChangeModel,
  workspaceDir,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus input on dropdown open
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isDropdownOpen]);

  // Filtered models grouped by provider
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const map: Record<string, ModelInfo[]> = {};

    for (const m of models) {
      if (
        !query ||
        m.id.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query)
      ) {
        const p = m.provider || 'other';
        if (!map[p]) map[p] = [];
        map[p].push(m);
      }
    }
    return map;
  }, [models, searchQuery]);

  const currentModel = models.find(
    (m) => m.id === selectedModelId && (!selectedProvider || m.provider === selectedProvider)
  ) || models.find((m) => m.id === selectedModelId);

  return (
    <aside className="w-72 bg-neutral-950 border-r border-neutral-850 flex flex-col h-screen select-none relative z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <svg className="w-5 h-5" viewBox="0 0 800 800" fill="currentColor">
              <path fillRule="evenodd" d="M165.29 165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65 282.65V400H400V282.65Z" />
              <path d="M517.36 400H634.72V634.72H517.36Z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide text-neutral-100 flex items-center gap-1.5">
              <span>Pi 工作台</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                Agent
              </span>
            </div>
            <div className="text-[11px] text-neutral-500">pi.dev 智能体运行引擎</div>
          </div>
        </div>
      </div>

      {/* New Session Button */}
      <div className="p-3">
        <button
          onClick={onCreateSession}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>新建对话</span>
        </button>
      </div>

      {/* Model Selector Card with Live Search */}
      <div className="px-3 pb-3 relative" ref={dropdownRef}>
        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>当前模型</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">{models.length} 可选</span>
          </div>

          {/* Custom Trigger Button */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <span className="truncate font-mono text-[11px]">
              {currentModel ? `${currentModel.provider} / ${currentModel.id}` : selectedModelId || '选择模型'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 shrink-0 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Searchable Dropdown Popup */}
        {isDropdownOpen && (
          <div className="absolute left-3 right-3 top-full mt-1.5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input Bar */}
            <div className="p-2 border-b border-neutral-800 bg-neutral-950/80 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索模型或提供商..."
                className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Grouped Model List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
              {Object.keys(filteredGroups).length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  未匹配到模型
                </div>
              ) : (
                Object.entries(filteredGroups).map(([provider, providerModels]) => (
                  <div key={provider}>
                    <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400/80 bg-neutral-950/40 rounded">
                      {provider} ({providerModels.length})
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {providerModels.map((m) => {
                        const isSelected = m.id === selectedModelId && m.provider === currentModel?.provider;
                        return (
                          <button
                            key={`${m.provider}/${m.id}`}
                            onClick={() => {
                              onChangeModel(m.id, m.provider);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 border border-transparent'
                            }`}
                          >
                            <span className="truncate">{m.id}</span>
                            {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Session History List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-2 py-1 flex items-center justify-between">
          <span>历史会话</span>
          <span className="text-[10px] font-mono text-neutral-600">{sessions.length}</span>
        </div>

        {sessions.map((s) => {
          const isActive = s.id === activeSessionId;
          return (
            <button
              key={s.id}
              onClick={() => onSelectSession(s.id, s.sessionPath)}
              className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 cursor-pointer border ${
                isActive
                  ? 'bg-neutral-900 text-neutral-100 border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border-transparent'
              }`}
            >
              <div className="pt-0.5 shrink-0">
                {s.isStreaming ? (
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{s.title || '新对话'}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 font-mono">
                  <span>{s.messageCount} 条消息</span>
                  <span>•</span>
                  <span>{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Workspace Footer */}
      <div className="p-3 border-t border-neutral-900 bg-neutral-950/80">
        <div className="flex items-center gap-2 text-neutral-400 text-xs">
          <FolderTree className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="font-mono text-[11px] truncate text-neutral-400" title={workspaceDir}>
            {workspaceDir.split('/').slice(-2).join('/') || '/workspace'}
          </span>
        </div>
      </div>
    </aside>
  );
};
