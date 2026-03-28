import { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-store";
import { useTeams } from "@/lib/teams-store";
import { supabase } from "@/lib/supabase";
import type { Workspace } from "@/types/workspace";

interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string;
  workspaceType: "personal" | "team";
  workspaces: { id: string; name: string; type: "personal" | "team" }[];
  setWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: "Personal",
  workspaceType: "personal",
  workspaces: [],
  setWorkspace: () => {},
});

const STORAGE_KEY = "@executive_workspace";

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { teams } = useTeams();
  const [personalWs, setPersonalWs] = useState<Workspace | null>(null);
  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setPersonalWs(null); setTeamWorkspaces([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("workspaces").select("*").eq("type", "personal").eq("owner_id", user.id).single();
      if (data) setPersonalWs(data as Workspace);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (teams.length === 0) { setTeamWorkspaces([]); return; }
    const load = async () => {
      const teamIds = teams.map((t) => t.id);
      const { data } = await supabase
        .from("workspaces").select("*").eq("type", "team").in("team_id", teamIds);
      if (data) setTeamWorkspaces(data as Workspace[]);
    };
    load();
  }, [teams]);

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
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
