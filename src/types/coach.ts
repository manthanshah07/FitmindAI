export type ObservationSeverity = 'info' | 'caution' | 'important';
export type RecommendationPriority = 'low' | 'medium' | 'high';
export type DataQualityLevel = 'comprehensive' | 'moderate' | 'sparse' | 'minimal';

export interface ObservationItem {
  category: string;
  text: string;
  severity: ObservationSeverity;
}

export interface RecommendationItem {
  category: string;
  title: string;
  action: string;
  priority: RecommendationPriority;
}

export interface CoachChatRequest {
  message: string;
}

export interface CoachChatResponse {
  answer: string;
  observations: ObservationItem[];
  recommendations: RecommendationItem[];
  warnings: string[];
  data_quality: DataQualityLevel;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content?: string;
  response?: CoachChatResponse;
  timestamp: string;
  isError?: boolean;
  errorMessage?: string;
}

export interface ChatMessageResponse {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content?: string | null;
  response?: CoachChatResponse | null;
  created_at: string;
}

