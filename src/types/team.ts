export type TeamRole = "owner" | "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "declined";

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  invited_by: string;
  status: InviteStatus;
  created_at: string;
  team_name?: string;
}
