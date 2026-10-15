/* eslint-disable react-refresh/only-export-components */
import React, { Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorCategory = 'network' | 'render' | 'data' | 'permission' | 'unknown';

interface AppErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: AppErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  isolate?: boolean;
  componentName?: string;
  showDetails?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: AppErrorInfo | null;
  retryCount: number;
  showDetails: boolean;
  copied: boolean;
}

function categorizeError(error: Error): { severity: ErrorSeverity; category: ErrorCategory } {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return { severity: 'medium', category: 'network' };
  }

  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return { severity: 'high', category: 'permission' };
  }

  if (
    message.includes('cannot read') ||
    message.includes('undefined') ||
    message.includes('null')
  ) {
    return { severity: 'high', category: 'data' };
  }

  if (stack.includes('render') || stack.includes('component')) {
    return { severity: 'high', category: 'render' };
  }

  return { severity: 'medium', category: 'unknown' };
}

class ErrorBoundary extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    isolate: false,
    showDetails: true,
    maxRetries: 3,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const { severity, category } = categorizeError(error);

    return {
      hasError: true,
      error,
      errorInfo: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
        severity,
        category,
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { severity, category } = categorizeError(error);

    const fullErrorInfo: AppErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: new Date(),
      severity,
      category,
    };

    this.setState({
      error,
      errorInfo: fullErrorInfo,
    });

    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    if (this.props.onError) {
      this.props.onError(error, fullErrorInfo);
    }

    this.reportError(error, fullErrorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && prevProps.resetKeys) {
        const hasKeyChanged = resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index]);
        if (hasKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  reportError = (error: Error, errorInfo: AppErrorInfo) => {
    const reportData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      severity: errorInfo.severity,
      category: errorInfo.category,
      timestamp: errorInfo.timestamp.toISOString(),
      componentName: this.props.componentName,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    console.log('Error report:', reportData);

    if (process.env.NODE_ENV === 'production') {
      // In production, send to error tracking service
      // fetch('/api/errors', { method: 'POST', body: JSON.stringify(reportData) });
    }
  };

  resetErrorBoundary = () => {
    const { onReset } = this.props;
    const { retryCount } = this.state;
    const maxRetries = this.props.maxRetries || 3;

    if (retryCount >= maxRetries) {
      console.warn('Max retries reached, not resetting');
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
    });

    if (onReset) {
      onReset();
    }
  };

  goToHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  copyErrorToClipboard = async () => {
    const { error, errorInfo } = this.state;
    if (!error || !errorInfo) return;

    const errorText = `
Error: ${error.message}
Component: ${this.props.componentName || 'Unknown'}
Time: ${errorInfo.timestamp.toISOString()}
Severity: ${errorInfo.severity}
Category: ${errorInfo.category}

Stack:
${error.stack || 'No stack trace'}

Component Stack:
${errorInfo.componentStack || 'No component stack'}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  getErrorIcon = () => {
    const { errorInfo } = this.state;
    if (!errorInfo) return <AlertTriangle className="w-12 h-12" />;

    switch (errorInfo.category) {
      case 'network':
        return (
          <div className="relative">
            <AlertTriangle className="w-12 h-12" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          </div>
        );
      case 'permission':
        return (
          <div className="relative">
            <AlertTriangle className="w-12 h-12 text-red-500" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        );
      default:
        return <AlertTriangle className="w-12 h-12" />;
    }
  };

  getErrorTitle = () => {
    const { errorInfo } = this.state;
    if (!errorInfo) return '发生错误';

    switch (errorInfo.category) {
      case 'network':
        return '网络连接错误';
      case 'permission':
        return '权限不足';
      case 'data':
        return '数据处理错误';
      case 'render':
        return '渲染错误';
      default:
        return '发生错误';
    }
  };

  getErrorDescription = () => {
    const { errorInfo } = this.state;
    if (!errorInfo) return '请刷新页面重试';

    switch (errorInfo.category) {
      case 'network':
        return '网络连接出现问题，请检查网络后重试';
      case 'permission':
        return '您没有权限访问此内容，请联系管理员';
      case 'data':
        return '数据处理出现问题，请刷新页面重试';
      case 'render':
        return '页面渲染出现问题，请刷新页面重试';
      default:
        return '请刷新页面或返回首页';
    }
  };

  render() {
    const { children, fallback, isolate, showDetails: propShowDetails } = this.props;
    const { hasError, error, errorInfo, retryCount, showDetails, copied } = this.state;
    const maxRetries = this.props.maxRetries || 3;

    if (hasError && error) {
      if (fallback) {
        return <>{fallback}</>;
      }

      const canRetry = retryCount < maxRetries;

      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex flex-col items-center justify-center p-8 ${
              isolate
                ? 'min-h-[200px] rounded-lg border border-red-200 bg-red-50'
                : 'min-h-screen bg-gray-50'
            }`}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-red-500 mb-4"
            >
              {this.getErrorIcon()}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-semibold text-gray-800 mb-2"
            >
              {this.getErrorTitle()}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 mb-6 text-center max-w-md"
            >
              {this.getErrorDescription()}
            </motion.p>

            {this.props.componentName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-gray-400 mb-4"
              >
                组件: {this.props.componentName}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex gap-3"
            >
              {canRetry && (
                <button
                  onClick={this.resetErrorBoundary}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  重试 ({maxRetries - retryCount} 次)
                </button>
              )}

              {!isolate && (
                <button
                  onClick={this.goToHome}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  返回首页
                </button>
              )}
            </motion.div>

            {propShowDetails && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 w-full max-w-lg"
              >
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {showDetails ? '隐藏详情' : '显示详情'}
                </button>

                <AnimatePresence>
                  {showDetails && errorInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="bg-gray-100 rounded-lg p-4 text-left">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500">
                            {errorInfo.timestamp.toLocaleString()}
                          </span>
                          <div className="flex gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                errorInfo.severity === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : errorInfo.severity === 'high'
                                    ? 'bg-orange-100 text-orange-700'
                                    : errorInfo.severity === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {errorInfo.severity}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                              {errorInfo.category}
                            </span>
                          </div>
                        </div>

                        <pre className="text-xs text-gray-700 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                          {error.message}
                        </pre>

                        <button
                          onClick={this.copyErrorToClipboard}
                          className="flex items-center gap-1 mt-3 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          {copied ? '已复制' : '复制错误信息'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      );
    }

    return <>{children}</>;
  }
}

function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps} componentName={displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="Chat"
      isolate
      maxRetries={5}
      fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
          <p className="text-gray-600 mb-3">聊天功能暂时不可用</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            刷新页面
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

function KnowledgeGraphErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="KnowledgeGraph"
      isolate
      maxRetries={3}
      fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg min-h-[400px]">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
          <p className="text-gray-600 mb-3">知识图谱加载失败</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            重新加载
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

function DataFetchErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="DataFetch"
      isolate
      onError={(_error, info) => {
        if (info.category === 'network') {
          console.warn('Network error detected, might want to show offline indicator');
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export {
  ErrorBoundary,
  withErrorBoundary,
  ChatErrorBoundary,
  KnowledgeGraphErrorBoundary,
  DataFetchErrorBoundary,
  categorizeError,
};

export default ErrorBoundary;

export type { AppErrorInfo as ErrorInfoType, ErrorSeverity, ErrorCategory };
