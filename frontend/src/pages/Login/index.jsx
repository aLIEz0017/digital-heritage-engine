import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Sparkles, Wifi, WifiOff, UserCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/common/Toast';

const Login = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    loginWithCredentials,
    loginAsGuest,
    checkBackendStatus,
    isLoading,
    error,
    setError,
    backendAvailable,
  } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberChecked, setRememberChecked] = useState(true);
  const [checkingBackend, setCheckingBackend] = useState(true);

  const colors = {
    baseBg: 'bg-[#f8f6f1]',
    cardBg: 'bg-[#ffffff]',
    accentGold: 'bg-[#b89259]',
    accentGoldText: 'text-[#b89259]',
    textMain: 'text-[#3a3732]',
    textSub: 'text-[#7a756b]',
    border: 'border-[#ebe5d9]',
  };

  useEffect(() => {
    const checkStatus = async () => {
      setCheckingBackend(true);
      await checkBackendStatus();
      setCheckingBackend(false);
    };
    checkStatus();
  }, [checkBackendStatus]);

  useEffect(() => {
    const lastLoginUsername = localStorage.getItem('lastLoginUsername');
    if (lastLoginUsername) {
      setUsername(lastLoginUsername);
      const rememberedUserInfo = JSON.parse(localStorage.getItem('rememberedUserInfo') || '{}');
      const userRememberInfo = rememberedUserInfo[lastLoginUsername];

      if (userRememberInfo) {
        setPassword(userRememberInfo.password);
        setRememberChecked(true);
      } else {
        setPassword('');
        setRememberChecked(false);
      }
    }
  }, []);

  const handleUsernameChange = (val) => {
    setUsername(val);
    setError(null);
    if (!val) return;

    const rememberedUserInfo = JSON.parse(localStorage.getItem('rememberedUserInfo') || '{}');
    const userRememberInfo = rememberedUserInfo[val];

    if (userRememberInfo) {
      setPassword(userRememberInfo.password);
      setRememberChecked(true);
    } else {
      setPassword('');
      setRememberChecked(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.warning('请输入用户名');
      return;
    }

    if (!password.trim()) {
      toast.warning('请输入密码');
      return;
    }

    const result = await loginWithCredentials(username, password);

    if (result.success) {
      toast.success('登录成功', `欢迎回来：${username}`);

      localStorage.setItem('lastLoginUsername', username);

      const rememberedUserInfo = JSON.parse(localStorage.getItem('rememberedUserInfo') || '{}');
      if (rememberChecked) {
        rememberedUserInfo[username] = {
          password,
          remember: true,
        };
      } else {
        if (rememberedUserInfo[username]) delete rememberedUserInfo[username];
      }
      localStorage.setItem('rememberedUserInfo', JSON.stringify(rememberedUserInfo));

      navigate('/chat');
    } else {
      toast.error('登录失败', result.error || '用户名或密码错误');
    }
  };

  const handleGuestLogin = async () => {
    const result = await loginAsGuest();

    if (result.success) {
      toast.success('访客登录成功', '欢迎体验非遗数字生命');
      navigate('/chat');
    } else {
      toast.error('登录失败', result.error || '访客登录失败');
    }
  };

  return (
    <div className={`min-h-screen ${colors.baseBg} flex items-center justify-center p-4 font-sans`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md ${colors.cardBg} rounded-3xl shadow-[0_20px_60px_rgba(58,55,50,0.08)] p-8 md:p-10 border ${colors.border}`}
      >
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 mx-auto ${colors.baseBg} rounded-full flex items-center justify-center mb-4 border ${colors.border}`}
          >
            <Sparkles className={colors.accentGoldText} size={28} />
          </div>
          <h1 className={`text-3xl font-bold ${colors.textMain} font-serif tracking-widest`}>
            非遗数字平台
          </h1>
          <p className={`${colors.textSub} mt-2 font-light`}>欢迎登录</p>

          <AnimatePresence mode="wait">
            {checkingBackend ? (
              <motion.div
                key="checking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 mt-4 text-sm"
              >
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className={colors.textSub}>检测服务器状态...</span>
              </motion.div>
            ) : (
              <motion.div
                key="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex items-center justify-center gap-2 mt-4 text-sm ${
                  backendAvailable ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {backendAvailable ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>服务器在线 - 支持云端同步</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>离线模式 - 数据存储在本地</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <User
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:${colors.accentGoldText} transition-colors`}
                size={20}
              />
              <input
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 bg-[#f8f6f1] rounded-xl outline-none focus:ring-2 focus:ring-[#b89259]/50 focus:bg-white transition-all ${colors.textMain} border border-transparent focus:border-[#b89259]/30`}
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative group">
              <Lock
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:${colors.accentGoldText} transition-colors`}
                size={20}
              />
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className={`w-full pl-12 pr-4 py-3.5 bg-[#f8f6f1] rounded-xl outline-none focus:ring-2 focus:ring-[#b89259]/50 focus:bg-white transition-all ${colors.textMain} border border-transparent focus:border-[#b89259]/30`}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberChecked}
                onChange={(e) => setRememberChecked(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#b89259] focus:ring-[#b89259] transition-all cursor-pointer"
              />
              <span
                className={`${colors.textSub} group-hover:${colors.textMain} transition-colors`}
              >
                记住我
              </span>
            </label>
            <button type="button" className={`${colors.accentGoldText} hover:underline`}>
              忘记密码？
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 ${colors.accentGold} hover:bg-[#a6824c] disabled:bg-[#b89259]/50 disabled:cursor-not-allowed text-white rounded-xl font-medium tracking-widest shadow-lg shadow-[#b89259]/25 hover:shadow-[#b89259]/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                登 录 <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-[#ebe5d9]" />
          <span className={`${colors.textSub} text-sm`}>或</span>
          <div className="flex-1 h-px bg-[#ebe5d9]" />
        </div>

        <motion.button
          type="button"
          onClick={handleGuestLogin}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3.5 border-2 border-dashed border-[#b89259]/40 hover:border-[#b89259] ${colors.textMain} rounded-xl font-medium transition-all flex items-center justify-center gap-2 hover:bg-[#b89259]/5 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <UserCircle size={20} className={colors.accentGoldText} />
          以访客身份继续
          {!backendAvailable && <span className="text-xs text-amber-600 ml-1">(离线推荐)</span>}
        </motion.button>

        <div
          className={`text-center ${colors.textSub} text-sm pt-6 mt-6 border-t ${colors.border}`}
        >
          还没有账号？
          <button
            type="button"
            onClick={() => navigate('/register')}
            className={`${colors.accentGoldText} font-medium hover:underline ml-1`}
          >
            立即注册
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
