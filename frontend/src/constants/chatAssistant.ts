import aiAvatar from './ai.png';

/**
 * 对话里助手气泡、引用、搜索等处的显示名。
 */
export const CHAT_ASSISTANT_DISPLAY_NAME = '非遗小博士';

/**
 * 助手头像：通过 import 引入，由 Vite 打包为带 hash 的静态资源 URL，
 * 开发/生产、含子路径部署均可正确加载。
 */
export const CHAT_ASSISTANT_AVATAR_URL = aiAvatar;
