import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Check, AlertTriangle } from 'lucide-react';

interface EditConfirmationProps {
  isOpen: boolean;
  originalContent: string;
  newContent: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EditConfirmation({
  isOpen,
  originalContent,
  newContent,
  onConfirm,
  onCancel,
}: EditConfirmationProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto max-h-[80vh] overflow-auto"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">确认编辑</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">原始内容</h4>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white whitespace-pre-wrap line-clamp-10">
              {originalContent}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新内容</h4>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-gray-900 dark:text-white whitespace-pre-wrap line-clamp-10">
              {newContent}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            编辑消息将创建新版本，原始版本仍可查看和恢复
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            确认编辑
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface VersionSwitcherProps {
  versions: Array<{
    id: string;
    content: string;
    created_at: string;
    version_number: number;
  }>;
  currentVersionId: string;
  onSwitchVersion: (versionId: string) => void;
  onRestoreVersion?: (versionId: string) => void;
}

export function VersionSwitcher({
  versions,
  currentVersionId,
  onSwitchVersion,
  onRestoreVersion,
}: VersionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);

  const currentVersion = versions.find((v) => v.id === currentVersionId);

  const handleRestore = (versionId: string) => {
    setShowRestoreConfirm(versionId);
  };

  const confirmRestore = () => {
    if (showRestoreConfirm) {
      onRestoreVersion?.(showRestoreConfirm);
      setShowRestoreConfirm(null);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>版本 {currentVersion?.version_number || 1}</span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20"
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">版本历史</h4>
              </div>

              <div className="max-h-96 overflow-auto">
                {versions.map((version, index) => (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      version.id === currentVersionId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          版本 {version.version_number}
                        </span>
                        {version.id === currentVersionId && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                            当前版本
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(version.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {version.content}
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onSwitchVersion(version.id)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          version.id === currentVersionId
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`}
                      >
                        查看此版本
                      </button>
                      {version.id !== currentVersionId && onRestoreVersion && (
                        <button
                          onClick={() => handleRestore(version.id)}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        >
                          恢复此版本
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Restore Confirmation */}
      <AnimatePresence>
        {showRestoreConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowRestoreConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">确认恢复</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                确定要恢复到此版本吗？当前版本将被保存为历史版本。
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRestoreConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmRestore}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  恢复
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface VersionDiffViewerProps {
  oldContent: string;
  newContent: string;
}

export function VersionDiffViewer({ oldContent, newContent }: VersionDiffViewerProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">内容对比</h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h5 className="text-xs text-gray-600 dark:text-gray-400 mb-2">原始</h5>
          <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {oldContent}
          </div>
        </div>

        <div>
          <h5 className="text-xs text-gray-600 dark:text-gray-400 mb-2">新</h5>
          <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {newContent}
          </div>
        </div>
      </div>
    </div>
  );
}
