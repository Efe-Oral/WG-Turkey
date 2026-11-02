"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toggleFavorite as toggleFavoriteAction } from "@/lib/listings/engagement";

// The form and its validation only load when someone opens the modal.
const AuthModal = dynamic(
  () => import("./AuthModal").then((module) => module.AuthModal),
  { ssr: false },
);

export type ClientViewer = {
  id: string;
  name: string | null;
  isAdmin: boolean;
  onboarded: boolean;
};

type AuthContextValue = {
  viewer: ClientViewer | null;
  /** Runs the action now if logged in, otherwise after a successful login. */
  requireAuth: (action?: () => void) => void;
  favoriteIds: ReadonlySet<string>;
  toggleFavorite: (listingId: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  viewer: ClientViewer | null;
  favoriteIds: string[];
  children: ReactNode;
};

export function AuthProvider({
  viewer,
  favoriteIds: initialFavorites,
  children,
}: AuthProviderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(viewer !== null && !viewer.onboarded);
  const [favoriteOverrides, setFavoriteOverrides] = useState(
    () => new Map<string, boolean>(),
  );
  const pendingAction = useRef<(() => void) | undefined>(undefined);

  const favoriteIds = useMemo(() => {
    const ids = new Set(initialFavorites);
    for (const [id, favorited] of favoriteOverrides) {
      if (favorited) ids.add(id);
      else ids.delete(id);
    }
    return ids;
  }, [initialFavorites, favoriteOverrides]);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (viewer?.onboarded) {
        action?.();
        return;
      }
      pendingAction.current = action;
      setOpen(true);
    },
    [viewer],
  );

  const setOverride = useCallback((id: string, favorited: boolean) => {
    setFavoriteOverrides((current) => new Map(current).set(id, favorited));
  }, []);

  const toggleFavorite = useCallback(
    (listingId: string) => {
      requireAuth(() => {
        const next = !favoriteIds.has(listingId);
        setOverride(listingId, next);

        void toggleFavoriteAction(listingId).then((result) => {
          if (!result.ok) setOverride(listingId, !next);
        });
      });
    },
    [favoriteIds, requireAuth, setOverride],
  );

  const onDone = useCallback(() => {
    setOpen(false);
    router.refresh();
    pendingAction.current?.();
    pendingAction.current = undefined;
  }, [router]);

  const value = useMemo(
    () => ({ viewer, requireAuth, favoriteIds, toggleFavorite }),
    [viewer, requireAuth, favoriteIds, toggleFavorite],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {open ? (
        <AuthModal
          open={open}
          onOpenChange={setOpen}
          onDone={onDone}
          needsOnboarding={viewer !== null && !viewer.onboarded}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
