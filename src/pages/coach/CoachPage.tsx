import React, { useState, useRef, useEffect } from 'react';
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
  DataQualityLevel,
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
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const history = await getCoachHistoryApi();
        if (isMounted && history && history.length > 0) {
          const loadedMessages: ChatMessage[] = history.map((item) => {
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
      } catch {
        // Silently catch history fetch error; user can still interact with coach
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const renderDataQualityBadge = (quality: DataQualityLevel) => {
    switch (quality) {
      case 'comprehensive':
        return <Badge variant="olive">DATA QUALITY: COMPREHENSIVE</Badge>;
      case 'moderate':
        return <Badge variant="graphite">DATA QUALITY: MODERATE</Badge>;
      case 'sparse':
        return <Badge variant="faded">DATA QUALITY: SPARSE</Badge>;
      case 'minimal':
        return <Badge variant="error">DATA QUALITY: MINIMAL</Badge>;
      default:
        return <Badge variant="faded">DATA QUALITY: UNKNOWN</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="border border-borderLine p-6 md:p-8 bg-bone">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-1 font-bold">
              PERFORMANCE & GUIDANCE ENGINE
            </span>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-graphite">
              FitMind AI Coach
            </h1>
            <p className="text-sm text-charcoal mt-1">
              Context-aware fitness guidance backed by your deterministic training, nutrition, and progress metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-olive animate-pulse" />
            <span className="font-mono text-xs text-graphite uppercase tracking-widest font-bold">
              GEMINI ACTIVE
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
                  FitMind AI Coach analyzes your profile, active goal, workout sessions, nutrition logs, and deterministic analytics to give clear, actionable advice.
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
                  /* Assistant Message with Structured Response */
                  <div className="flex flex-col items-start">
                    <div className="border border-borderLine bg-bone text-graphite p-6 max-w-[95%] sm:max-w-[90%] rounded-none space-y-6 shadow-sm">
                      {/* Top Header: Data Quality */}
                      {msg.response?.data_quality && (
                        <div className="flex items-center justify-between border-b border-borderLine pb-3">
                          <span className="font-mono text-xs text-olive font-bold uppercase tracking-widest">
                            FITMIND AI COACH
                          </span>
                          {renderDataQualityBadge(msg.response.data_quality)}
                        </div>
                      )}

                      {/* Answer Block */}
                      {(msg.response?.answer || msg.content) && (
                        <div className="space-y-1">
                          <h3 className="font-mono text-xs text-faded font-bold uppercase tracking-wider">
                            COACH DIRECT ANSWER
                          </h3>
                          <p className="text-sm md:text-base font-sans text-graphite leading-relaxed">
                            {msg.response?.answer || msg.content}
                          </p>
                        </div>
                      )}

                      {/* Observations Section */}
                      {msg.response?.observations && msg.response.observations.length > 0 && (
                        <div className="space-y-3 border-t border-borderLine pt-4">
                          <span className="font-mono text-xs text-graphite font-bold uppercase tracking-widest block">
                            FACTS & OBSERVATIONS ({msg.response.observations.length})
                          </span>
                          <div className="space-y-2">
                            {msg.response.observations.map((obs, oIdx) => (
                              <div
                                key={oIdx}
                                className="p-3 border border-borderLine bg-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-1">
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

                      {/* Recommendations Section */}
                      {msg.response?.recommendations && msg.response.recommendations.length > 0 && (
                        <div className="space-y-3 border-t border-borderLine pt-4">
                          <span className="font-mono text-xs text-graphite font-bold uppercase tracking-widest block">
                            ACTIONABLE RECOMMENDATIONS ({msg.response.recommendations.length})
                          </span>
                          <div className="grid grid-cols-1 gap-3">
                            {msg.response.recommendations.map((rec, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-4 border border-graphite bg-bone space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-borderLine pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-olive font-bold uppercase tracking-widest">
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
                        <div className="space-y-2 border-t border-borderLine pt-4">
                          <span className="font-mono text-xs text-error font-bold uppercase tracking-widest block">
                            DATA LIMITATIONS & SAFETY WARNINGS
                          </span>
                          <div className="space-y-1">
                            {msg.response.warnings.map((warn, wIdx) => (
                              <div
                                key={wIdx}
                                className="p-3 border border-error/30 bg-error/5 text-xs font-sans text-graphite"
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
