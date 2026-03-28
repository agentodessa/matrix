export type WorkspaceType = "personal" | "team";

export interface Workspace {
  id: string;
  type: WorkspaceType;
  owner_id: string | null;
  team_id: string | null;
  created_at: string;
}
