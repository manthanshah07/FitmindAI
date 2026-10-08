import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { sendCoachMessageApi, getCoachHistoryApi } from '../../lib/api/coach';
import { getErrorMessage } from '../../utils/apiError';
import type {
  ChatMessage,
  CoachChatResponse,
  ObservationSeverity,
  RecommendationPriority,
} from '../../types/coach';

const SUGGESTED_PROMPTS = [
  'What should I focus on this week?',
  'Am I eating enough protein?',
  'How is my progress toward my goal?',
  'What should I improve in my workouts?',
];

export const CoachPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['coach-history'],
    queryFn: () => getCoachHistoryApi(),
  });

  useEffect(() => {
    if (historyData && historyData.length > 0 && messages.length === 0) {
      const loadedMessages: ChatMessage[] = historyData.map((item) => {
        const timeStr = item.created_at
          ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          id: item.id,
          sender: item.role,
          content: item.content || undefined,
          response: item.response || undefined,
          timestamp: timeStr,
        };
      });
      setMessages(loadedMessages);
    }
  }, [historyData, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    setErrorBanner(null);

    const userMessage: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      sender: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      const response: CoachChatResponse = await sendCoachMessageApi({ message: trimmed });

      const assistantMessage: ChatMessage = {
        id: `assistant-${crypto.randomUUID()}`,
        sender: 'assistant',
        response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const formattedError = getErrorMessage(err);
      setErrorBanner(formattedError);

      const errorMessage: ChatMessage = {
        id: `error-${crypto.randomUUID()}`,
        sender: 'assistant',
        isError: true,
        errorMessage: formattedError,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const renderSeverityBadge = (severity: ObservationSeverity) => {
    switch (severity) {
      case 'important':
        return <Badge variant="error">IMPORTANT</Badge>;
      case 'caution':
        return <Badge variant="faded">CAUTION</Badge>;
      case 'info':
      default:
        return <Badge variant="olive">INFO</Badge>;
    }
  };

  const renderPriorityBadge = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'high':
        return <Badge variant="error">HIGH PRIORITY</Badge>;
      case 'medium':
        return <Badge variant="olive">MEDIUM PRIORITY</Badge>;
      case 'low':
      default:
        return <Badge variant="faded">LOW PRIORITY</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="border border-borderLine p-6 md:p-8 bg-bone">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-1 font-bold">
              Your Personal Coach
            </span>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-graphite">
              FitMind AI Coach
            </h1>
            <p className="text-sm text-charcoal mt-1">
              Ask questions about your workouts, nutrition, or goal pacing for personalized fitness advice.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-olive animate-pulse" />
            <span className="font-mono text-xs text-graphite uppercase tracking-widest font-bold">
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner if any */}
      {errorBanner && (
        <div className="p-4 border border-error bg-error/5 text-error text-xs font-mono uppercase tracking-wider font-bold">
          ⚠️ {errorBanner}
        </div>
      )}

      {/* Main Chat Container */}
      <Card variant="default" className="p-4 md:p-6 min-h-[500px] flex flex-col justify-between">
        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto max-h-[550px] space-y-6 pr-2 mb-6 scrollbar-thin">
          {isLoadingHistory ? (
            /* Loading State */
            <div className="py-16 text-center space-y-3">
              <span className="font-mono text-xs text-olive uppercase tracking-widest animate-pulse font-bold block">
                Restoring persistent conversation history...
              </span>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State */
            <div className="py-12 px-4 text-center space-y-6 max-w-2xl mx-auto">
              <div className="inline-block p-4 border border-borderLine bg-black/5 rounded-none">
                <span className="text-3xl">🤖</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase tracking-tight text-graphite">
                  Welcome to your AI Coach
                </h2>
                <p className="text-sm text-charcoal leading-relaxed">
                  FitMind AI Coach analyzes your profile, active goal, workout sessions, and nutrition logs to give clear, actionable advice.
                </p>
              </div>

              <div className="pt-4">
                <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-3 font-bold">
                  SUGGESTED QUESTIONS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {SUGGESTED_PROMPTS.map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(promptText)}
                      className="p-3 border border-borderLine bg-bone hover:bg-black/5 hover:border-graphite text-xs text-graphite font-sans font-medium transition-colors text-left flex items-center justify-between group"
                    >
                      <span>{promptText}</span>
                      <span className="font-mono text-olive group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Render Messages */
            messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {msg.sender === 'user' ? (
                  /* User Message */
                  <div className="flex flex-col items-end">
                    <div className="bg-graphite text-bone p-4 border border-graphite max-w-[85%] sm:max-w-[75%] rounded-none">
                      <p className="text-sm font-sans whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="font-mono text-[10px] text-faded mt-1">{msg.timestamp}</span>
                  </div>
                ) : msg.isError ? (
                  /* Error Message */
                  <div className="flex flex-col items-start">
                    <div className="border border-error bg-error/5 text-graphite p-4 max-w-[90%] sm:max-w-[80%] rounded-none space-y-1">
                      <span className="font-mono text-xs text-error font-bold uppercase block">
                        COACH ERROR
                      </span>
                      <p className="text-xs text-charcoal font-sans">{msg.errorMessage}</p>
                    </div>
                    <span className="font-mono text-[10px] text-faded mt-1">{msg.timestamp}</span>
                  </div>
                ) : (
                  /* Assistant Message with Clean Response */
                  <div className="flex flex-col items-start max-w-[95%] sm:max-w-[85%]">
                    <div className="border border-borderLine bg-white text-graphite p-5 sm:p-6 space-y-4 shadow-sm">
                      {/* Top Header: Coach Name */}
                      <div className="flex items-center justify-between border-b border-borderLine/60 pb-2">
                        <span className="font-mono text-xs text-olive font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span>🤖</span> FitMind AI Coach
                        </span>
                      </div>

                      {/* Direct Conversational Answer */}
                      {(msg.response?.answer || msg.content) && (
                        <p className="text-sm md:text-base font-sans text-graphite leading-relaxed whitespace-pre-wrap">
                          {msg.response?.answer || msg.content}
                        </p>
                      )}

                      {/* Observations / Insights (only shown when provided) */}
                      {msg.response?.observations && msg.response.observations.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-borderLine/50">
                          <span className="font-mono text-[11px] text-charcoal font-bold uppercase tracking-wider block">
                            Key Insights
                          </span>
                          <div className="space-y-2">
                            {msg.response.observations.map((obs, oIdx) => (
                              <div
                                key={oIdx}
                                className="p-3 bg-bone border border-borderLine/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <span className="font-mono text-[10px] text-olive font-bold uppercase tracking-wider block">
                                    {obs.category}
                                  </span>
                                  <p className="text-graphite font-sans">{obs.text}</p>
                                </div>
                                <div className="shrink-0">{renderSeverityBadge(obs.severity)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations / Next Steps (only shown when provided) */}
                      {msg.response?.recommendations && msg.response.recommendations.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-borderLine/50">
                          <span className="font-mono text-[11px] text-charcoal font-bold uppercase tracking-wider block">
                            Recommended Next Steps
                          </span>
                          <div className="grid grid-cols-1 gap-2.5">
                            {msg.response.recommendations.map((rec, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-3.5 bg-bone border border-borderLine space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-borderLine/60 pb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-olive font-bold uppercase tracking-wider">
                                      [{rec.category}]
                                    </span>
                                    <h4 className="font-bold text-xs uppercase tracking-tight text-graphite">
                                      {rec.title}
                                    </h4>
                                  </div>
                                  {renderPriorityBadge(rec.priority)}
                                </div>
                                <p className="text-xs text-charcoal font-sans leading-relaxed">
                                  {rec.action}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings Section */}
                      {msg.response?.warnings && msg.response.warnings.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-borderLine/50">
                          <span className="font-mono text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
                            Notes & Reminders
                          </span>
                          <div className="space-y-1">
                            {msg.response.warnings.map((warn, wIdx) => (
                              <div
                                key={wIdx}
                                className="p-2 border border-rose-200 bg-rose-50 text-xs font-sans text-rose-900"
                              >
                                ⚠️ {warn}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-faded mt-1">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Thinking Indicator */}
          {isSending && (
            <div className="flex flex-col items-start space-y-1">
              <div className="border border-borderLine bg-bone p-4 max-w-[80%] rounded-none flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-olive animate-ping" />
                <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold">
                  FitMind Coach is analyzing your fitness context...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="border-t border-borderLine pt-4 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FitMind AI Coach about training, nutrition, or goal progress..."
            disabled={isSending}
            className="flex-1 bg-bone border border-borderLine px-4 py-3 text-xs text-graphite placeholder:text-faded font-sans rounded-none focus:outline-none focus:border-graphite disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!inputText.trim() || isSending}
            isLoading={isSending}
            className="shrink-0"
          >
            SEND QUESTION
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CoachPage;
