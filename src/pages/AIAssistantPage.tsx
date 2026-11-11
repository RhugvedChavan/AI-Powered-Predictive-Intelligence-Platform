import React, { useEffect, useState, useRef } from 'react';
import {
  Bot, Send, Sparkles, Terminal, BarChart3, Database,
  CheckCircle2, Layers, MessageSquare, ChevronDown, ChevronRight, User as UserIcon
} from 'lucide-react';
import { datasetService, aiService } from '../services/api';
import { Dataset, ChatMessage, ChatSession } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { BarChartComponent } from '../charts/BarChartComponent';
import { LineChartComponent } from '../charts/LineChartComponent';
import { PieChartComponent } from '../charts/PieChartComponent';

const SUGGESTED_PROMPTS = [
  "What is the total revenue by Category?",
  "Which region generated the highest profit?",
  "Show historical sales trends over time.",
  "Identify unusual transactions and outliers.",
  "What is the average discount rate across categories?"
];

export const AIAssistantPage: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);

  // Expanded SQL toggles
  const [expandedSql, setExpandedSql] = useState<Record<string, boolean>>({});
  const [expandedTable, setExpandedTable] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const data = await datasetService.list();
      setDatasets(data);
      if (data.length > 0) {
        setSelectedDatasetId(data[0].id);
        loadChatHistory(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async (datasetId: string) => {
    try {
      const hist = await aiService.getHistory(datasetId);
      setSessions(hist);
      if (hist.length > 0) {
        setActiveSessionId(hist[0].id);
        setMessages(hist[0].messages);
      } else {
        setActiveSessionId(undefined);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || !selectedDatasetId || sending) return;

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSessionId || '',
      role: 'user',
      agent_name: 'You',
      content: text,
      agent_status: 'completed',
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSending(true);

    try {
      const response = await aiService.chat(selectedDatasetId, text, activeSessionId);
      setActiveSessionId(response.session_id);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        session_id: activeSessionId || '',
        role: 'assistant',
        agent_name: 'System Error',
        content: 'Failed to complete analysis query. Please check query parameters.',
        agent_status: 'failed',
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const toggleSql = (id: string) => {
    setExpandedSql((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTable = (id: string) => {
    setExpandedTable((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return <LoadingSpinner message="Connecting to AI Data Scientist multi-agent team..." />;
  }

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Bar: Agent & Dataset Status */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center space-x-2">
              <span>Autonomous Data Scientist Team</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Data Analyst • DuckDB SQL Planner • Visualization Agent
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Active Dataset:</label>
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              loadChatHistory(e.target.value);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.row_count} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Ask Anything About Your Data</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your AI Data Scientist converts questions to safe analytical DuckDB queries, validates results,
                and generates Recharts visualizations automatically.
              </p>
            </div>

            {/* Suggested Starter Questions */}
            <div className="w-full space-y-2 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">
                Suggested Questions
              </div>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-xs font-medium text-slate-700 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <span>{prompt}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-indigo-600 text-white shadow-sm'
                }`}
              >
                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none space-y-3'
                }`}
              >
                {/* Header (for assistant) */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-indigo-700 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      {msg.agent_name}
                    </span>
                    <StatusBadge status={msg.agent_status} />
                  </div>
                )}

                {/* Main Explanation */}
                <div className="leading-relaxed font-sans whitespace-pre-wrap">{msg.content}</div>

                {/* Query SQL Code Block */}
                {msg.query_sql && (
                  <div className="rounded-xl overflow-hidden border border-slate-300/80 bg-slate-900 text-slate-200">
                    <button
                      onClick={() => toggleSql(msg.id)}
                      className="w-full px-3 py-1.5 bg-slate-950 flex items-center justify-between text-[11px] font-mono text-slate-400 hover:text-white"
                    >
                      <span className="flex items-center">
                        <Terminal className="w-3 h-3 mr-1.5 text-indigo-400" />
                        Safe DuckDB SQL Execution Plan
                      </span>
                      <span>{expandedSql[msg.id] ? 'Hide' : 'Show SQL'}</span>
                    </button>
                    {expandedSql[msg.id] && (
                      <pre className="p-3 text-[11px] font-mono overflow-x-auto text-emerald-400">
                        {msg.query_sql}
                      </pre>
                    )}
                  </div>
                )}

                {/* Inline Generated Chart */}
                {msg.chart_config && msg.chart_config.data && msg.chart_config.data.length > 0 && (
                  <div className="pt-2">
                    {msg.chart_config.chart_type === 'bar' && (
                      <BarChartComponent
                        data={msg.chart_config.data}
                        xKey={msg.chart_config.x_key}
                        yKey={msg.chart_config.y_key}
                        title={msg.chart_config.title}
                        height={240}
                      />
                    )}
                    {msg.chart_config.chart_type === 'line' && (
                      <LineChartComponent
                        data={msg.chart_config.data}
                        xKey={msg.chart_config.x_key}
                        yKey={msg.chart_config.y_key}
                        title={msg.chart_config.title}
                        height={240}
                      />
                    )}
                    {msg.chart_config.chart_type === 'pie' && (
                      <PieChartComponent
                        data={msg.chart_config.data}
                        nameKey={msg.chart_config.x_key}
                        dataKey={msg.chart_config.y_key}
                        title={msg.chart_config.title}
                        height={240}
                      />
                    )}
                  </div>
                )}

                {/* Execution Result Table Preview */}
                {msg.execution_result && msg.execution_result.rows && (
                  <div>
                    <button
                      onClick={() => toggleTable(msg.id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                      <span>
                        {expandedTable[msg.id] ? 'Hide Raw Result Table' : `View Result Table (${msg.execution_result.total_rows} rows)`}
                      </span>
                    </button>
                    {expandedTable[msg.id] && (
                      <div className="mt-2 border border-slate-200 rounded-lg overflow-x-auto max-h-48 bg-white">
                        <table className="min-w-full divide-y divide-slate-200 text-[10px]">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              {msg.execution_result.columns.map((c) => (
                                <th key={c} className="px-2.5 py-1.5 text-left font-bold text-slate-700 whitespace-nowrap">
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {msg.execution_result.rows.slice(0, 15).map((row, r_i) => (
                              <tr key={r_i}>
                                {msg.execution_result!.columns.map((c) => (
                                  <td key={c} className="px-2.5 py-1 whitespace-nowrap text-slate-600">
                                    {String(row[c] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <span className="font-medium text-slate-600">
                Data Scientist Agent is orchestrating query and drafting visualization...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder={
              selectedDataset
                ? `Ask about '${selectedDataset.name}' (e.g. Total revenue by category, unusual transactions...)`
                : 'Select a dataset to begin asking questions...'
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={sending || !selectedDatasetId}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={sending || !inputMessage.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40 flex items-center space-x-1.5"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

