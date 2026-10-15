import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, Compass, BarChart3, Link2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { loadHeritageGraphStats } from '../../services/heritageExplorationStats';

export default function UserCenter() {
  const { user, updateUser } = useAuthStore();

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [graphStats, setGraphStats] = useState(() => loadHeritageGraphStats(user?.id));

  const refreshStats = useCallback(() => {
    setGraphStats(loadHeritageGraphStats(user?.id));
  }, [user?.id]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const onUpdate = () => refreshStats();
    window.addEventListener('heritage-graph-stats-updated', onUpdate);
    return () => window.removeEventListener('heritage-graph-stats-updated', onUpdate);
  }, [refreshStats]);

  const username = user?.username || '游客';
  const userId = user?.id || '未登录';
  const identity = user?.is_active ? '非遗数字创作者' : '离线测试账号';

  const stripApiV1 = (raw) => (typeof raw === 'string' ? raw.replace(/\/api\/v1\/?$/, '') : '');
  const isHttpOrigin = (s) => /^https?:\/\//i.test(s);
  const fromViteUrl = stripApiV1(import.meta.env.VITE_API_URL);
  const fromViteBase = stripApiV1(import.meta.env.VITE_API_BASE_URL);
  const API_BASE_URL =
    (isHttpOrigin(fromViteUrl) ? fromViteUrl : null) ||
    (isHttpOrigin(fromViteBase) ? fromViteBase : null) ||
    fromViteUrl ||
    fromViteBase ||
    window.location.origin;

  const normalizeAvatarUrl = (rawUrl) => {
    if (!rawUrl) return null;
    if (!rawUrl.startsWith('http')) {
      return `${API_BASE_URL}/${rawUrl.replace(/^\//, '')}`;
    }

    try {
      const parsed = new URL(rawUrl);
      const isLoopbackHost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1';

      if (!isLoopbackHost) {
        return rawUrl;
      }

      const serverBase = new URL(API_BASE_URL);
      parsed.protocol = serverBase.protocol;
      parsed.host = serverBase.host;
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  };

  const avatarUrl = normalizeAvatarUrl(user?.avatar);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片不能超过 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE_URL}/api/v1/user/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!resp.ok) throw new Error('上传失败');

      const data = await resp.json();
      const newAvatarUrl = data.avatar_url;

      updateUser({ avatar: newAvatarUrl });
      alert('头像上传成功！');
    } catch (error) {
      console.error('上传头像出错:', error);
      alert('上传头像失败，请检查网络或后端服务');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const colors = {
    baseBg: 'bg-[#f8f6f1]',
    cardBg: 'bg-[#ffffff]',
    accentGold: 'bg-[#b89259]',
    accentGoldText: 'text-[#b89259]',
    accentGoldBorder: 'border-[#b89259]',
    textMain: 'text-[#3a3732]',
    textSub: 'text-[#7a756b]',
    border: 'border-[#ebe5d9]',
  };

  const nodeCount = graphStats.totalEntitiesProduced;
  const relCount = graphStats.totalRelationsProduced;

  return (
    <div
      className={`min-h-[calc(100vh-64px)] ${colors.baseBg} font-sans selection:bg-[#b89259]/20 selection:${colors.accentGoldText}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className="max-w-6xl mx-auto p-5 md:p-16">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-12 md:mb-16">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative shrink-0 cursor-pointer group"
            onClick={() => !isUploading && fileInputRef.current.click()}
          >
            <div
              className={`w-40 h-40 md:w-48 md:h-48 rounded-full ${colors.cardBg} border-4 border-white shadow-[0_8px_30px_rgba(184,146,89,0.15)] flex items-center justify-center overflow-hidden relative`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center text-[#b89259]">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-sm">上传中</span>
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="用户头像" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#f2efe9] to-[#e6dfd1] flex items-center justify-center text-[#b89259]">
                  <span className="text-5xl font-serif">{username.charAt(0).toUpperCase()}</span>
                </div>
              )}

              {!isUploading && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Camera size={28} className="mb-2" />
                  <span className="text-sm tracking-wider">更换</span>
                </div>
              )}
            </div>

            <div
              className={`absolute bottom-2 right-2 w-10 h-10 rounded-full ${colors.accentGold} flex items-center justify-center border-4 border-[#f8f6f1] text-white shadow-md`}
            >
              <Compass size={18} />
            </div>
          </motion.div>

          <div className="flex-1 flex flex-col justify-center w-full mt-4 md:mt-8 text-center md:text-left">
            <h1 className={`text-4xl md:text-5xl font-bold tracking-widest ${colors.textMain} font-serif`}>
              {username}
            </h1>

            <div className={`w-full max-w-xl h-[1px] bg-[#d1ccc0] my-5 relative mx-auto md:mx-0`}>
              <div className={`absolute left-0 -top-[2px] w-[5px] h-[5px] rounded-full ${colors.accentGold}`} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 justify-center md:justify-start">
              <p className={`${colors.textSub} tracking-wider font-light`}>
                用户ID: <span className="font-mono text-[#3a3732]">{userId}</span>
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 bg-[#f2efe9] ${colors.accentGoldText} rounded-md text-sm border ${colors.border} mx-auto md:mx-0`}
              >
                {identity}
              </span>
            </div>
          </div>
        </div>

        {/* 非遗探索 · 双模块统计 */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          <div className="text-center">
            <div
              className="inline-flex items-center justify-center w-11 h-11 rounded-full mb-4 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
            >
              <Compass size={22} className="text-white" />
            </div>
            <h2 className={`text-2xl md:text-3xl font-serif font-semibold ${colors.textMain} tracking-wide`}>
              ✨ 开始你的非遗探索之旅 ✨
            </h2>
            <p className={`mt-2 text-sm md:text-base ${colors.textSub} font-light`}>
              在聊天页面生成知识图谱，节点与关系统计将累计展示于此
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div
              className={`rounded-2xl ${colors.cardBg} border ${colors.border} shadow-[0_12px_40px_rgba(58,55,50,0.06)] px-6 py-8 flex flex-col items-center text-center`}
            >
              <div className="flex items-center gap-2 mb-4 text-violet-500/90">
                <BarChart3 size={22} strokeWidth={2} />
                <span className={`text-sm font-medium tracking-widest ${colors.textSub}`}>知识节点</span>
              </div>
              <p className={`text-4xl md:text-5xl font-semibold tabular-nums ${colors.textMain} font-serif`}>
                {nodeCount > 0 ? nodeCount.toLocaleString('zh-CN') : '暂无数据'}
              </p>
              <p className={`mt-3 text-xs ${colors.textSub}`}>累计从对话中生成的实体节点数</p>
            </div>

            <div
              className={`rounded-2xl ${colors.cardBg} border ${colors.border} shadow-[0_12px_40px_rgba(58,55,50,0.06)] px-6 py-8 flex flex-col items-center text-center`}
            >
              <div className="flex items-center gap-2 mb-4 text-rose-400/90">
                <Link2 size={22} strokeWidth={2} />
                <span className={`text-sm font-medium tracking-widest ${colors.textSub}`}>关系连接</span>
              </div>
              <p className={`text-4xl md:text-5xl font-semibold tabular-nums ${colors.textMain} font-serif`}>
                {relCount > 0 ? relCount.toLocaleString('zh-CN') : '暂无数据'}
              </p>
              <p className={`mt-3 text-xs ${colors.textSub}`}>累计从对话中生成的关系边数</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
