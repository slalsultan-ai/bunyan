'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface ChildData {
  id: string;
  name: string;
  age: number;
  ageGroup: string;
  role?: 'owner' | 'follower';
}

interface SelectedChildContextValue {
  children: ChildData[];
  selectedChild: ChildData | null;
  setSelectedChildId: (id: string | null) => void;
  setChildren: (children: ChildData[]) => void;
  isLoggedIn: boolean;
  loading: boolean;
}

const SelectedChildContext = createContext<SelectedChildContextValue>({
  children: [],
  selectedChild: null,
  setSelectedChildId: () => {},
  setChildren: () => {},
  isLoggedIn: false,
  loading: true,
});

const STORAGE_KEY = 'selectedChildId';

export function SelectedChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedId(stored);
  }, []);

  // Fetch auth state + children
  useEffect(() => {
    if (!mounted) return;
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.parent) {
          setIsLoggedIn(true);
          setChildrenList(data.children || []);
          // Auto-select: if stored id not in list, select first child
          const storedId = localStorage.getItem(STORAGE_KEY);
          const ids = (data.children || []).map((c: ChildData) => c.id);
          if (storedId && ids.includes(storedId)) {
            setSelectedId(storedId);
          } else if (ids.length > 0) {
            setSelectedId(ids[0]);
            localStorage.setItem(STORAGE_KEY, ids[0]);
          }
        } else {
          setIsLoggedIn(false);
          setChildrenList([]);
          setSelectedId(null);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, [mounted]);

  const setSelectedChildId = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setChildren = useCallback((list: ChildData[]) => {
    setChildrenList(list);
    // If current selection is no longer valid, select first
    if (selectedId && !list.find(c => c.id === selectedId) && list.length > 0) {
      setSelectedChildId(list[0].id);
    }
  }, [selectedId, setSelectedChildId]);

  const selectedChild = childrenList.find(c => c.id === selectedId) || null;

  return (
    <SelectedChildContext.Provider value={{
      children: childrenList,
      selectedChild,
      setSelectedChildId,
      setChildren,
      isLoggedIn,
      loading,
    }}>
      {reactChildren}
    </SelectedChildContext.Provider>
  );
}

export function useSelectedChild() {
  return useContext(SelectedChildContext);
}
