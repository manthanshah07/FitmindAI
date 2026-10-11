import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { sendCoachMessageApi, getCoachHistoryApi, clearCoachHistoryApi } from '../../lib/api/coach';
import { getErrorMessage } from '../../utils/apiError';
import type {
  ChatMessage,
  CoachChatResponse,
  ObservationSeverity,
  RecommendationPriority,
} from '../../types/coach';

const SUGGESTED_PROMPTS = [
  'How am I doing this week?',
  'Is my protein on target?',
  'What should I train tomorrow?',
  'Am I eating enough protein?',
  'What should I focus on this week?',
  'How is my progress toward my goal?',
];

const DEMO_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'demo-msg-1',
    sender: 'user',
    content: 'How is my progress and protein intake this week?',
    timestamp: '10:15 AM',
  },
  {
    id: 'demo-msg-2',
    sender: 'assistant',
    timestamp: '10:15 AM',
    response: {
      answer:
        'You are making steady progress toward your fat loss goal with 4 completed training sessions this week. Your average daily protein is 112g against your target of 145g.',
      observations: [
        {
          category: 'nutrition',
          text: 'Average daily protein intake is 112g across 5 logged days (target: 145g).',
          severity: 'caution',
        },
        {
          category: 'workout',
          text: 'Completed 4 resistance training sessions totaling 48 sets.',
          severity: 'info',
        },
        {
          category: 'progress',
          text: 'Central weight tracked at 81.0 kg, down 0.4 kg over the past 14 days.',
          severity: 'info',
        },
      ],
      recommendations: [
        {
          category: 'nutrition',
          title: 'Increase Protein at Breakfast & Lunch',
          action: 'Add 1 scoop of whey or 150g egg whites/paneer to close your 33g daily shortfall.',
          priority: 'high',
        },
        {
          category: 'workout',
          title: 'Maintain Resistance Volume',
          action: 'Continue hitting 10-12 sets per session to preserve lean muscle tissue in a caloric deficit.',
          priority: 'medium',
        },
      ],
      warnings: [
        '2 nutrition days unlogged this week; figures represent averages only on logged days.',
      ],
      data_quality: 'moderate',
    },
  },
];

export const CoachPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isMockPreview = searchParams.get('mock') === 'true';
  const initialModal = searchParams.get('modal') === 'privacy';

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isMockPreview ? DEMO_CHAT_MESSAGES : [],
  );
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(initialModal);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['coach-history'],
    queryFn: () => getCoachHistoryApi(),
  });

  const hasLoadedHistoryRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasLoadedHistoryRef.current && historyData && historyData.length > 0) {
      hasLoadedHistoryRef.current = true;
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
  }, [historyData]);

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

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await clearCoachHistoryApi();
      setMessages([]);
      setShowClearConfirm(false);
      refetchHistory();
    } catch (err: unknown) {
      setErrorBanner(getErrorMessage(err));
    } finally {
      setIsClearing(false);
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

  const renderDataQualityBadge = (quality?: string) => {
    if (!quality) return null;
    let badgeVariant: 'olive' | 'faded' | 'error' = 'olive';
    if (quality === 'sparse') badgeVariant = 'faded';
    if (quality === 'minimal') badgeVariant = 'error';

    return (
      <span className="inline-flex items-center gap-1">
        <span className="font-mono text-[10px] text-text-2">Data quality:</span>
        <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0.5">
          {quality}
        </Badge>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.5rem)] max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="border border-border rounded-card p-4 md:p-6 bg-surface shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-accent font-semibold">
                Your Personal Coach
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
              FitMind AI Coach
            </h1>
            <p className="text-xs text-text-2 mt-0.5">
              Ask questions about your workouts, nutrition, or goal pacing for personalized fitness advice.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            {messages.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs py-1 px-2.5"
              >
                New conversation
              </Button>
            )}
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="text-xs text-accent hover:underline underline-offset-2 flex items-center gap-1 font-medium"
            >
              🔒 Privacy
            </button>
          </div>
        </div>

        {/* Privacy Disclosure Line & Non-Medical Disclaimer Banner */}
        <div className="mt-3 pt-2.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-text-2">
          <div>
            Coach uses your last 30 days of data.{' '}
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="text-accent underline font-medium hover:opacity-80"
            >
              See what is shared.
            </button>
          </div>
          <div className="font-sans text-text-3 text-[11px] sm:text-right">
            FitMind AI Coach provides wellness education, not medical advice.
          </div>
        </div>
      </div>

      {/* Error Banner if any */}
      {errorBanner && (
        <div className="p-3 my-2 border border-danger rounded-card bg-danger/10 text-danger text-xs font-medium shrink-0">
          ⚠️ {errorBanner}
        </div>
      )}

      {/* Main Chat Container */}
      <Card variant="default" className="flex-1 min-h-0 flex flex-col justify-between p-3 md:p-5 mt-2 mb-1">
        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-2 mb-3 scrollbar-thin">
          {isLoadingHistory ? (
            <div className="py-16 text-center space-y-3">
              <span className="text-xs text-accent animate-pulse font-medium block">
                Restoring persistent conversation history...
              </span>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State */
            <div className="py-10 px-4 text-center space-y-6 max-w-2xl mx-auto">
              <div className="inline-block p-3.5 border border-border bg-surface-2 rounded-card">
                <span className="text-3xl">🤖</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-text">
                  Welcome to your AI Coach
                </h2>
                <p className="text-xs md:text-sm text-text-2 leading-relaxed">
                  FitMind AI Coach analyzes your profile, active goal, workout sessions, and nutrition logs to give clear, actionable advice.
                </p>
              </div>

              <div className="pt-2">
                <span className="text-xs text-accent block mb-3 font-semibold">
                  SUGGESTED QUESTIONS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {SUGGESTED_PROMPTS.map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(promptText)}
                      className="p-3 border border-border rounded-input bg-surface-2 hover:border-accent text-xs text-text font-sans font-medium transition-colors text-left flex items-center justify-between group"
                    >
                      <span>{promptText}</span>
                      <span className="font-mono text-accent group-hover:translate-x-0.5 transition-transform">
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
              <div key={msg.id} className="space-y-1.5">
                {msg.sender === 'user' ? (
                  /* User Message */
                  <div className="flex flex-col items-end">
                    <div className="bg-accent text-white p-3.5 md:p-4 border border-accent max-w-[85%] sm:max-w-[75%] rounded-card">
                      <p className="text-xs md:text-sm font-sans whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="font-mono text-[10px] text-text-3 mt-1">{msg.timestamp}</span>
                  </div>
                ) : msg.isError ? (
                  /* Error Message */
                  <div className="flex flex-col items-start">
                    <div className="border border-danger bg-danger/10 text-text p-3.5 md:p-4 max-w-[90%] sm:max-w-[80%] rounded-card space-y-1">
                      <span className="font-mono text-xs text-danger font-bold block">
                        COACH ERROR
                      </span>
                      <p className="text-xs text-text-2 font-sans">{msg.errorMessage}</p>
                    </div>
                    <span className="font-mono text-[10px] text-text-3 mt-1">{msg.timestamp}</span>
                  </div>
                ) : (
                  /* Assistant Message with Clean Structured Card */
                  <div className="flex flex-col items-start max-w-[95%] sm:max-w-[85%]">
                    <div className="border border-border rounded-card bg-surface text-text p-4 sm:p-5 space-y-3.5 shadow-sm w-full">
                      {/* Top Header: Coach Name & Quality Badge */}
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs text-accent font-semibold flex items-center gap-1.5">
                          <span>🤖</span> FitMind AI Coach
                        </span>
                        {renderDataQualityBadge(msg.response?.data_quality)}
                      </div>

                      {/* Direct Conversational Answer in Sentence Case */}
                      {(msg.response?.answer || msg.content) && (
                        <p className="text-xs md:text-sm font-sans text-text leading-relaxed whitespace-pre-wrap">
                          {msg.response?.answer || msg.content}
                        </p>
                      )}

                      {/* Observations / Collapsible "Based on your data" */}
                      {msg.response?.observations && msg.response.observations.length > 0 && (
                        <details open className="group border border-border rounded-input bg-surface-2 p-3">
                          <summary className="flex items-center justify-between cursor-pointer list-none text-xs text-text-2 font-semibold select-none">
                            <span>
                              Based on your data &bull; Key Insights ({msg.response.observations.length}{' '}
                              {msg.response.observations.length === 1 ? 'insight' : 'insights'})
                            </span>
                            <span className="text-accent group-open:rotate-180 transition-transform text-xs">
                              ▼
                            </span>
                          </summary>
                          <div className="mt-2.5 space-y-2">
                            {msg.response.observations.map((obs, oIdx) => (
                              <div
                                key={oIdx}
                                className="p-2.5 bg-surface border border-border rounded-input flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <span className="font-mono text-[10px] text-accent font-semibold block">
                                    {obs.category}
                                  </span>
                                  <p className="text-text font-sans text-xs">{obs.text}</p>
                                </div>
                                <div className="shrink-0">{renderSeverityBadge(obs.severity)}</div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Recommendations / Next Steps Checklist */}
                      {msg.response?.recommendations && msg.response.recommendations.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-2 font-semibold block">
                              Recommended Next Steps
                            </span>
                            <span className="font-sans text-[10px] text-text-3 italic">
                              Non-binding suggestions
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.response.recommendations.map((rec, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-3 bg-surface-2 border border-border rounded-input space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-accent font-semibold">
                                      [{rec.category}]
                                    </span>
                                    <h4 className="font-bold text-xs tracking-tight text-text">
                                      {rec.title}
                                    </h4>
                                  </div>
                                  {renderPriorityBadge(rec.priority)}
                                </div>
                                <p className="text-xs text-text-2 font-sans leading-relaxed">
                                  {rec.action}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings Alert Callout */}
                      {msg.response?.warnings && msg.response.warnings.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-border">
                          <span className="text-[11px] text-warning font-semibold block">
                            Notes & Notices
                          </span>
                          <div className="space-y-1">
                            {msg.response.warnings.map((warn, wIdx) => (
                              <div
                                key={wIdx}
                                className="p-2 border border-warning/30 rounded-input bg-warning/10 text-xs font-sans text-warning"
                              >
                                ⚠️ {warn}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-text-3 mt-1">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Thinking Indicator */}
          {isSending && (
            <div className="flex flex-col items-start space-y-1">
              <div className="border border-border bg-surface-2 p-3.5 max-w-[80%] rounded-card flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                <span className="text-xs text-accent font-medium">
                  FitMind Coach is analyzing your fitness context...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Chips (when in active conversation) */}
        {messages.length > 0 && (
          <div className="shrink-0 pt-1 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            {SUGGESTED_PROMPTS.slice(0, 3).map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(promptText)}
                disabled={isSending}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-sans border border-border bg-surface-2 hover:border-accent hover:text-accent text-text rounded-full transition-colors shrink-0 disabled:opacity-50"
              >
                {promptText}
              </button>
            ))}
          </div>
        )}

        {/* Input Composer Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="border-t border-border pt-3 flex flex-col sm:flex-row gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FitMind AI Coach about training, nutrition, or goal progress..."
            disabled={isSending}
            className="flex-1 bg-surface-2 border border-border px-3.5 py-2.5 text-xs text-text placeholder:text-text-3 font-sans rounded-input focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!inputText.trim() || isSending}
            isLoading={isSending}
            className="shrink-0 text-xs py-2.5"
          >
            SEND QUESTION
          </Button>
        </form>
      </Card>

      {/* Confirmation Modal: Clear Chat History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-card p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold tracking-tight text-text">
              Start New Conversation?
            </h3>
            <p className="text-xs text-text-2 leading-relaxed">
              This will clear your previous coach messages for this account. Your logged workouts, nutrition, and goals are completely safe and untouched.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearHistory}
                isLoading={isClearing}
              >
                Clear Conversation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Disclosure Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-card p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <h3 className="text-base font-bold tracking-tight text-text">
                  Data Shared with FitMind Coach
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-sm text-text-2 hover:text-text font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-2 leading-relaxed">
              FitMind AI operates on a strict principle of <strong>data minimization</strong>. Only verified facts and mathematical summaries necessary to coach you are included in the prompt:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-2 border border-border rounded-input space-y-1">
                <h4 className="text-xs font-semibold text-accent">
                  ✓ What Is Shared
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-text">
                  <li>Current body weight & target weight</li>
                  <li>Active goal type and timeline</li>
                  <li>Last 7-day and 28-day nutrition intake averages vs target</li>
                  <li>Last 3–5 workout sessions with exercises and set counts</li>
                  <li>Current fitness score and adherence components</li>
                  <li>Previous coach memories for coaching continuity</li>
                </ul>
              </div>

              <div className="p-3 bg-danger/10 border border-danger/30 rounded-input space-y-1 text-text">
                <h4 className="text-xs font-semibold text-danger">
                  ✗ What Is Never Shared
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-text-2">
                  <li>Medical notes and clinical injury diagnoses</li>
                  <li>Account password, email, or credentials</li>
                  <li>Payment, billing, or subscription information</li>
                  <li>FitMind never trains foundation models on your logs</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowPrivacyModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachPage;
