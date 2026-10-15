import { apiClient } from './client';

export interface ChatRequest {
  message: string;
  system_prompt?: string;
  context?: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  task_type?: string;
  use_cache?: boolean;
}

export interface ChatResponse {
  response: string;
  model?: string;
  cached: boolean;
}

export interface IntentRequest {
  query: string;
  context?: Array<{ role: string; content: string }>;
  session_history?: Array<{ role: string; content: string }>;
}

export interface IntentResponse {
  primary_intent: string;
  confidence: number;
  secondary_intents: string[];
  entities: string[];
  keywords: string[];
  query_type: string;
  suggested_response_type: string;
  clarification_needed: boolean;
  clarification_question?: string;
}

export interface EntityExtractionRequest {
  text: string;
  entity_types?: string[];
  use_llm?: boolean;
}

export interface Entity {
  name: string;
  type: string;
  confidence: number;
  attributes: Record<string, unknown>;
  relations: Array<{
    target: string;
    relation_type: string;
    confidence: number;
    evidence?: string;
  }>;
  context?: string;
}

export interface EntityExtractionResponse {
  entities: Entity[];
  keywords: string[];
  summary?: string;
  main_topic?: string;
}

export interface KeywordExtractionRequest {
  text: string;
  context?: string[];
  use_llm?: boolean;
  max_keywords?: number;
}

export interface Keyword {
  word: string;
  category: string;
  weight: number;
  synonyms: string[];
  related: string[];
}

export interface KeywordExtractionResponse {
  keywords: Keyword[];
  expanded_keywords: string[];
  main_topic?: string;
  sentiment?: string;
  domain?: string;
}

export interface QuestionRecommendationRequest {
  query: string;
  response: string;
  entities: string[];
  context?: Array<{ role: string; content: string }>;
  graph_context?: string;
  user_interests?: string[];
}

export interface RecommendedQuestion {
  question: string;
  type: string;
  reason: string;
  related_entities: string[];
  priority: number;
}

export interface QuestionRecommendationResponse {
  questions: RecommendedQuestion[];
  context_summary?: string;
  suggested_direction?: string;
}

export interface RelationExtractionRequest {
  text: string;
  known_entities?: string[];
}

export interface Relation {
  source: string;
  target: string;
  type: string;
  confidence: number;
  evidence?: string;
  bidirectional: boolean;
  attributes: Record<string, unknown>;
}

export interface RelationExtractionResponse {
  relations: Relation[];
  implicit_relations: Array<{
    source: string;
    target: string;
    inferred_type: string;
    reasoning: string;
    confidence: number;
  }>;
}

export interface KnowledgeReasoningRequest {
  question: string;
  known_facts: string[];
}

export interface ReasoningStep {
  step: number;
  premise: string;
  inference: string;
  conclusion: string;
}

export interface KnowledgeReasoningResponse {
  reasoning_chain: ReasoningStep[];
  conclusion: string;
  confidence: number;
  supporting_evidence: string[];
  counter_evidence: string[];
  alternative_conclusions: string[];
}

export interface KnowledgeCompletionRequest {
  entity_name: string;
  entity_type: string;
  attributes: Record<string, unknown>;
  relations: Array<Record<string, unknown>>;
}

export interface KnowledgeCompletionResponse {
  missing_attributes: Array<{
    attribute: string;
    suggested_value: string;
    confidence: number;
    reasoning: string;
  }>;
  potential_relations: Array<{
    target: string;
    type: string;
    confidence: number;
    reasoning: string;
  }>;
  suggested_additions: string[];
}

export interface AnswerEvaluationRequest {
  query: string;
  answer: string;
  reference_knowledge?: string[];
}

export interface AnswerEvaluationResponse {
  scores: Array<{
    dimension: string;
    score: number;
    comment?: string;
  }>;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  should_regenerate: boolean;
}

export interface SemanticSearchRequest {
  query: string;
  user_history?: Array<{ query: string; timestamp: number }>;
  top_k?: number;
}

export interface SemanticSearchResponse {
  query: string;
  enhancement: {
    intent: string;
    intent_description: string;
    expanded_terms: {
      synonyms: string[];
      related: string[];
      broader: string[];
      narrower: string[];
    };
    filters: {
      entity_types: string[];
      regions: string[];
      periods: string[];
    };
    ranking_hints: {
      primary_sort: string;
      diversity: boolean;
      recency_weight: number;
    };
    suggested_queries: string[];
  };
  results: Array<{
    id: string;
    name: string;
    description: string;
    original_score: number;
    reranked_score: number;
    relevance_reason?: string;
  }>;
}

export interface SmartQARequest {
  query: string;
  context?: Array<{ role: string; content: string }>;
  use_rag?: boolean;
}

export interface SmartQAResponse {
  answer: string;
  intent: string;
  entities: string[];
  keywords: string[];
  recommended_questions: RecommendedQuestion[];
  sources?: Array<{
    id: string;
    title: string;
    content: string;
    relevance: number;
  }>;
}

export interface ModelStats {
  models: Record<
    string,
    {
      total_requests: number;
      success_rate: number;
      avg_latency_ms: number;
      total_tokens: number;
      consecutive_failures: number;
    }
  >;
}

const llmApi = {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>('/api/v1/llm/chat', request);
  },

  async recognizeIntent(request: IntentRequest): Promise<IntentResponse> {
    return apiClient.post<IntentResponse>('/api/v1/llm/intent', request);
  },

  async extractEntities(request: EntityExtractionRequest): Promise<EntityExtractionResponse> {
    return apiClient.post<EntityExtractionResponse>('/api/v1/llm/entities', request);
  },

  async extractKeywords(request: KeywordExtractionRequest): Promise<KeywordExtractionResponse> {
    return apiClient.post<KeywordExtractionResponse>('/api/v1/llm/keywords', request);
  },

  async recommendQuestions(
    request: QuestionRecommendationRequest
  ): Promise<QuestionRecommendationResponse> {
    return apiClient.post<QuestionRecommendationResponse>(
      '/api/v1/llm/questions/recommend',
      request
    );
  },

  async extractRelations(request: RelationExtractionRequest): Promise<RelationExtractionResponse> {
    return apiClient.post<RelationExtractionResponse>('/api/v1/llm/relations', request);
  },

  async reasonKnowledge(request: KnowledgeReasoningRequest): Promise<KnowledgeReasoningResponse> {
    return apiClient.post<KnowledgeReasoningResponse>('/api/v1/llm/reasoning', request);
  },

  async completeKnowledge(
    request: KnowledgeCompletionRequest
  ): Promise<KnowledgeCompletionResponse> {
    return apiClient.post<KnowledgeCompletionResponse>('/api/v1/llm/completion', request);
  },

  async evaluateAnswer(request: AnswerEvaluationRequest): Promise<AnswerEvaluationResponse> {
    return apiClient.post<AnswerEvaluationResponse>('/api/v1/llm/evaluate', request);
  },

  async semanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    return apiClient.post<SemanticSearchResponse>('/api/v1/llm/search', request);
  },

  async smartQA(request: SmartQARequest): Promise<SmartQAResponse> {
    return apiClient.post<SmartQAResponse>('/api/v1/llm/smart-qa', request);
  },

  async getModelStats(): Promise<ModelStats> {
    return apiClient.get<ModelStats>('/api/v1/llm/stats');
  },

  async healthCheck(): Promise<{ status: string; models_available: string[] }> {
    return apiClient.get<{ status: string; models_available: string[] }>('/api/v1/llm/health');
  },
};

export default llmApi;
