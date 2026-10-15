import { motion } from 'framer-motion';
import { MapPin, Navigation, Globe } from 'lucide-react';
import { Entity } from '../../../api/knowledge';
import { getCategoryColor, getCategoryLabel } from '../../../constants/categories';

interface MapViewProps {
  entities: Entity[];
  onEntityClick: (entityId: string) => void;
  loading?: boolean;
}

export default function MapView({ entities, onEntityClick, loading }: MapViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 rounded-full"
          style={{
            borderColor: 'var(--color-secondary)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  const entitiesWithRegion = entities.filter((e) => e.region);

  if (!entitiesWithRegion || entitiesWithRegion.length === 0) {
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
                background: 'linear-gradient(135deg, var(--color-secondary), var(--color-success))',
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
              <Globe size={48} style={{ color: 'var(--color-secondary)' }} />
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            暂无地理数据
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            当前筛选条件下没有包含地域信息的实体
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const regionGroups = entitiesWithRegion.reduce(
    (acc, entity) => {
      const region = entity.region || '未知';
      if (!acc[region]) {
        acc[region] = [];
      }
      acc[region].push(entity);
      return acc;
    },
    {} as Record<string, Entity[]>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--gradient-secondary)' }}
          >
            <Globe size={20} style={{ color: 'var(--color-text-inverse)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              地域分布
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              按地域查看实体分布
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(regionGroups).map(([region, regionEntities], index) => (
          <motion.div
            key={region}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
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
                background: 'linear-gradient(90deg, var(--color-secondary), var(--color-success))',
                opacity: 0.95,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--gradient-secondary)' }}
                >
                  <MapPin size={16} style={{ color: 'var(--color-text-inverse)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text-inverse)' }}>
                    {region}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-inverse)', opacity: 0.8 }}
                  >
                    {regionEntities.length} 个实体
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {regionEntities.slice(0, 5).map((entity) => (
                <motion.div
                  key={entity.id}
                  whileHover={{ x: 4 }}
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
                  <Navigation
                    size={14}
                    style={{ color: 'var(--color-text-muted)' }}
                    className="transition-colors"
                  />
                </motion.div>
              ))}
              {regionEntities.length > 5 && (
                <div className="text-center py-2">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    还有 {regionEntities.length - 5} 个实体...
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
