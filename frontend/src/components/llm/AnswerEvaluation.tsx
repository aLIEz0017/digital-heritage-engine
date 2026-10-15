import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import llmApi from '../../api/llm';

interface AnswerEvaluationProps {
  query: string;
  answer: string;
  referenceKnowledge?: string[];
  onOptimize?: (optimizedAnswer: string) => void;
  className?: string;
}

interface EvaluationResult {
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

const AnswerEvaluation: React.FC<AnswerEvaluationProps> = ({
  query,
  answer,
  referenceKnowledge,
  onOptimize,
  className = '',
}) => {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'positive' | 'negative' | null>(null);

  const evaluateAnswer = async () => {
    setLoading(true);
    try {
      const result = await llmApi.evaluateAnswer({
        query,
        answer,
        reference_knowledge: referenceKnowledge,
      });
      setEvaluation(result);
    } catch (error) {
      console.error('Failed to evaluate answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const optimizeAnswer = async () => {
    if (!evaluation || !onOptimize) return;

    setOptimizing(true);
    try {
      const result = await llmApi.smartQA({
        query: `${query}\n\n优化要求：${evaluation.suggestions.join('; ')}`,
        use_rag: true,
      });

      onOptimize(result.answer);
      setEvaluation(null);
    } catch (error) {
      console.error('Failed to optimize answer:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`answer-evaluation ${className}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={evaluateAnswer}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          {loading ? '评估中...' : '评估答案质量'}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUserFeedback('positive')}
            className={`p-1.5 rounded-lg transition-colors ${
              userFeedback === 'positive'
                ? 'bg-green-500/20 text-green-400'
                : 'hover:bg-gray-700/50 text-gray-500'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setUserFeedback('negative')}
            className={`p-1.5 rounded-lg transition-colors ${
              userFeedback === 'negative'
                ? 'bg-red-500/20 text-red-400'
                : 'hover:bg-gray-700/50 text-gray-500'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {evaluation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${getScoreColor(evaluation.overall_score)}`}>
                    {(evaluation.overall_score * 100).toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-400">综合评分</div>
                </div>

                {evaluation.should_regenerate && onOptimize && (
                  <button
                    onClick={optimizeAnswer}
                    disabled={optimizing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-sm"
                  >
                    {optimizing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    优化答案
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {evaluation.scores.map((score, index) => (
                  <div key={index} className="text-center">
                    <div className="relative w-10 h-10 mx-auto mb-1">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-gray-700"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${score.score * 100} 100`}
                          className={getScoreColor(score.score)}
                        />
                      </svg>
                      <span
                        className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${getScoreColor(score.score)}`}
                      >
                        {(score.score * 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{score.dimension}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                详细分析
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-3"
                  >
                    {evaluation.strengths.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-sm text-green-400 mb-1">
                          <CheckCircle className="w-4 h-4" />
                          优点
                        </div>
                        <ul className="text-xs text-gray-400 space-y-1 pl-5">
                          {evaluation.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.weaknesses.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-sm text-yellow-400 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          不足
                        </div>
                        <ul className="text-xs text-gray-400 space-y-1 pl-5">
                          {evaluation.weaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.suggestions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-sm text-blue-400 mb-1">
                          <RefreshCw className="w-4 h-4" />
                          改进建议
                        </div>
                        <ul className="text-xs text-gray-400 space-y-1 pl-5">
                          {evaluation.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnswerEvaluation;
