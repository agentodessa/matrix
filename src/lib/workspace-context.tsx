import { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-store";
import { useTeams, useTeamMembers } from "@/lib/teams-store";
import { supabase } from "@/lib/supabase";
import type { Workspace } from "@/types/workspace";

interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string;
  workspaceType: "personal" | "team";
  workspaces: { id: string; name: string; type: "personal" | "team" }[];
  setWorkspace: (id: string) => void;
  workspaceRole: "personal" | "owner" | "admin" | "member";
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: "Personal",
  workspaceType: "personal",
  workspaces: [],
  setWorkspace: () => {},
  workspaceRole: "personal",
});

const STORAGE_KEY = "@executive_workspace";

export const useWorkspace = () => useContext(WorkspaceContext);
export const useWorkspaceRole = () => useContext(WorkspaceContext).workspaceRole;

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { teams } = useTeams();
  const [personalWs, setPersonalWs] = useState<Workspace | null>(null);
  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const userId = user?.id;
  const teamIds = teams.map((t) => t.id).join(",");

  useEffect(() => {
    if (!userId) { setPersonalWs(null); setTeamWorkspaces([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("workspaces").select("*").eq("type", "personal").eq("owner_id", userId).single();
      if (data) setPersonalWs(data as Workspace);
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (!teamIds) { setTeamWorkspaces([]); return; }
    const load = async () => {
      const ids = teamIds.split(",");
      const { data } = await supabase
        .from("workspaces").select("*").eq("type", "team").in("team_id", ids);
      if (data) setTeamWorkspaces(data as Workspace[]);
    };
    load();
  }, [teamIds]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => { if (saved) setActiveId(saved); });
  }, []);

  const allWorkspaces = useMemo(() => {
    const list: { id: string; name: string; type: "personal" | "team" }[] = [];
    if (personalWs) list.push({ id: personalWs.id, name: "Personal", type: "personal" });
    for (const tw of teamWorkspaces) {
      const team = teams.find((t) => t.id === tw.team_id);
      if (team) list.push({ id: tw.id, name: team.name, type: "team" });
    }
    return list;
  }, [personalWs, teamWorkspaces, teams]);

  const active = allWorkspaces.find((w) => w.id === activeId) ?? allWorkspaces[0] ?? null;

  const activeTeamId = teamWorkspaces.find((tw) => tw.id === active?.id)?.team_id ?? null;
  const { members } = useTeamMembers(active?.type === "team" ? activeTeamId : null);
  const myRole = useMemo(() => {
    if (!active || active.type === "personal") return "personal" as const;
    const me = members.find((m) => m.user_id === userId);
    return (me?.role ?? "member") as "owner" | "admin" | "member";
  }, [active, members, userId]);

  const setWorkspace = (id: string) => {
    setActiveId(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  };

  const value: WorkspaceContextValue = {
    workspaceId: active?.id ?? null,
    workspaceName: active?.name ?? "Personal",
    workspaceType: active?.type ?? "personal",
    workspaces: allWorkspaces,
    setWorkspace,
    workspaceRole: myRole,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
