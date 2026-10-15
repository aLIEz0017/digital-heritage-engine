import { motion } from 'framer-motion';
import { Calendar, ChevronRight, History } from 'lucide-react';
import { Entity } from '../../../api/knowledge';
import { getCategoryColor, getCategoryLabel } from '../../../constants/categories';

interface TimelineViewProps {
  entities: Entity[];
  onEntityClick: (entityId: string) => void;
  loading?: boolean;
}

export default function TimelineView({ entities, onEntityClick, loading }: TimelineViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 rounded-full"
          style={{
            borderColor: 'var(--color-accent)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  const entitiesWithPeriod = entities.filter((e) => e.period);

  if (!entitiesWithPeriod || entitiesWithPeriod.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative w-32 h-32 mx-auto mb-6"
          >
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-error))',
                opacity: 0.2,
              }}
            />
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: 'var(--gradient-card)',
                border: '1px solid var(--color-border)',
              }}
            >
              <History size={48} style={{ color: 'var(--color-accent)' }} />
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            暂无时间数据
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            当前筛选条件下没有包含时期信息的实体
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const periodGroups = entitiesWithPeriod.reduce(
    (acc, entity) => {
      const period = entity.period || '未知';
      if (!acc[period]) {
        acc[period] = [];
      }
      acc[period].push(entity);
      return acc;
    },
    {} as Record<string, Entity[]>
  );

  const sortedPeriods = Object.keys(periodGroups).sort((a, b) => {
    return a.localeCompare(b, 'zh-CN');
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <History size={20} style={{ color: 'var(--color-text-inverse)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              时间轴视图
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              按时期查看实体演变
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute left-6 top-0 bottom-0 w-0.5"
          style={{
            background:
              'linear-gradient(180deg, var(--color-accent), var(--color-error), var(--color-primary))',
            opacity: 0.5,
          }}
        />

        <div className="space-y-6">
          {sortedPeriods.map((period, index) => (
            <motion.div
              key={period}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-12"
            >
              <div
                className="absolute left-4 top-6 w-4 h-4 rounded-full border-4 shadow-lg"
                style={{
                  background: 'var(--gradient-accent)',
                  borderColor: 'var(--color-surface)',
                }}
              />

              <div
                className="backdrop-blur-xl rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--gradient-card)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--color-shadow)',
                }}
              >
                <div
                  className="p-4"
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'linear-gradient(90deg, var(--color-accent), var(--color-error))',
                    opacity: 0.95,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--gradient-accent)' }}
                      >
                        <Calendar size={16} style={{ color: 'var(--color-text-inverse)' }} />
                      </div>
                      <div>
                        <h3
                          className="font-semibold"
                          style={{ color: 'var(--color-text-inverse)' }}
                        >
                          {period}
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--color-text-inverse)', opacity: 0.8 }}
                        >
                          {periodGroups[period].length} 个实体
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {periodGroups[period].slice(0, 4).map((entity) => (
                    <motion.div
                      key={entity.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onEntityClick(entity.id)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: getCategoryColor(entity.type),
                          boxShadow: `0 0 8px ${getCategoryColor(entity.type)}50`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {entity.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {getCategoryLabel(entity.type)}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        style={{ color: 'var(--color-text-muted)' }}
                        className="transition-colors"
                      />
                    </motion.div>
                  ))}
                </div>

                {periodGroups[period].length > 4 && (
                  <div className="px-4 pb-4">
                    <div
                      className="text-center py-2 rounded-lg"
                      style={{ background: 'var(--color-surface)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        还有 {periodGroups[period].length - 4} 个实体...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
