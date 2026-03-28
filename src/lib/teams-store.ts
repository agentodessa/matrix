import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth-store";
import type { Team, TeamMember, TeamInvite } from "@/types/team";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/* ── Helper ── */

export const generateInviteCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

/* ── Query hooks ── */

export const useTeams = () => {
  const { user } = useAuth();
  const query = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
  return { teams: query.data ?? [], ...query };
};

export const useTeamMembers = (teamId: string | null) => {
  const { user } = useAuth();
  const query = useQuery<TeamMember[]>({
    queryKey: ["team_members", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!teamId,
  });
  return { members: query.data ?? [], ...query };
};

export const useTeamInvites = (teamId: string | null) => {
  const { user } = useAuth();
  const query = useQuery<TeamInvite[]>({
    queryKey: ["team_invites", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", teamId!)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!teamId,
  });
  return { invites: query.data ?? [], ...query };
};

export const usePendingInvites = () => {
  const { user } = useAuth();
  const query = useQuery<(TeamInvite & { team_name: string })[]>({
    queryKey: ["pending_invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*, teams(name)")
        .eq("email", user!.email!)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        team_name: row.teams?.name ?? "",
        teams: undefined,
      }));
    },
    enabled: !!user?.email,
  });
  return { invites: query.data ?? [], ...query };
};

/* ── Mutations ── */

export const useTeamMutations = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  const createTeam = useMutation({
    mutationFn: async (name: string) => {
      const invite_code = generateInviteCode();
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name, invite_code, owner_id: user!.id })
        .select()
        .single();
      if (teamError) throw teamError;
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: user!.id, role: "owner" });
      if (memberError) throw memberError;
      // Create team workspace
      const { error: wsErr } = await supabase
        .from("workspaces")
        .insert({ type: "team", team_id: team.id });
      if (wsErr) throw wsErr;
      return team as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team_members"] });
    },
  });

  const inviteByEmail = useMutation({
    mutationFn: async ({ teamId, email }: { teamId: string; email: string }) => {
      const { error } = await supabase
        .from("team_invites")
        .insert({ team_id: teamId, email, invited_by: user!.id, status: "pending" });
      if (error) throw error;
    },
    onSuccess: (_data, { teamId }) => {
      qc.invalidateQueries({ queryKey: ["team_invites", teamId] });
    },
  });

  const joinByCode = useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", inviteCode)
        .single();
      if (teamError) throw new Error("Invalid invite code");
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: user!.id, role: "member" });
      if (memberError) {
        if (memberError.code === "23505") throw new Error("Already a member");
        throw memberError;
      }
      return team as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team_members"] });
    },
  });

  const acceptInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data: invite, error: fetchError } = await supabase
        .from("team_invites")
        .select("*")
        .eq("id", inviteId)
        .single();
      if (fetchError) throw fetchError;
      const { error: updateError } = await supabase
        .from("team_invites")
        .update({ status: "accepted" })
        .eq("id", inviteId);
      if (updateError) throw updateError;
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({ team_id: invite.team_id, user_id: user!.id, role: "member" });
      if (memberError && memberError.code !== "23505") throw memberError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team_members"] });
      qc.invalidateQueries({ queryKey: ["team_invites"] });
      qc.invalidateQueries({ queryKey: ["pending_invites"] });
    },
  });

  const declineInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("team_invites")
        .update({ status: "declined" })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_invites"] });
      qc.invalidateQueries({ queryKey: ["pending_invites"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { teamId }) => {
      qc.invalidateQueries({ queryKey: ["team_members", teamId] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      teamId,
      userId,
      role,
    }: {
      teamId: string;
      userId: string;
      role: string;
    }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role })
        .eq("team_id", teamId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { teamId }) => {
      qc.invalidateQueries({ queryKey: ["team_members", teamId] });
    },
  });

  const leaveTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team_members"] });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team_members"] });
      qc.invalidateQueries({ queryKey: ["team_invites"] });
    },
  });

  return {
    createTeam,
    inviteByEmail,
    joinByCode,
    acceptInvite,
    declineInvite,
    removeMember,
    updateRole,
    leaveTeam,
    deleteTeam,
  };
};

/* ── Pending Join ── */

export const usePendingJoin = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { joinByCode } = useTeamMutations();
  const joinRef = useRef(joinByCode);
  joinRef.current = joinByCode;

  useEffect(() => {
    if (!userId) return;

    AsyncStorage.getItem("@executive_pending_join").then((code) => {
      if (!code) return;
      AsyncStorage.removeItem("@executive_pending_join");
      joinRef.current.mutate(code, {
        onSuccess: (team) => {
          router.replace(`/team/${team.id}`);
        },
      });
    });
  }, [userId]);
};
