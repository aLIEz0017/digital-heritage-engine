import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatUIState {
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  networkMode: 'online' | 'offline';
  pendingSyncCount: number;

  showCommandPalette: boolean;
  showMessageSearch: boolean;
  showSessionSettings: boolean;
  showKeyboardShortcuts: boolean;
  showRightPanel: boolean;
  showSidebar: boolean;

  selectedMessages: Set<string>;
  autoScroll: boolean;
  quotedMessageId: string | null;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  setNetworkMode: (mode: 'online' | 'offline') => void;
  setPendingSyncCount: (count: number) => void;

  toggleCommandPalette: () => void;
  toggleMessageSearch: () => void;
  toggleSessionSettings: () => void;
  toggleKeyboardShortcuts: () => void;
  toggleRightPanel: () => void;
  toggleSidebar: () => void;

  setShowCommandPalette: (show: boolean) => void;
  setShowMessageSearch: (show: boolean) => void;
  setShowSessionSettings: (show: boolean) => void;
  setShowKeyboardShortcuts: (show: boolean) => void;
  setShowRightPanel: (show: boolean) => void;
  setShowSidebar: (show: boolean) => void;

  toggleMessageSelection: (messageId: string) => void;
  clearSelectedMessages: () => void;
  selectAllMessages: (messageIds: string[]) => void;

  setAutoScroll: (auto: boolean) => void;
  setQuotedMessage: (messageId: string | null) => void;

  reset: () => void;
}

const initialState = {
  isLoading: false,
  isStreaming: false,
  error: null,
  networkMode: 'offline' as const,
  pendingSyncCount: 0,
  showCommandPalette: false,
  showMessageSearch: false,
  showSessionSettings: false,
  showKeyboardShortcuts: false,
  showRightPanel: true,
  showSidebar: true,
  selectedMessages: new Set<string>(),
  autoScroll: true,
  quotedMessageId: null,
};

export const useChatUIStore = create<ChatUIState>()(
  persist(
    (set) => ({
      ...initialState,

      setLoading: (loading) => set({ isLoading: loading }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      setNetworkMode: (mode) => set({ networkMode: mode }),
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

      toggleCommandPalette: () =>
        set((state) => ({ showCommandPalette: !state.showCommandPalette })),
      toggleMessageSearch: () => set((state) => ({ showMessageSearch: !state.showMessageSearch })),
      toggleSessionSettings: () =>
        set((state) => ({ showSessionSettings: !state.showSessionSettings })),
      toggleKeyboardShortcuts: () =>
        set((state) => ({ showKeyboardShortcuts: !state.showKeyboardShortcuts })),
      toggleRightPanel: () => set((state) => ({ showRightPanel: !state.showRightPanel })),
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),

      setShowCommandPalette: (show) => set({ showCommandPalette: show }),
      setShowMessageSearch: (show) => set({ showMessageSearch: show }),
      setShowSessionSettings: (show) => set({ showSessionSettings: show }),
      setShowKeyboardShortcuts: (show) => set({ showKeyboardShortcuts: show }),
      setShowRightPanel: (show) => set({ showRightPanel: show }),
      setShowSidebar: (show) => set({ showSidebar: show }),

      toggleMessageSelection: (messageId) =>
        set((state) => {
          const newSelected = new Set(state.selectedMessages);
          if (newSelected.has(messageId)) {
            newSelected.delete(messageId);
          } else {
            newSelected.add(messageId);
          }
          return { selectedMessages: newSelected };
        }),

      clearSelectedMessages: () => set({ selectedMessages: new Set() }),

      selectAllMessages: (messageIds) => set({ selectedMessages: new Set(messageIds) }),

      setAutoScroll: (auto) => set({ autoScroll: auto }),
      setQuotedMessage: (messageId) => set({ quotedMessageId: messageId }),

      reset: () => set(initialState),
    }),
    {
      name: 'chat-ui-store',
      partialize: (state) => ({
        showRightPanel: state.showRightPanel,
        showSidebar: state.showSidebar,
        autoScroll: state.autoScroll,
      }),
    }
  )
);
