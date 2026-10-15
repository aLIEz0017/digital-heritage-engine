import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Link2, Save, AlertCircle, ChevronDown, Search } from 'lucide-react';
import { knowledgeApi, Entity, RelationshipCreate } from '../../../api/knowledge';
import { knowledgeOfflineStorage } from '../../../services/knowledgeOfflineStorage';
import { useToast } from '../../common/Toast';

interface EntityFormData {
  name: string;
  type: string;
  description: string;
  region: string;
  period: string;
  importance: number;
}

interface RelationshipFormData {
  source_id: string;
  target_id: string;
  relation_type: string;
  weight: number;
}

const ENTITY_TYPES = [
  { value: 'inheritor', label: '传承人', colorVar: 'var(--color-primary)' },
  { value: 'technique', label: '技艺', colorVar: 'var(--color-secondary)' },
  { value: 'work', label: '作品', colorVar: 'var(--color-accent)' },
  { value: 'pattern', label: '纹样', colorVar: 'var(--color-error)' },
  { value: 'region', label: '地域', colorVar: 'var(--color-info)' },
  { value: 'period', label: '时期', colorVar: 'var(--color-primary)' },
  { value: 'material', label: '材料', colorVar: 'var(--color-success)' },
];

const RELATION_TYPES = [
  '传承',
  '创作',
  '包含',
  '产地',
  '时期',
  '使用',
  '相关',
  '衍生',
  '影响',
  '组合',
];

const defaultEntityForm: EntityFormData = {
  name: '',
  type: 'technique',
  description: '',
  region: '',
  period: '',
  importance: 0.5,
};

const defaultRelationshipForm: RelationshipFormData = {
  source_id: '',
  target_id: '',
  relation_type: '相关',
  weight: 1.0,
};

interface EntityEditorProps {
  entityId?: string;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
}

export function EntityEditor({ entityId, onSave, onCancel }: EntityEditorProps) {
  const [formData, setFormData] = useState<EntityFormData>(defaultEntityForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EntityFormData, string>>>({});
  const toast = useToast();

  const loadEntity = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const entity = await knowledgeApi.getEntity(id);
        setFormData({
          name: entity.name,
          type: entity.type,
          description: entity.description || '',
          region: entity.region || '',
          period: entity.period || '',
          importance: entity.importance || 0.5,
        });
      } catch (error) {
        console.error('Failed to load entity:', error);
        toast.error('加载失败', '无法加载实体数据');
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (entityId) {
      loadEntity(entityId);
    }
  }, [entityId, loadEntity]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EntityFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '实体名称不能为空';
    } else if (formData.name.length > 100) {
      newErrors.name = '实体名称不能超过100个字符';
    }

    if (!formData.type) {
      newErrors.type = '请选择实体类型';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = '描述不能超过1000个字符';
    }

    if (formData.importance < 0 || formData.importance > 1) {
      newErrors.importance = '重要性必须在0-1之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let entity;
      if (entityId) {
        entity = await knowledgeApi.updateEntity(entityId, formData);
        toast.success('更新成功', '实体已更新');
      } else {
        entity = await knowledgeApi.createEntity(formData);
        toast.success('创建成功', '实体已创建');
      }

      await knowledgeOfflineStorage.saveEntity({
        ...entity,
        cachedAt: Date.now(),
      });
      onSave(entity);
    } catch (error) {
      console.error('Failed to save entity:', error);
      toast.error('保存失败', '无法保存实体');

      await knowledgeOfflineStorage.addPendingOperation({
        type: entityId ? 'update_entity' : 'create_entity',
        data: { id: entityId, ...formData },
        maxRetries: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof EntityFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
      style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <Edit3 size={20} style={{ color: 'var(--color-info)' }} />
          {entityId ? '编辑实体' : '创建实体'}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            实体名称 <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="输入实体名称"
            className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${errors.name ? 'var(--color-error)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
            }}
          />
          {errors.name && (
            <p
              className="mt-1 text-sm flex items-center gap-1"
              style={{ color: 'var(--color-error)' }}
            >
              <AlertCircle size={14} />
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            实体类型 <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <div className="relative">
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl appearance-none focus:outline-none transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            />
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="输入实体描述"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all resize-none"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${errors.description ? 'var(--color-error)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
            }}
          />
          {errors.description && (
            <p
              className="mt-1 text-sm flex items-center gap-1"
              style={{ color: 'var(--color-error)' }}
            >
              <AlertCircle size={14} />
              {errors.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              地域
            </label>
            <input
              type="text"
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              placeholder="如：北京、苏州"
              className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              时期
            </label>
            <input
              type="text"
              value={formData.period}
              onChange={(e) => handleChange('period', e.target.value)}
              placeholder="如：明清、现代"
              className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            重要性: {(formData.importance * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={formData.importance}
            onChange={(e) => handleChange('importance', parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ background: 'var(--color-surface)', accentColor: 'var(--color-primary)' }}
          />
        </div>
      </div>

      <div
        className="flex items-center justify-end gap-3 mt-6 pt-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onCancel}
          className="px-4 py-2 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
          style={{
            background: 'var(--gradient-primary)',
            color: 'var(--color-text-inverse)',
          }}
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
          ) : (
            <Save size={16} />
          )}
          {entityId ? '更新' : '创建'}
        </button>
      </div>
    </motion.div>
  );
}

interface RelationshipEditorProps {
  sourceId?: string;
  targetId?: string;
  onSave: (relationship: RelationshipCreate) => void;
  onCancel: () => void;
}

export function RelationshipEditor({
  sourceId,
  targetId,
  onSave,
  onCancel,
}: RelationshipEditorProps) {
  const [formData, setFormData] = useState<RelationshipFormData>({
    ...defaultRelationshipForm,
    source_id: sourceId || '',
    target_id: targetId || '',
  });
  const [entities, setEntities] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RelationshipFormData, string>>>({});
  const toast = useToast();

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const response = await knowledgeApi.search({});
      setEntities(response.results);
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  };

  const filteredEntities = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      e.id !== (formData.source_id === e.id ? formData.target_id : formData.source_id)
  );

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RelationshipFormData, string>> = {};

    if (!formData.source_id) {
      newErrors.source_id = '请选择源实体';
    }

    if (!formData.target_id) {
      newErrors.target_id = '请选择目标实体';
    }

    if (formData.source_id === formData.target_id) {
      newErrors.target_id = '源实体和目标实体不能相同';
    }

    if (!formData.relation_type) {
      newErrors.relation_type = '请选择关系类型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const relationship = await knowledgeApi.createRelationship(formData);
      toast.success('创建成功', '关系已创建');

      await knowledgeOfflineStorage.saveRelationship({
        ...relationship,
        cachedAt: Date.now(),
      });
      onSave(relationship);
    } catch (error) {
      console.error('Failed to create relationship:', error);
      toast.error('创建失败', '无法创建关系');

      await knowledgeOfflineStorage.addPendingOperation({
        type: 'create_relationship',
        data: formData,
        maxRetries: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  const getEntityName = (id: string) => {
    return entities.find((e) => e.id === id)?.name || '未知实体';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
      style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <Link2 size={20} style={{ color: 'var(--color-primary)' }} />
          创建关系
        </h3>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索实体..."
            className="w-full pl-10 pr-4 py-2 rounded-xl focus:outline-none"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            源实体 <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            value={formData.source_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, source_id: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl focus:outline-none"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${errors.source_id ? 'var(--color-error)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">选择源实体</option>
            {filteredEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({ENTITY_TYPES.find((t) => t.value === entity.type)?.label})
              </option>
            ))}
          </select>
          {errors.source_id && (
            <p
              className="mt-1 text-sm flex items-center gap-1"
              style={{ color: 'var(--color-error)' }}
            >
              <AlertCircle size={14} />
              {errors.source_id}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            关系类型 <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            value={formData.relation_type}
            onChange={(e) => setFormData((prev) => ({ ...prev, relation_type: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl focus:outline-none"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${errors.relation_type ? 'var(--color-error)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
            }}
          >
            {RELATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            目标实体 <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            value={formData.target_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, target_id: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl focus:outline-none"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${errors.target_id ? 'var(--color-error)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">选择目标实体</option>
            {filteredEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({ENTITY_TYPES.find((t) => t.value === entity.type)?.label})
              </option>
            ))}
          </select>
          {errors.target_id && (
            <p
              className="mt-1 text-sm flex items-center gap-1"
              style={{ color: 'var(--color-error)' }}
            >
              <AlertCircle size={14} />
              {errors.target_id}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            关系权重: {formData.weight.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={formData.weight}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, weight: parseFloat(e.target.value) }))
            }
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ background: 'var(--color-surface)', accentColor: 'var(--color-primary)' }}
          />
        </div>

        {formData.source_id && formData.target_id && (
          <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface)' }}>
            <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
              <span style={{ color: 'var(--color-info)' }} className="font-medium">
                {getEntityName(formData.source_id)}
              </span>
              <span className="mx-2" style={{ color: 'var(--color-primary)' }}>
                —— {formData.relation_type} ——
              </span>
              <span style={{ color: 'var(--color-secondary)' }} className="font-medium">
                {getEntityName(formData.target_id)}
              </span>
            </p>
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-end gap-3 mt-6 pt-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onCancel}
          className="px-4 py-2 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
          style={{
            background: 'var(--gradient-secondary)',
            color: 'var(--color-text-inverse)',
          }}
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
          ) : (
            <Link2 size={16} />
          )}
          创建关系
        </button>
      </div>
    </motion.div>
  );
}

interface InlineEditPanelProps {
  mode: 'entity' | 'relationship';
  entityId?: string;
  sourceId?: string;
  targetId?: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function InlineEditPanel({
  mode,
  entityId,
  sourceId,
  targetId,
  onClose,
  onRefresh,
}: InlineEditPanelProps) {
  const handleSave = useCallback(() => {
    onRefresh();
    onClose();
  }, [onRefresh, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {mode === 'entity' ? (
          <EntityEditor entityId={entityId} onSave={handleSave} onCancel={onClose} />
        ) : (
          <RelationshipEditor
            sourceId={sourceId}
            targetId={targetId}
            onSave={handleSave}
            onCancel={onClose}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
