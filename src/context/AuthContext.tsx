import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const AUTH_ASSOCIATION_KEY = "evalu8.currentAssociationId";

export type AssociationUser = {
  association_id: string;
  roles: string[];
  status: "active" | "inactive";
  association: {
    id: string;
    name: string;
    status: string;
  };
};

type Role = "Administrator" | "Evaluator" | "Intake Personnel" | string;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  associations: AssociationUser[];
  currentAssociation: AssociationUser | null;
  setCurrentAssociationId: (associationId: string) => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [associations, setAssociations] = useState<AssociationUser[]>([]);
  const [currentAssociationId, setCurrentAssociationIdState] = useState<
    string | null
  >(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(AUTH_ASSOCIATION_KEY)
      : null
  );

  const setCurrentAssociationIdHandler = useCallback(
    async (associationId: string) => {
      setCurrentAssociationIdState(associationId);
      window.localStorage.setItem(AUTH_ASSOCIATION_KEY, associationId);

      try {
        const { error } = await supabase.rpc("set_association_context", {
          association: associationId,
        });

        if (error) {
          console.error("Failed to set association context", error.message);
        }
      } catch (error) {
        console.error("Unexpected error setting association context", error);
      }
    },
    []
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAssociations = async () => {
      if (!user) {
        setAssociations([]);
        setCurrentAssociationIdState(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_ASSOCIATION_KEY);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("association_users")
          .select(
            `association_id, roles, status, association:associations!inner ( id, name, status )`
          )
          .eq("user_id", user.id)
          .eq("status", "active");

        if (error) {
          console.error(
            "Error fetching association memberships",
            error.message
          );
          setAssociations([]);
          return;
        }

        const activeAssociations = (data ?? []).filter(
          (item) => item.association?.status === "active"
        ) as AssociationUser[];

        setAssociations(activeAssociations);

        if (!activeAssociations.length) {
          setCurrentAssociationIdState(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(AUTH_ASSOCIATION_KEY);
          }
          return;
        }

        const storedAssociationId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(AUTH_ASSOCIATION_KEY)
            : null;

        const defaultAssociationId = activeAssociations[0]?.association_id;
        const validAssociationId = activeAssociations.some(
          (membership) => membership.association_id === storedAssociationId
        )
          ? storedAssociationId
          : defaultAssociationId;

        if (validAssociationId) {
          await setCurrentAssociationIdHandler(validAssociationId);
        }
      } catch (error) {
        console.error(
          "Unexpected error loading association memberships",
          error
        );
        setAssociations([]);
      }
    };

    void fetchAssociations();
  }, [user, setCurrentAssociationIdHandler]);

  useEffect(() => {
    const applyAssociationContext = async () => {
      if (!user || !currentAssociationId) {
        return;
      }

      try {
        const { error } = await supabase.rpc("set_association_context", {
          association: currentAssociationId,
        });

        if (error) {
          console.error("Failed to set association context", error.message);
        }
      } catch (error) {
        console.error("Unexpected error setting association context", error);
      }
    };

    void applyAssociationContext();
  }, [user, currentAssociationId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setAssociations([]);
    setCurrentAssociationIdState(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_ASSOCIATION_KEY);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Error signing in with Google:", error.message);
    }
  };

  const currentAssociation = useMemo(() => {
    if (!currentAssociationId) {
      return null;
    }

    return (
      associations.find(
        (membership) => membership.association_id === currentAssociationId
      ) ?? null
    );
  }, [associations, currentAssociationId]);

  const hasRole = useCallback(
    (role: Role) => {
      if (!currentAssociation) {
        return false;
      }

      return currentAssociation.roles.includes(role);
    },
    [currentAssociation]
  );

  const hasAnyRole = useCallback(
    (roles: Role[]) => {
      if (!currentAssociation) {
        return false;
      }

      return roles.some((role) => currentAssociation.roles.includes(role));
    },
    [currentAssociation]
  );

  const value = {
    user,
    session,
    loading,
    associations,
    currentAssociation,
    setCurrentAssociationId: setCurrentAssociationIdHandler,
    hasRole,
    hasAnyRole,
    signOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
