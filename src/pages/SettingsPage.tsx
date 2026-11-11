import React, { useState } from 'react';
import { Settings, Shield, Key, Bot, User, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  const [provider, setProvider] = useState<'none' | 'gemini' | 'openai' | 'ollama'>('none');
  const [apiKey, setApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveAI = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('pref_llm_provider', provider);
    if (apiKey) localStorage.setItem('pref_api_key', apiKey);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <Settings className="w-5 h-5 mr-2 text-indigo-600" />
          Platform Settings
        </h2>
        <p className="text-xs text-slate-500">
          Configure artificial intelligence providers, API connectivity, and user profile preferences.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configuration preferences updated successfully!</span>
        </div>
      )}

      {/* AI LLM Provider Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI / LLM Integration Layer</h3>
            <p className="text-xs text-slate-500">
              The platform executes statistical profiling, DuckDB analytics, and ML modeling with zero external dependencies.
              Optional LLM providers can be configured below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAI} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-2">Select Active Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'none', label: 'Deterministic Engine', sub: 'Zero external API key required' },
                { id: 'gemini', label: 'Google Gemini', sub: 'Gemini 1.5 Flash API' },
                { id: 'openai', label: 'OpenAI', sub: 'GPT-4o Mini API' },
                { id: 'ollama', label: 'Local Ollama', sub: 'Self-hosted LLM on localhost' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    provider === p.id
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {(provider === 'gemini' || provider === 'openai') && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter your API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Keys are never hardcoded and are transmitted securely for analytical question planning.
              </p>
            </div>
          )}

          {provider === 'ollama' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ollama Base URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ollama Model</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save AI Provider Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">User Profile & Access Control</h3>
            <p className="text-xs text-slate-500">Authentication identity and role-based permissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{user?.full_name || 'Sarah Connor'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{user?.email || 'demo@platform.ai'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400">Role & Tier</span>
            <div className="font-bold text-indigo-600 text-sm mt-0.5 capitalize">{user?.role || 'Admin'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

