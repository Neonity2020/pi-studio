import React, { useState } from 'react';
import {
  X,
  Key,
  Globe,
  Sliders,
  Save,
  CheckCircle2,
  Terminal,
  Shield,
} from 'lucide-react';
import type { ModelInfo } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  baseUrl: string;
  onSaveBaseUrl: (url: string) => void;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  models: ModelInfo[];
  currentModelId: string;
  onChangeModel: (id: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  baseUrl,
  onSaveBaseUrl,
  systemPrompt,
  onSaveSystemPrompt,
  models,
  currentModelId,
  onChangeModel,
}) => {
  const [localKey, setLocalKey] = useState(apiKey);
  const [localUrl, setLocalUrl] = useState(baseUrl);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(localKey);
    onSaveBaseUrl(localUrl);
    onSaveSystemPrompt(localPrompt);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold text-sm">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Pi 智能体全局设置</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          <div>
            <label className="flex items-center gap-1.5 font-medium text-neutral-300 mb-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>模型服务商 API 密钥</span>
            </label>
            <input
              type="password"
              placeholder="sk-...（默认直接使用本机 Pi 已配置密钥）"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              支持直接读取本机 `~/.pi/agent/auth.json` 与环境变量配置。
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-medium text-neutral-300 mb-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>自定义 API 接口地址 (Base URL)</span>
            </label>
            <input
              type="text"
              placeholder="例如：https://api.openai.com/v1"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-medium text-neutral-300 mb-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>系统提示词 (System Prompt)</span>
            </label>
            <textarea
              rows={4}
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 focus:outline-none focus:border-cyan-500 text-xs font-mono leading-relaxed"
            />
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-start gap-2.5 text-neutral-400">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              当前工作区沙箱保护已启用。内置执行工具：<code className="text-cyan-300">read (读)</code>、<code className="text-cyan-300">bash (终端)</code>、<code className="text-cyan-300">edit (改)</code>、<code className="text-cyan-300">write (写)</code>。
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-2 bg-neutral-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 text-xs font-medium cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold text-xs transition-all shadow-md cursor-pointer"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>已保存</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>保存修改</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
