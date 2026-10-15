import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Layers,
  MapPin,
  Clock,
  Star,
  LucideIcon,
} from 'lucide-react';
import { Entity, Relationship } from '../../../api/knowledge';
import { CATEGORY_COLORS, getCategoryColor, getCategoryLabel } from '../../../constants/categories';

interface StatisticsPanelProps {
  entities: Entity[];
  relationships: Relationship[];
  loading?: boolean;
}

export default function StatisticsPanel({
  entities,
  relationships,
  loading,
}: StatisticsPanelProps) {
  const stats = useMemo(() => {
    const typeDistribution: Record<string, number> = {};
    const regionDistribution: Record<string, number> = {};
    const periodDistribution: Record<string, number> = {};
    const relationTypeDistribution: Record<string, number> = {};

    let totalImportance = 0;
    let maxImportance = 0;

    entities.forEach((entity) => {
      typeDistribution[entity.type] = (typeDistribution[entity.type] || 0) + 1;

      if (entity.region) {
        regionDistribution[entity.region] = (regionDistribution[entity.region] || 0) + 1;
      }

      if (entity.period) {
        periodDistribution[entity.period] = (periodDistribution[entity.period] || 0) + 1;
      }

      totalImportance += entity.importance;
      maxImportance = Math.max(maxImportance, entity.importance);
    });

    relationships.forEach((rel) => {
      relationTypeDistribution[rel.relation_type] =
        (relationTypeDistribution[rel.relation_type] || 0) + 1;
    });

    const topRegions = Object.entries(regionDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topPeriods = Object.entries(periodDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const avgImportance = entities.length > 0 ? totalImportance / entities.length : 0;

    return {
      totalEntities: entities.length,
      totalRelationships: relationships.length,
      typeDistribution,
      topRegions,
      topPeriods,
      relationTypeDistribution,
      avgImportance,
      maxImportance,
    };
  }, [entities, relationships]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 rounded-full"
          style={{
            borderColor: 'var(--color-primary)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    colorVar,
    subtitle,
  }: {
    title: string;
    value: number | string;
    icon: LucideIcon;
    colorVar: string;
    subtitle?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="p-4 backdrop-blur-xl rounded-xl"
      style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--color-shadow)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${colorVar}20` }}
        >
          <Icon size={20} style={{ color: colorVar }} />
        </div>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  );

  const BarChart = ({
    data,
    title,
    icon: Icon,
    colorKey,
  }: {
    data: [string, number][];
    title: string;
    icon: LucideIcon;
    colorKey?: Record<string, string>;
  }) => {
    const maxValue = Math.max(...data.map((d) => d[1]));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 backdrop-blur-xl rounded-xl"
        style={{
          background: 'var(--gradient-card)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--color-shadow)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Icon size={18} style={{ color: 'var(--color-text-muted)' }} />
          <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h4>
        </div>
        <div className="space-y-3">
          {data.map(([label, value], index) => {
            const percentage = (value / maxValue) * 100;
            const color = colorKey?.[label] || getCategoryColor(label);

            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {getCategoryLabel(label)}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {value}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-surface)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const PieChart = ({ data, title }: { data: [string, number][]; title: string }) => {
    const total = data.reduce((sum, d) => sum + d[1], 0);
    let currentAngle = 0;

    const segments = data.map(([label, value]) => {
      const angle = (value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        label,
        value,
        angle,
        startAngle,
        color: getCategoryColor(label),
      };
    });

    const createArcPath = (startAngle: number, angle: number, radius: number = 80) => {
      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((startAngle + angle - 90) * Math.PI) / 180;

      const x1 = 100 + radius * Math.cos(startRad);
      const y1 = 100 + radius * Math.sin(startRad);
      const x2 = 100 + radius * Math.cos(endRad);
      const y2 = 100 + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 backdrop-blur-xl rounded-xl"
        style={{
          background: 'var(--gradient-card)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--color-shadow)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon size={18} style={{ color: 'var(--color-text-muted)' }} />
          <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h4>
        </div>

        <div className="flex items-center gap-6">
          <svg viewBox="0 0 200 200" className="w-32 h-32">
            {segments.map((segment, index) => (
              <motion.path
                key={segment.label}
                d={createArcPath(segment.startAngle, segment.angle)}
                fill={segment.color}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="cursor-pointer transition-transform origin-center"
                style={{ transformOrigin: '100px 100px' }}
              />
            ))}
            <circle cx="100" cy="100" r="40" fill="var(--color-surface)" />
            <text
              x="100"
              y="95"
              textAnchor="middle"
              style={{ fill: 'var(--color-text-primary)', fontSize: '18px', fontWeight: 'bold' }}
            >
              {total}
            </text>
            <text
              x="100"
              y="115"
              textAnchor="middle"
              style={{ fill: 'var(--color-text-muted)', fontSize: '12px' }}
            >
              总计
            </text>
          </svg>

          <div className="flex-1 space-y-2">
            {segments.slice(0, 5).map((segment, index) => (
              <motion.div
                key={segment.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {getCategoryLabel(segment.label)}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {((segment.value / total) * 100).toFixed(1)}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <BarChart3 size={24} style={{ color: 'var(--color-info)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            数据统计
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="实体总数"
            value={stats.totalEntities}
            icon={Layers}
            colorVar="var(--color-primary)"
          />
          <StatCard
            title="关系总数"
            value={stats.totalRelationships}
            icon={TrendingUp}
            colorVar="var(--color-secondary)"
          />
          <StatCard
            title="平均重要性"
            value={`${(stats.avgImportance * 100).toFixed(1)}%`}
            icon={Star}
            colorVar="var(--color-accent)"
          />
          <StatCard
            title="地域覆盖"
            value={stats.topRegions.length}
            icon={MapPin}
            colorVar="var(--color-primary)"
            subtitle={`${stats.topPeriods.length} 个时期`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PieChart data={Object.entries(stats.typeDistribution)} title="实体类型分布" />

          <BarChart
            data={Object.entries(stats.typeDistribution)}
            title="类型统计"
            icon={Layers}
            colorKey={CATEGORY_COLORS}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BarChart data={stats.topRegions} title="地域分布 TOP 5" icon={MapPin} />

          <BarChart data={stats.topPeriods} title="时期分布 TOP 5" icon={Clock} />
        </div>

        {Object.keys(stats.relationTypeDistribution).length > 0 && (
          <BarChart
            data={Object.entries(stats.relationTypeDistribution)}
            title="关系类型分布"
            icon={TrendingUp}
          />
        )}
      </div>
    </div>
  );
}
