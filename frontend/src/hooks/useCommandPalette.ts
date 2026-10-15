import { useState, useCallback, useMemo } from 'react';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  category: 'navigation' | 'action' | 'settings';
  action: () => void;
}

interface UseCommandPaletteReturn {
  isOpen: boolean;
  query: string;
  filteredCommands: Command[];
  openPalette: () => void;
  closePalette: () => void;
  setQuery: (query: string) => void;
  executeCommand: (commandId: string) => void;
  registerCommand: (command: Command) => void;
  unregisterCommand: (commandId: string) => void;
}

const defaultCommands: Command[] = [
  {
    id: 'new_chat',
    label: '新建对话',
    shortcut: 'Ctrl+N',
    category: 'action',
    action: () => console.log('New chat'),
  },
  {
    id: 'search_messages',
    label: '搜索消息',
    shortcut: 'Ctrl+F',
    category: 'action',
    action: () => console.log('Search messages'),
  },
  {
    id: 'toggle_theme',
    label: '切换主题',
    shortcut: 'Ctrl+D',
    category: 'settings',
    action: () => console.log('Toggle theme'),
  },
  {
    id: 'keyboard_shortcuts',
    label: '键盘快捷键',
    shortcut: 'Ctrl+/',
    category: 'settings',
    action: () => console.log('Keyboard shortcuts'),
  },
];

export function useCommandPalette(): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [commands, setCommands] = useState<Command[]>(defaultCommands);

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return commands;
    }

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.id.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  const executeCommand = useCallback(
    (commandId: string) => {
      const command = commands.find((cmd) => cmd.id === commandId);
      if (command) {
        command.action();
        closePalette();
      }
    },
    [commands, closePalette]
  );

  const registerCommand = useCallback((command: Command) => {
    setCommands((prev) => [...prev, command]);
  }, []);

  const unregisterCommand = useCallback((commandId: string) => {
    setCommands((prev) => prev.filter((cmd) => cmd.id !== commandId));
  }, []);

  return {
    isOpen,
    query,
    filteredCommands,
    openPalette,
    closePalette,
    setQuery,
    executeCommand,
    registerCommand,
    unregisterCommand,
  };
}
