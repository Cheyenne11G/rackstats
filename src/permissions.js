// UI permission rules for league roles. These only decide what the interface
// shows; the database (RLS policies and RPC checks) is the actual enforcement.

// Owners and organisers may view the league member list
// (RLS: "Owners can view league members", "Organisers can view league members").
export const canViewLeagueMembers = role => role === 'owner' || role === 'organiser';

// Only the league owner may change member roles or remove members
// (enforced by update_league_member_role / remove_league_member).
export const canManageLeagueMembers = role => role === 'owner';
