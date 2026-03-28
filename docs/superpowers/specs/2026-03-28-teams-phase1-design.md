# Shared Boards — Phase 1: Teams & Membership

## Overview

Add team creation, member management, and invite flows to The Executive. This is Phase 1 of the shared boards feature — it establishes the team infrastructure without changing task/project ownership (that's Phase 2).

**Phased Roadmap:**
1. **Phase 1 — Teams & Membership** (this spec)
2. Phase 2 — Shared Data Layer (workspace switcher, task/project ownership by team)
3. Phase 3 — Permissions (role-based access control on operations)
4. Phase 4 — Pro Team Billing ($4.99 base + $2.99/member, owner-pays)

## Key Decisions

- A user can belong to **multiple teams** and always keeps their **personal workspace**
- Teams have 3 roles: **owner**, **admin**, **member**
- Invites work via **email** and **shareable link** (deep link with invite code)
- Owner pays for the team (billing is Phase 4 — no payment gating in Phase 1)
- No workspace switcher or shared tasks yet — Phase 1 is membership infrastructure only

## Data Model

### `teams` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `name` | TEXT | NOT NULL |
| `invite_code` | TEXT | NOT NULL, UNIQUE |
| `owner_id` | UUID | NOT NULL, FK → `auth.users` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### `team_members` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `team_id` | UUID | NOT NULL, FK → `teams` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL, FK → `auth.users` ON DELETE CASCADE |
| `role` | TEXT | NOT NULL, CHECK `role IN ('owner', 'admin', 'member')` |
| `joined_at` | TIMESTAMPTZ | DEFAULT `now()` |
| | | UNIQUE `(team_id, user_id)` |

The owner is always also a row in `team_members` with `role = 'owner'`. This keeps membership queries uniform — no need to join `teams.owner_id` separately.

### `team_invites` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `team_id` | UUID | NOT NULL, FK → `teams` ON DELETE CASCADE |
| `email` | TEXT | NOT NULL |
| `invited_by` | UUID | NOT NULL, FK → `auth.users` |
| `status` | TEXT | NOT NULL, DEFAULT `'pending'`, CHECK `status IN ('pending', 'accepted', 'declined')` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |
| | | UNIQUE `(team_id, email)` |

## RLS Policies

### `teams`
- **SELECT**: user is a member of the team (`EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid())`)
- **INSERT**: any authenticated user
- **UPDATE**: owner only (`owner_id = auth.uid()`)
- **DELETE**: owner only (`owner_id = auth.uid()`)

### `team_members`
- **SELECT**: user is a member of the same team
- **INSERT**: user is owner or admin of the team
- **UPDATE**: user is owner of the team (for role changes)
- **DELETE**: user is owner or admin (cannot remove owner), OR user is deleting their own row (leave)

### `team_invites`
- **SELECT**: user is a member of the team, OR `email` matches the user's email
- **INSERT**: user is owner or admin of the team
- **UPDATE**: the invited user only (email matches), for accepting/declining
- **DELETE**: user is owner or admin of the team (to revoke)

### Realtime

Enable Supabase Realtime publication on all 3 tables for live member list updates.

## Flows

### Create Team
1. User taps "Create Team" in Team screen
2. Enters team name
3. App generates a random `invite_code` (8-char alphanumeric)
4. Inserts `teams` row with `owner_id = auth.uid()`
5. Inserts `team_members` row with `role = 'owner'`
6. Team screen shows the new team

### Invite by Email
1. Owner/admin enters an email address
2. App inserts `team_invites` row with `status = 'pending'`
3. Invite appears in the invitee's pending invites (matched by their auth email)
4. Future enhancement: send email notification (out of scope for Phase 1)

### Invite by Link
1. Owner/admin taps "Copy Invite Link"
2. App generates a deep link: `eisenhower-reminder:///team/join?code={invite_code}`
3. Recipient opens the link → app resolves `invite_code` → looks up team
4. If authenticated: inserts `team_members` row with `role = 'member'`
5. If not authenticated: stores `invite_code` in AsyncStorage (`@executive_pending_join`), redirects to sign-in. After auth, app checks for pending join code and completes the join flow automatically

### Accept Email Invite
1. User opens Team screen → sees pending invites (matched by their email)
2. Taps "Accept"
3. App updates `team_invites.status = 'accepted'`
4. App inserts `team_members` row with `role = 'member'`

### Decline Email Invite
1. User taps "Decline"
2. App updates `team_invites.status = 'declined'`

### Leave Team
1. Member taps "Leave Team"
2. Confirmation dialog
3. App deletes their `team_members` row
4. Owner cannot leave — must delete team or transfer ownership

### Remove Member
1. Owner/admin taps remove on a member
2. Confirmation dialog
3. App deletes the target's `team_members` row
4. Admin cannot remove owner

### Change Role
1. Owner taps role on a member → picker: admin/member
2. App updates `team_members.role`
3. Only owner can change roles

### Delete Team
1. Owner taps "Delete Team"
2. Confirmation dialog with team name
3. App deletes `teams` row → cascades to `team_members` and `team_invites`

## Store Layer

### New file: `@/lib/teams-store.ts`

**Hooks:**
- `useTeams()` — returns teams the current user belongs to (via `team_members`)
- `useTeamMembers(teamId)` — returns members of a team with user profile info
- `useTeamInvites(teamId)` — returns pending invites for a team (owner/admin only)
- `usePendingInvites()` — returns invites where `email` matches the current user's email and `status = 'pending'`

**Mutations:**
- `createTeam(name: string)` — creates team + owner membership
- `inviteByEmail(teamId: string, email: string)` — creates pending invite
- `joinByCode(code: string)` — looks up team by invite_code, adds membership
- `acceptInvite(inviteId: string, teamId: string)` — updates invite status, adds membership
- `declineInvite(inviteId: string)` — updates invite status
- `removeMember(teamId: string, userId: string)` — deletes team_members row
- `updateRole(teamId: string, userId: string, role: string)` — updates role
- `leaveTeam(teamId: string)` — deletes own team_members row
- `deleteTeam(teamId: string)` — deletes team (cascade)

**Real-time:** Subscribe to `team_members` and `team_invites` changes for live updates, following the existing debounced invalidation pattern in `@/lib/realtime-sync.ts`.

All functions use `const` arrow style. All imports use `@/` aliases.

## UI

### Team Screen (`app/team.tsx`)
- Standalone screen accessed from Settings → OrganizationSection → new "Team" row
- If user has no teams and no pending invites: "Create Team" CTA
- If user has teams: list of teams, tapping one shows team detail
- If user has pending invites: invite cards with accept/decline

### Team Detail (inline or `app/team/[id].tsx`)
- Team name at top
- Member list: avatar, name, role badge
- Owner/admin see: invite button, invite link copy, remove/role controls
- Members see: read-only member list
- Leave button (for non-owners)
- Delete button (owner only, at bottom)

### Settings Integration
- New row in `OrganizationSection` (below Projects): "Team" with member count or "Create a team" subtitle
- Badge on the row if pending invites exist

### Deep Link Route (`app/team/join.tsx`)
- Handles `eisenhower-reminder:///team/join?code={code}`
- Shows team name + "Join" button if authenticated
- Redirects to sign-in if not authenticated, then returns to join

### Translations
- All new UI strings wrapped in `t()` with natural English keys
- Run `npm run i18n:extract` after implementation
- Translate empty values in ES/FR/RU locale files

## What's NOT Included (Later Phases)

- Workspace switcher (Phase 2)
- Shared tasks/projects (Phase 2)
- Role-based operation restrictions in task CRUD (Phase 3)
- Pro Team billing and payment (Phase 4)
- Email notifications for invites
- Team avatars/icons
- Transfer ownership flow
