import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Award, Bell, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Crown,
  Download, Flame, Gauge, LayoutDashboard, ListOrdered, MapPin, Menu, Plus,
  Search, Settings, ShieldCheck, Swords, Table2, Target, Trophy, UserRound,
  Users, X, Zap, ImagePlus, SlidersHorizontal, Pencil, Trash2, Play, Flag,
  CalendarPlus, Share2, Mail, CheckCircle2
} from 'lucide-react';
import { supabase } from './supabase';
import { canViewLeagueMembers, canManageLeagueMembers } from './permissions.js';

const initial = {
  league: "Leonardo's Guest House League",
  leagues: [
    {id:'l1', name:"Leonardo's Guest House League", season:'2026 Season'},
    {id:'l2', name:'Johannesburg 8-Ball Series', season:'2026 Season'}
  ],
  teams: [
    {id:'t1',name:'Black Aces',leagueId:'l1',players:['p1','p2','p3'],played:8,wins:6,losses:2,points:18},
    {id:'t2',name:'Cue Masters',leagueId:'l1',players:['p4','p5','p6'],played:8,wins:5,losses:3,points:15},
    {id:'t3',name:'Break Point',leagueId:'l1',players:['p7','p8','p9'],played:7,wins:4,losses:3,points:12},
    {id:'t4',name:'Pocket Rockets',leagueId:'l1',players:['p10','p11','p12'],played:7,wins:3,losses:4,points:9},
    {id:'t5',name:'The Bankers',leagueId:'l1',players:['p13','p14','p15'],played:8,wins:2,losses:6,points:6},
    {id:'t6',name:'Corner Kings',leagueId:'l2',players:['p16','p17','p18'],played:3,wins:2,losses:1,points:6}
  ],
  players: [
    {id:'p1',name:'Craig Padayachee',teamId:'t1',rank:1,played:23,wins:17,losses:6,framesWon:91,framesLost:54,goldenBreaks:2,runOutBnF:7,dryBreaks:6,successfulBreaks:17,potsMade:384,shotsTaken:502,email:'',avatar:'',form:['W','W','L','W','W']},
    {id:'p2',name:'Leonard Peters',teamId:'t1',rank:2,played:19,wins:13,losses:6,framesWon:74,framesLost:51,goldenBreaks:1,runOutBnF:5,dryBreaks:5,successfulBreaks:14,potsMade:305,shotsTaken:421,email:'',avatar:'',form:['W','L','W','W','L']},
    {id:'p3',name:'Lance Pillay',teamId:'t1',rank:3,played:21,wins:14,losses:7,framesWon:80,framesLost:58,goldenBreaks:0,runOutBnF:4,dryBreaks:8,successfulBreaks:13,potsMade:329,shotsTaken:462,email:'',avatar:'',form:['W','W','W','L','W']},
    {id:'p4',name:'Oscar Peters',teamId:'t2',rank:4,played:20,wins:12,losses:8,framesWon:70,framesLost:62,goldenBreaks:1,runOutBnF:3,dryBreaks:7,successfulBreaks:12,potsMade:288,shotsTaken:415,email:'',avatar:'',form:['L','W','W','L','W']},
    {id:'p5',name:'Jeremy Gout',teamId:'t2',rank:5,played:17,wins:10,losses:7,framesWon:62,framesLost:50,goldenBreaks:0,runOutBnF:2,dryBreaks:5,successfulBreaks:11,potsMade:241,shotsTaken:360,email:'',avatar:'',form:['W','L','W','W','L']},
    {id:'p6',name:'Wayne Predator',teamId:'t2',rank:6,played:18,wins:9,losses:9,framesWon:59,framesLost:58,goldenBreaks:0,runOutBnF:2,dryBreaks:9,successfulBreaks:9,potsMade:233,shotsTaken:351,email:'',avatar:'',form:['L','W','L','W','L']},
    {id:'p7',name:'Ben Ortiz',teamId:'t3',rank:7,played:16,wins:9,losses:7,framesWon:55,framesLost:49,goldenBreaks:1,runOutBnF:3,dryBreaks:4,successfulBreaks:12,potsMade:220,shotsTaken:322,email:'',avatar:'',form:['W','W','L','W','L']},
    {id:'p8',name:'Miguel Pillay',teamId:'t3',rank:8,played:12,wins:7,losses:5,framesWon:41,framesLost:35,goldenBreaks:0,runOutBnF:1,dryBreaks:4,successfulBreaks:8,potsMade:161,shotsTaken:237,email:'',avatar:'',form:['W','L','W','W','L']},
    {id:'p9',name:'Thabo Mokoena',teamId:'t3',rank:9,played:11,wins:6,losses:5,framesWon:38,framesLost:36,goldenBreaks:0,runOutBnF:1,dryBreaks:3,successfulBreaks:7,potsMade:143,shotsTaken:211,email:'',avatar:'',form:['L','W','W','L','W']},
    {id:'p10',name:'Generic Player 10',teamId:'t4',rank:10,played:7,wins:3,losses:4,framesWon:21,framesLost:24,goldenBreaks:0,runOutBnF:0,dryBreaks:3,successfulBreaks:4,potsMade:77,shotsTaken:124,email:'',avatar:'',form:['L','W','L','W','L']},
    {id:'p11',name:'Generic Player 11',teamId:'t4',rank:11,played:6,wins:3,losses:3,framesWon:18,framesLost:17,goldenBreaks:0,runOutBnF:0,dryBreaks:2,successfulBreaks:4,potsMade:68,shotsTaken:105,email:'',avatar:'',form:['W','L','W','L','W']},
    {id:'p12',name:'Generic Player 12',teamId:'t4',rank:12,played:5,wins:2,losses:3,framesWon:14,framesLost:17,goldenBreaks:0,runOutBnF:0,dryBreaks:3,successfulBreaks:2,potsMade:52,shotsTaken:86,email:'',avatar:'',form:['L','L','W','W','L']},
    {id:'p13',name:'Generic Player 13',teamId:'t5',rank:13,played:8,wins:2,losses:6,framesWon:23,framesLost:37,goldenBreaks:0,runOutBnF:0,dryBreaks:4,successfulBreaks:2,potsMade:73,shotsTaken:139,email:'',avatar:'',form:['L','W','L','L','L']},
    {id:'p14',name:'Generic Player 14',teamId:'t5',rank:14,played:8,wins:2,losses:6,framesWon:20,framesLost:36,goldenBreaks:0,runOutBnF:0,dryBreaks:4,successfulBreaks:2,potsMade:64,shotsTaken:129,email:'',avatar:'',form:['L','L','W','L','L']},
    {id:'p15',name:'Generic Player 15',teamId:'t5',rank:15,played:6,wins:1,losses:5,framesWon:13,framesLost:29,goldenBreaks:0,runOutBnF:0,dryBreaks:3,successfulBreaks:1,potsMade:43,shotsTaken:93,email:'',avatar:'',form:['L','L','L','W','L']},
    {id:'p16',name:'Generic Player 16',teamId:'t6',rank:16,played:3,wins:2,losses:1,framesWon:11,framesLost:7,goldenBreaks:0,runOutBnF:1,dryBreaks:0,successfulBreaks:3,potsMade:42,shotsTaken:62,email:'',avatar:'',form:['W','L','W']},
    {id:'p17',name:'Generic Player 17',teamId:'t6',rank:17,played:3,wins:1,losses:2,framesWon:7,framesLost:9,goldenBreaks:0,runOutBnF:0,dryBreaks:1,successfulBreaks:1,potsMade:25,shotsTaken:44,email:'',avatar:'',form:['L','W','L']},
    {id:'p18',name:'Generic Player 18',teamId:'t6',rank:18,played:2,wins:1,losses:1,framesWon:5,framesLost:5,goldenBreaks:0,runOutBnF:0,dryBreaks:1,successfulBreaks:1,potsMade:20,shotsTaken:31,email:'',avatar:'',form:['W','L']}
  ],
  venues:[{id:'v1',name:"Leonardo's Guest House",location:'Johannesburg',tables:4},{id:'v2',name:'Nine Yards Club',location:'Rosebank',tables:3},{id:'v3',name:'The Break Room',location:'Sandton',tables:5}],
  matches:[
    {id:'m1',leagueId:'l1',date:'2026-10-24T18:00',homeId:'t1',awayId:'t2',homeScore:0,awayScore:0,venueId:'v1',table:1,status:'Upcoming',queue:1,type:'team',note:'League fixture'},
    {id:'m2',leagueId:'l1',date:'2026-10-24T19:30',homeId:'t3',awayId:'t4',homeScore:0,awayScore:0,venueId:'v1',table:1,status:'Upcoming',queue:2,type:'team',note:'League fixture'},
    {id:'m3',leagueId:'l1',date:'2026-10-21T18:00',homeId:'t1',awayId:'t3',homeScore:5,awayScore:3,venueId:'v1',table:1,status:'Finished',queue:0,type:'team',note:'League fixture'},
    {id:'m4',leagueId:'l1',date:'2026-10-20T19:00',homeId:'t2',awayId:'t5',homeScore:4,awayScore:5,venueId:'v2',table:2,status:'Finished',queue:0,type:'team',note:'League fixture'},
    {id:'m5',leagueId:'l1',date:'2026-10-23T20:00',homeId:'t1',awayId:'t4',homeScore:0,awayScore:0,venueId:'v1',table:2,status:'Upcoming',queue:1,type:'team',note:'League fixture'},
    {id:'m6',leagueId:'l1',date:'2026-10-22T19:30',homeId:'t2',awayId:'t3',homeScore:0,awayScore:0,venueId:'v2',table:1,status:'In Progress',queue:1,type:'team',note:'League fixture'}
  ],
  challenges:[
    {id:'c1',leagueId:'l1',date:'2026-10-23T18:30',playerAId:'p1',playerBId:'p8',scoreA:0,scoreB:0,raceTo:5,status:'Upcoming',venueId:'v1',table:3,queue:1},
    {id:'c2',leagueId:'l1',date:'2026-10-24T20:00',playerAId:'p2',playerBId:'p4',scoreA:0,scoreB:0,raceTo:7,status:'Upcoming',venueId:'v1',table:3,queue:2},
    {id:'c3',leagueId:'l1',date:'2026-10-19T18:00',playerAId:'p3',playerBId:'p5',scoreA:5,scoreB:3,raceTo:5,status:'Finished',venueId:'v2',table:2,queue:0},
    {id:'c4',leagueId:'l1',date:'2026-10-21T19:00',playerAId:'p7',playerBId:'p6',scoreA:4,scoreB:5,raceTo:5,status:'Finished',venueId:'v1',table:4,queue:0},
    {id:'c5',leagueId:'l1',date:'2026-10-25T18:30',playerAId:'p8',playerBId:'p1',scoreA:0,scoreB:0,raceTo:5,status:'Upcoming',venueId:'v3',table:1,queue:1}
  ]
};

const emptyData = {
  league: '',
  leagues: [],
  teams: [],
  players: [],
  venues: [],
  matches: [],
  challenges: []
};

// League-scoped collections. Cleared before every league load so that data
// from a previous league can never be shown while (or after) another loads.
const emptyLeagueData = {
  teams: [],
  players: [],
  venues: [],
  matches: [],
  challenges: []
};

// Only the user's last active league ID is remembered locally, as a preference.
// It is always validated against the leagues returned by Supabase.
const activeLeagueKey = userId => `rackstats-active-league:${userId}`;
const readStoredLeague = userId => {
  try { return localStorage.getItem(activeLeagueKey(userId)) || ''; } catch { return ''; }
};
const writeStoredLeague = (userId, leagueId) => {
  try { localStorage.setItem(activeLeagueKey(userId), leagueId); } catch {}
};

// Supabase IDs are UUIDs. Locally generated uid() values (e.g. "b343xz6") are not,
// and must never be sent to Supabase as a league_id.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === 'string' && UUID_PATTERN.test(value);

const toUiLeagues = leagues => (leagues ?? []).map(league => ({
  id: league.id,
  name: league.name,
  season: league.season,
  inviteCode: league.invite_code,
  role: league.role
}));

const NAV = [
  {id:'home',label:'Overview',icon:LayoutDashboard},
  {id:'matches',label:'Matches',icon:CalendarDays},
  {id:'table',label:'League table',icon:Trophy},
  {id:'players',label:'Players',icon:Users},
  {id:'night',label:'Match night',icon:Table2},
  {id:'membership',label:'Membership',icon:Award},
  {id:'admin',label:'Admin',icon:Settings}
];
const fmtDate = d => new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short'});
const fmtTime = d => new Date(d).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',hour12:false});
const fmtFull = d => new Date(d).toLocaleString('en-ZA',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});
const uid = () => Math.random().toString(36).slice(2,9);
const percent = (a,b) => b ? Math.round(a/b*100) : 0;
const cx = (...v) => v.filter(Boolean).join(' ');

async function loadUserLeagues(userId) {
  const { data: ownedLeagues, error: ownedError } = await supabase
    .from('leagues')
    .select('id, name, season, legacy_id, invite_code')
    .eq('user_id', userId);

  if (ownedError) throw ownedError;

  const { data: memberships, error: membershipError } = await supabase
    .from('league_members')
    .select('league_id, role, leagues(id, name, season, legacy_id, invite_code)')
    .eq('user_id', userId);

  if (membershipError) throw membershipError;

  const ownedWithRole = (ownedLeagues ?? []).map(league => ({
    ...league,
    role: 'owner'
  }));

  const joinedLeagues = (memberships ?? [])
    .filter(membership => membership.leagues)
    .map(membership => ({
      ...membership.leagues,
      role: membership.role
    }));

  return Array.from(
    new Map(
      [...ownedWithRole, ...joinedLeagues].map(league => [
        league.id,
        league
      ])
    ).values()
  );
}

// Maps a Supabase `players` row to the UI player shape.
// Used by loadLeagueData and by Add Player, so both produce identical objects.
function mapPlayerRow(row){
  return {
    id:row.id,
    name:row.name||'',
    teamId:row.team_id||'',
    rank:Number(row.rank)||0,
    played:Number(row.played)||0,
    wins:Number(row.wins)||0,
    losses:Number(row.losses)||0,
    framesWon:Number(row.frames_won)||0,
    framesLost:Number(row.frames_lost)||0,
    goldenBreaks:Number(row.golden_breaks)||0,
    runOutBnF:Number(row.run_out_bnf)||0,
    dryBreaks:Number(row.dry_breaks)||0,
    successfulBreaks:Number(row.successful_breaks)||0,
    potsMade:Number(row.pots_made)||0,
    shotsTaken:Number(row.shots_taken)||0,
    email:row.email||'',
    avatar:row.avatar||'',
    form:Array.isArray(row.form)?row.form:[]
  };
}

// Reads a numeric form value. A blank or invalid value keeps `fallback`
// (the existing value when editing), so stats are never silently reset to 0.
const numOr = (value, fallback = 0) => {
  if (value === undefined || value === null || String(value).trim() === '') return Number(fallback) || 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : (Number(fallback) || 0);
};

async function loadLeagueData(leagueId){
  const [playersResult,teamsResult,venuesResult,matchesResult,challengesResult] = await Promise.all([
    supabase.from('players').select('*').eq('league_id',leagueId),
    supabase.from('teams').select('*').eq('league_id',leagueId),
    supabase.from('venues').select('*').eq('league_id',leagueId),
    supabase.from('matches').select('*').eq('league_id',leagueId),
    supabase.from('challenges').select('*').eq('league_id',leagueId)
  ]);

  const results = [
    playersResult,
    teamsResult,
    venuesResult,
    matchesResult,
    challengesResult
  ];

  const failed = results.find(result=>result.error);

  if(failed){
    throw failed.error;
  }

  const players = (playersResult.data||[]).map(mapPlayerRow);

  const teams = (teamsResult.data||[]).map(row=>({
    id:row.id,
    name:row.name||'',
    leagueId:row.league_id,
    players:players.filter(player=>player.teamId===row.id).map(player=>player.id),
    played:Number(row.played)||0,
    wins:Number(row.wins)||0,
    losses:Number(row.losses)||0,
    points:Number(row.points)||0
  }));

  const venues = (venuesResult.data||[]).map(row=>({
    id:row.id,
    name:row.name||'',
    leagueId:row.league_id,
    location:row.location||'',
    tables:Number(row.tables)||0
  }));

  const toUiStatus = value=>{
    const status=String(value||'scheduled').toLowerCase().replace(/[\s-]+/g,'_');

    if(status==='finished'||status==='completed') return 'Finished';
    if(status==='in_progress'||status==='live') return 'In Progress';

    return 'Upcoming';
  };

  const matches = (matchesResult.data||[]).map(row=>({
    id:row.id,
    leagueId:row.league_id,
    date:row.match_date,
    homeId:row.home_team_id||teams.find(team=>team.name===row.home_team)?.id||'',
    awayId:row.away_team_id||teams.find(team=>team.name===row.away_team)?.id||'',
    homeScore:Number(row.home_score)||0,
    awayScore:Number(row.away_score)||0,
    venueId:row.venue_id||'',
    table:Number(row.table_number)||0,
    status:toUiStatus(row.status),
    queue:Number(row.queue)||0,
    type:'team',
    note:'League fixture'
  }));

  const challenges = (challengesResult.data||[]).map(row=>({
    id:row.id,
    leagueId:row.league_id,
    date:row.match_date,
    playerAId:row.player_a_id||'',
    playerBId:row.player_b_id||'',
    scoreA:Number(row.score_a)||0,
    scoreB:Number(row.score_b)||0,
    raceTo:Number(row.race_to)||5,
    status:toUiStatus(row.status),
    venueId:row.venue_id||'',
    table:Number(row.table_number)||0,
    queue:Number(row.queue)||0
  }));

  return {
    players,
    teams,
    venues,
    matches,
    challenges
  };
}

export default function RackStats(){
  // Application data always comes from Supabase. It is never read from or written to localStorage.
  const [data,setData] = useState(emptyData);
  const [authChecking,setAuthChecking] = useState(true);
  const [workspaceLoading,setWorkspaceLoading] = useState(false);
  const [workspaceError,setWorkspaceError] = useState('');
  const [workspaceUserId,setWorkspaceUserId] = useState('');
  const [leagueLoading,setLeagueLoading] = useState(false);
  const [leagueError,setLeagueError] = useState('');
  const workspaceRequestRef = useRef(0);
  const leagueRequestRef = useRef(0);
  const creatingLeagueRef = useRef(false);
  const savingPlayerRef = useRef(false);
 const [page,setPage] = useState('signup');
const [leagueSetupMode, setLeagueSetupMode] = useState('choose');
const [leagueName, setLeagueName] = useState('');
const [inviteCode, setInviteCode] = useState('');
const [authMode,setAuthMode] = useState('signup');
const [user, setUser] = useState(null);
const [subscriptions, setSubscriptions] = useState([]);
const [subscriptionLoading, setSubscriptionLoading] = useState(false);
const [currentRole, setCurrentRole] = useState(null);
const [leagueMembers, setLeagueMembers] = useState([]);
const [dataLoading, setDataLoading] = useState(false);
const [loginEmail, setLoginEmail] = useState('');
const [loginPassword, setLoginPassword] = useState('');
const [authLoading, setAuthLoading] = useState(false);
const [signupName,setSignupName] = useState('');
const [signupEmail,setSignupEmail] = useState('');
const [signupPassword,setSignupPassword] = useState('');
const [signupCode,setSignupCode] = useState('');
  const [activeLeague,setActiveLeague] = useState('');
  const [selectedPlayer,setSelectedPlayer] = useState(null);
  const [selectedMatch,setSelectedMatch] = useState(null);
  const [search,setSearch] = useState('');
  const [matchMode,setMatchMode] = useState('team');
  const [matchTab,setMatchTab] = useState('Upcoming');
  const [adminTab,setAdminTab] = useState('Matches');
  const [venueFilter,setVenueFilter] = useState('v1');
  const [modal,setModal] = useState(null);
  const [toast,setToast] = useState('');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [sortMode,setSortMode] = useState('points');
  useEffect(()=>{if(user?.id&&activeLeague)writeStoredLeague(user.id,activeLeague)},[user?.id,activeLeague]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)}},[toast]);
 useEffect(() => {
  let mounted = true;

  supabase.auth.getSession()
    .then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) console.error('Error restoring session:', error);
      setUser(session?.user ?? null);
    })
    .catch(err => {
      console.error('Error restoring session:', err);
      if (mounted) setUser(null);
    })
    .finally(() => {
      if (mounted) setAuthChecking(false);
    });

  // Keep this callback synchronous: Supabase calls made inside it can deadlock.
  // Workspace loading happens in the user-ID effect below.
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecking(false);
    }
  );

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

// Load (or clear) the workspace whenever the signed-in user changes.
// Covers browser refresh, login, sign-up with an immediate session, and sign-out/expiry.
useEffect(() => {
  if (!user?.id) {
    resetWorkspace();
    return;
  }
  loadUserWorkspace(user.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);
useEffect(() => {
  let cancelled = false;

  const loadSubscriptions = async () => {
    if (!user) {
      setSubscriptions([]);
      return;
    }

    setSubscriptionLoading(true);

    const { data: rows, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (cancelled) return;

    if (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptions([]);
    } else {
      setSubscriptions(rows ?? []);
    }

    setSubscriptionLoading(false);
  };

  loadSubscriptions();

  return () => {
    cancelled = true;
  };
}, [user]);
 const league = data.leagues.find(x=>x.id===activeLeague)||data.leagues[0];
useEffect(() => {
  const selectedLeague = data.leagues.find(l => l.id === activeLeague);
  setCurrentRole(selectedLeague?.role ?? null);
}, [data.leagues, activeLeague]);
useEffect(() => {
  let cancelled = false;

  const loadMembers = async () => {
    // Clear first so members from a previous league are never shown.
    setLeagueMembers([]);

    // Owners and organisers can view members; only owners can manage them.
    if (!user || !canViewLeagueMembers(currentRole) || !activeLeague) {
      return;
    }

    const { data: members, error } = await supabase
      .from('league_members')
      .select('user_id, role')
      .eq('league_id', activeLeague);

    if (cancelled) return;

    if (error) {
      setToast(error.message);
      return;
    }

    setLeagueMembers(members ?? []);
  };

  loadMembers();

  return () => {
    cancelled = true;
  };
}, [user, currentRole, activeLeague]);
// Keep the Match Night venue filter pointing at a venue in the loaded league.
useEffect(() => {
  if (!data.venues.some(v => v.id === venueFilter)) {
    setVenueFilter(data.venues[0]?.id || '');
  }
}, [data.venues, venueFilter]);

// Clears all user/league data and cancels any in-flight loads.
const resetWorkspace = () => {
  workspaceRequestRef.current++;
  leagueRequestRef.current++;
  setData(emptyData);
  setActiveLeague('');
  setLeagueMembers([]);
  setSelectedPlayer(null);
  setSelectedMatch(null);
  setModal(null);
  setWorkspaceLoading(false);
  setWorkspaceError('');
  setWorkspaceUserId('');
  setLeagueLoading(false);
  setLeagueError('');
  setPage('signup');
};

// Loads one league's players, teams, venues, matches and challenges from Supabase.
// Previous league data is cleared immediately, and responses from superseded
// requests are discarded, so another league's data can never be displayed.
// Resolves to true when the league loaded successfully.
const reloadLeague = async leagueId => {
  if (!leagueId) return false;

  // Safeguard: never query Supabase with a local-only (non-UUID) league ID.
  // The current league and its data are left untouched.
  if (!isUuid(leagueId)) {
    console.error('Refusing to load a league with a non-Supabase ID:', leagueId);
    setToast('This league has not been saved to the server, so its data cannot be loaded.');
    return false;
  }

  const requestId = ++leagueRequestRef.current;

  setActiveLeague(leagueId);
  setData(d => ({ ...d, ...emptyLeagueData }));
  setLeagueMembers([]);
  setLeagueError('');
  setLeagueLoading(true);

  try {
    const leagueData = await loadLeagueData(leagueId);
    if (requestId !== leagueRequestRef.current) return false;
    setData(d => ({ ...d, ...emptyLeagueData, ...leagueData }));
    return true;
  } catch (err) {
    if (requestId !== leagueRequestRef.current) return false;
    console.error('Error loading league data:', err);
    setLeagueError(err?.message || 'Could not load league data.');
    return false;
  } finally {
    if (requestId === leagueRequestRef.current) setLeagueLoading(false);
  }
};

// Loads the user's leagues (with membership roles) and then the active league's data.
// preferredLeagueId wins if the user belongs to it; otherwise the last active league
// stored for this user, otherwise the first league.
// Resolves to null if superseded, otherwise { ok, leagues, leagueId, leagueLoaded }.
const loadUserWorkspace = async (userId, preferredLeagueId) => {
  const requestId = ++workspaceRequestRef.current;
  leagueRequestRef.current++;

  setWorkspaceLoading(true);
  setWorkspaceError('');
  setLeagueError('');
  setLeagueLoading(false);

  let leagues;
  try {
    leagues = toUiLeagues(await loadUserLeagues(userId));
  } catch (err) {
    if (requestId !== workspaceRequestRef.current) return null;
    console.error('Error loading leagues:', err);
    setData(emptyData);
    setActiveLeague('');
    setWorkspaceError(err?.message || 'Could not load your leagues.');
    setWorkspaceUserId(userId);
    setWorkspaceLoading(false);
    return { ok: false, leagues: [], leagueId: null, leagueLoaded: false };
  }

  if (requestId !== workspaceRequestRef.current) return null;

  setWorkspaceUserId(userId);
  setWorkspaceLoading(false);

  if (leagues.length === 0) {
    setData(emptyData);
    setActiveLeague('');
    setLeagueSetupMode('choose');
    setPage('league-setup');
    setToast('Create or join a league to continue.');
    return { ok: true, leagues, leagueId: null, leagueLoaded: false };
  }

  const storedLeagueId = readStoredLeague(userId);
  const target =
    leagues.find(l => l.id === preferredLeagueId) ||
    leagues.find(l => l.id === storedLeagueId) ||
    leagues[0];

  setData({ ...emptyData, leagues });
  setPage(p => (p === 'signup' || p === 'league-setup' ? 'home' : p));

  const leagueLoaded = await reloadLeague(target.id);
  if (requestId !== workspaceRequestRef.current) return null;

  return { ok: true, leagues, leagueId: target.id, leagueLoaded };
};

// Switches the active league and reloads its data from Supabase.
const switchLeague = async (leagueId, { nextPage = 'home', successToast = '' } = {}) => {
  setMobileMenu(false);
  setModal(null);
  setSelectedPlayer(null);
  setSelectedMatch(null);
  setSearch('');
  setPage(nextPage);

  if (!leagueId) return;
  if (leagueId === activeLeague && !leagueError && !leagueLoading) return;

  const ok = await reloadLeague(leagueId);
  if (ok && successToast) setToast(successToast);
};

  const teams = data.teams.filter(t=>t.leagueId===activeLeague);
  const players = data.players;
  const teamBy = id=>data.teams.find(t=>t.id===id);
  const playerBy = id=>data.players.find(p=>p.id===id);
  const venueBy = id=>data.venues.find(v=>v.id===id);
  const leagueMatches = data.matches.filter(m=>m.leagueId===activeLeague);
  const leagueChallenges = data.challenges.filter(m=>m.leagueId===activeLeague);
  const upcoming = [...leagueMatches.filter(m=>m.status!=='Finished'),...leagueChallenges.filter(m=>m.status!=='Finished')].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const results = [...leagueMatches.filter(m=>m.status==='Finished'),...leagueChallenges.filter(m=>m.status==='Finished')].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const allUpcomingCount = upcoming.length;
  const sortedTeams = useMemo(()=>teams.map(t=>({...t,frameWon:players.filter(p=>p.teamId===t.id).reduce((s,p)=>s+p.framesWon,0),frameLost:players.filter(p=>p.teamId===t.id).reduce((s,p)=>s+p.framesLost,0)})).sort((a,b)=>sortMode==='frame'?(b.frameWon-b.frameLost)-(a.frameWon-a.frameLost)||b.points-a.points:b.points-a.points||((b.frameWon-b.frameLost)-(a.frameWon-a.frameLost))),[teams,players,sortMode]);
  const update = (key,id,patch)=>setData(d=>({...d,[key]:d[key].map(x=>x.id===id?{...x,...patch}:x)}));
  const remove = async (key,id)=>{
  const tableMap={
    players:'players',
    teams:'teams',
    venues:'venues',
    matches:'matches',
    challenges:'challenges'
  };

  const table=tableMap[key];

  if(!table){
    setToast('Unknown item type');
    return;
  }

  const {error}=await supabase
    .from(table)
    .delete()
    .eq('id',id);

  if(error){
    setToast('Could not delete item: '+error.message);
    return;
  }

  setData(d=>({
    ...d,
    [key]:d[key].filter(x=>x.id!==id)
  }));

  setToast('Item deleted');
};
  const add = (key,item)=>setData(d=>({...d,[key]:[...d[key],{id:uid(),...item}]}));
  const startMatch = (m,type='team')=>{
    const key=type==='challenge'?'challenges':'matches';
    const target=(type==='challenge'?data.challenges:data.matches).find(x=>x.id===m.id);
    if(!target)return;
    setData(d=>({...d,[key]:d[key].map(x=>x.id===m.id?{...x,status:'In Progress'}:x)}));
    setToast('Match started');
  };
  const finishMatch = (m,type='team')=>{
    const key=type==='challenge'?'challenges':'matches';
    setData(d=>{
      const next={...d,[key]:d[key].map(x=>x.id===m.id?{...x,status:'Finished'}:x)};
      const done=(type==='challenge'?d.challenges:d.matches).find(x=>x.id===m.id);
      const q=(type==='challenge'?d.challenges:d.matches).filter(x=>x.venueId===done.venueId&&x.table===done.table&&x.status==='Upcoming').sort((a,b)=>(a.queue||99)-(b.queue||99))[0];
      if(q)next[key]=next[key].map(x=>x.id===q.id?{...x,status:'In Progress'}:x);
      return next;
    });
    setToast('Match finished · next queued match promoted');
  };
  const openPlayer = p=>{setSelectedPlayer(p);setPage('player')};
  const openMatch = (m,type)=>{setSelectedMatch({...m,_type:type||m.type||'team'});setPage('match-detail')};
  const setLeague = id=>switchLeague(id);
  const exportICS = (m,type)=>{
    const title=type==='challenge'?`${playerBy(m.playerAId)?.name||'Player'} vs ${playerBy(m.playerBId)?.name||'Player'}`:`${teamBy(m.homeId)?.name||'Team'} vs ${teamBy(m.awayId)?.name||'Team'}`;
    const start=new Date(m.date);const end=new Date(start.getTime()+90*60000);
    const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//RackStats//EN\nBEGIN:VEVENT\nUID:${m.id}@rackstats\nDTSTAMP:${stamp(new Date())}\nDTSTART:${stamp(start)}\nDTEND:${stamp(end)}\nSUMMARY:${title.replace(/,/g,'\\\\,')}\nLOCATION:${venueBy(m.venueId)?.name||''} - Table ${m.table||'TBC'}\nDESCRIPTION:RackStats match. ${league?.name||''}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rackstats-${m.id}.ics`;a.click();URL.revokeObjectURL(a.href);setToast('Calendar file downloaded');
  };
  const sharePreview = async m=>{
    const type=m._type||m.type||'team';
    const title=type==='challenge'?`${playerBy(m.playerAId)?.name} vs ${playerBy(m.playerBId)?.name}`:`${teamBy(m.homeId)?.name} vs ${teamBy(m.awayId)?.name}`;
    const text=`${title}\n${fmtFull(m.date)}\n${venueBy(m.venueId)?.name||'Venue TBC'} · Table ${m.table||'TBC'}\n${league?.name||'RackStats'}`;
    if(navigator.share){try{await navigator.share({title:'RackStats Match',text})}catch{}}
    else if(navigator.clipboard){await navigator.clipboard.writeText(text);setToast('Match preview copied to clipboard')}
    else setToast('Share is not supported on this browser');
  };
  // Previously replaced state with the `initial` demo data, which would overwrite real
  // Supabase data. It now reloads the active league from Supabase instead.
  const resetDemo=async()=>{if(!activeLeague)return;const ok=await reloadLeague(activeLeague);if(ok)setToast('League data reloaded from Supabase')};

  function MatchCard({m,type='team',compact=false}){
    const challenge=type==='challenge'||m.type==='challenge';
    const home=challenge?playerBy(m.playerAId):teamBy(m.homeId);
    const away=challenge?playerBy(m.playerBId):teamBy(m.awayId);
    const done=m.status==='Finished',live=m.status==='In Progress';
    return <button className={cx('match-card',compact&&'compact',done&&'finished')} onClick={()=>openMatch(m,challenge?'challenge':'team')}>
      <div className="match-meta"><span className={cx('status-dot',live?'live':done?'done':'upcoming')}/><span>{m.status}</span><span className="meta-sep">·</span><span>{fmtDate(m.date)} {fmtTime(m.date)}</span><span className="meta-spacer"/><span className="match-kind">{challenge?'1v1':'TEAM'}</span></div>
      <div className="match-body">
        <div className="match-side"><div className="team-mark">{challenge?<UserRound size={17}/>:home?.name?.slice(0,2).toUpperCase()}</div><div><strong>{home?.name||'TBC'}</strong><small>{challenge?'Player':'Home'}</small></div></div>
        <div className="match-score">{done||live?<><b>{m.homeScore??m.scoreA??0}</b><i>:</i><b>{m.awayScore??m.scoreB??0}</b></>:<span className="versus">VS</span>}</div>
        <div className="match-side right"><div><strong>{away?.name||'TBC'}</strong><small>{challenge?'Player':'Away'}</small></div><div className="team-mark">{challenge?<UserRound size={17}/>:away?.name?.slice(0,2).toUpperCase()}</div></div>
      </div>
      <div className="match-footer"><span><MapPin size={13}/>{venueBy(m.venueId)?.name||'Venue TBC'}</span><span><Table2 size={13}/>Table {m.table||'—'}</span><span className="open-match">Details <ArrowRight size={13}/></span></div>
    </button>
  }

  function SectionTitle({eyebrow,title,sub,action}){return <div className="section-title"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{action}</div>}
  function PlayerAvatar({p,size='md'}){return <div className={cx('avatar',size==='lg'&&'avatar-lg')} style={p?.avatar?{backgroundImage:`url(${p.avatar})`}:{}}>{!p?.avatar&&(p?.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div>}
  function FormStrip({form=[]}){return <div className="form-strip">{form.map((f,i)=><span key={i} className={f==='W'?'form-win':'form-loss'}>{f}</span>)}</div>}
  function Stat({label,value,icon:Icon,accent,sub}){return <div className="stat-card"><div className="stat-top"><span>{label}</span>{Icon&&<Icon size={16}/>}</div><strong className={accent?'green':''}>{value}</strong>{sub&&<small>{sub}</small>}</div>}
  function Modal({title,children,onClose,wide=false}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className={cx('modal',wide&&'modal-wide')}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div>}

const switchAuthMode = () => {
  setAuthMode(authMode === 'signup' ? 'login' : 'signup');
};
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    setToast('Could not log out: ' + error.message);
    return;
  }

  // Remove the legacy demo-data cache left by older versions (it may hold player emails).
  try {
    localStorage.removeItem('rackstats-data');
    localStorage.removeItem('rackstats-league');
  } catch {}

  resetWorkspace();
  setUser(null);
  setAuthMode('login');
};
const renderHome=()=> <div className="page-stack">
    <div style={{display:'flex',justifyContent:'flex-end'}}>
      <button className="secondary-btn" onClick={handleLogout}>Log out</button>
    </div>
    <div className="welcome-row"><div><div className="eyebrow">LEAGUE CONTROL CENTRE</div><h1>Pool, <span>tracked.</span></h1><p>Your game. Your numbers. Every frame matters.</p></div><div className="welcome-mark"><div className="eight-ball">8</div><span>RACKSTATS</span></div></div>
    <div className="stat-grid four">
      <Stat label="Players" value={players.filter(p=>teams.some(t=>t.id===p.teamId)).length} icon={Users} sub="Across all rosters"/>
      <Stat label="Upcoming fixtures" value={allUpcomingCount} icon={CalendarDays} accent sub="Team + 1v1 matches"/>
      <Stat label="Teams in league" value={teams.length} icon={ShieldCheck} sub="Active standings"/>
      <Stat label="1v1 challenges" value={leagueChallenges.length} icon={Swords} sub="Head-to-head pool"/>
    </div>
    <div className="home-grid">
      <section className="panel"><SectionTitle eyebrow="ON THE CALENDAR" title="Next up" sub="The fixtures coming your way." action={<button className="text-action" onClick={()=>{setPage('matches');setMatchTab('Upcoming')}}>All fixtures <ArrowRight size={14}/></button>}/><div className="match-list">{upcoming.slice(0,3).map(m=><MatchCard key={m.id} m={m} type={m.playerAId?'challenge':'team'} compact/>)}</div></section>
      <section className="panel"><SectionTitle eyebrow="THE LEADERBOARD" title="League leaders" sub="Top teams by points." action={<button className="text-action" onClick={()=>setPage('table')}>Full table <ArrowRight size={14}/></button>}/><div className="leader-list">{sortedTeams.slice(0,4).map((t,i)=><div className="leader-row" key={t.id}><div className={cx('rank-badge',i<3&&`rank-${i+1}`)}>{String(i+1).padStart(2,'0')}</div><div className="leader-name"><strong>{t.name}</strong><small>{t.played} played · {t.wins}W {t.losses}L</small></div><div className="leader-points"><strong>{t.points}</strong><small>PTS</small></div></div>)}</div></section>
    </div>
    <section className="panel"><SectionTitle eyebrow="RECENT ACTION" title="Latest results" sub="A look back at the last few matches." action={<button className="text-action" onClick={()=>{setPage('matches');setMatchTab('Results')}}>All results <ArrowRight size={14}/></button>}/><div className="match-list">{results.slice(0,2).map(m=><MatchCard key={m.id} m={m} type={m.playerAId?'challenge':'team'} compact/>)}</div></section>
    <div className="callout"><div className="callout-icon"><Zap size={20}/></div><div><strong>Every frame tells a story.</strong><p>Track your form, compare head-to-heads, and keep your season moving.</p></div><button onClick={()=>setPage('players')}>Explore players <ArrowRight size={15}/></button></div>
  </div>;

const playerSubscription = subscriptions.find(
  s => s.subscription_type === 'player'
) ?? null;

const organiserSubscription = subscriptions.find(
  s => s.subscription_type === 'organiser'
) ?? null;

const playerPlanActive = playerSubscription?.status === 'active';
const organiserPlanActive = organiserSubscription?.status === 'active';
const renderMembership=()=> <div className="page-stack">
  <SectionTitle eyebrow="RACKSTATS PLANS" title="Membership" sub="Choose the membership that suits how you play or manage your league."/>
<div className="table-panel" style={{padding:20}}>
  <div className="table-heading">
    <div>
      <span className="eyebrow">YOUR CURRENT MEMBERSHIPS</span>
      <h3>Account status</h3>
    </div>
  </div>

  <p>
    Player: <strong>{playerPlanActive ? playerSubscription.plan : 'Player Free'}</strong>
  </p>

  <p>
    Organiser: <strong>{organiserPlanActive ? organiserSubscription.plan : 'Organiser Free'}</strong>
  </p>

  {subscriptionLoading && <p>Loading subscription details...</p>}
</div>

  <div className="table-panel">
    <div className="table-heading">
      <div><span className="eyebrow">PLAYER MEMBERSHIPS</span><h3>For the players</h3></div>
    </div>
    <div className="membership-grid">
      <div className="membership-card">
        <span className="pill">FREE</span>
        <h3>Player Free</h3>
        <div className="membership-price">R0 <small>/ forever</small></div>
        <p>Everything you need to participate in your league.</p>
        <ul>
          <li>Join leagues</li>
          <li>View fixtures and results</li>
          <li>Basic player statistics</li>
          <li>Advertisements may appear</li>
        </ul>
      </div>
      <div className="membership-card featured">
        <span className="pill">PLAYER PRO</span>
        <h3>Player Pro</h3>
        <div className="membership-price">R49 <small>/ month</small></div>
        <p>Get more from your game with advanced insights.</p>
        <ul>
          <li>Everything in Player Free</li>
          <li>Advanced player statistics</li>
          <li>Performance insights</li>
          <li>Ad-free experience</li>
          <li>Annual option: R499</li>
        </ul>
      </div>
    </div>
  </div>

  <div className="table-panel">
    <div className="table-heading">
      <div><span className="eyebrow">ORGANISER MEMBERSHIPS</span><h3>For league organisers</h3></div>
    </div>
    <div className="membership-grid">
      <div className="membership-card">
        <span className="pill">FREE</span>
        <h3>Organiser Free</h3>
        <div className="membership-price">R0 <small>/ forever</small></div>
        <p>Get your league up and running.</p>
        <ul>
          <li>Basic league management</li>
          <li>Manage fixtures and results</li>
          <li>Manage teams and players</li>
          <li>Advertisements may appear</li>
        </ul>
      </div>
      <div className="membership-card featured">
        <span className="pill">PRO</span>
        <h3>Organiser Pro</h3>
        <div className="membership-price">R149 <small>/ month</small></div>
        <p>More control and insight for growing leagues.</p>
        <ul>
          <li>Everything in Organiser Free</li>
          <li>Multiple league management</li>
          <li>Advanced statistics and reports</li>
          <li>Ad-free experience</li>
        </ul>
      </div>
      <div className="membership-card">
        <span className="pill">CLUB</span>
        <h3>Club</h3>
        <div className="membership-price">R399 <small>/ month</small></div>
        <p>More tools for established clubs.</p>
        <ul>
          <li>Everything in Organiser Pro</li>
          <li>Multiple administrators</li>
          <li>Competitions and divisions</li>
          <li>Data exports</li>
          <li>Ad-free experience</li>
        </ul>
      </div>
    </div>
  </div>
</div>;  
const renderMatches=()=> <div className="page-stack"><SectionTitle eyebrow="FIXTURES & RESULTS" title="Matches" sub="Follow team fixtures and individual 1v1 challenges." action={<button className="primary-btn" onClick={()=>setModal({kind:'match'})}><Plus size={16}/> New match</button>}/><div className="toolbar"><div className="segmented"><button className={matchMode==='team'?'active':''} onClick={()=>setMatchMode('team')}>Team matches</button><button className={matchMode==='1v1'?'active':''} onClick={()=>setMatchMode('1v1')}>1v1 pool</button></div><div className="segmented"><button className={matchTab==='Upcoming'?'active':''} onClick={()=>setMatchTab('Upcoming')}>Upcoming</button><button className={matchTab==='Results'?'active':''} onClick={()=>setMatchTab('Results')}>Results</button></div></div><div className="match-list">{(matchMode==='team'?leagueMatches:leagueChallenges).filter(m=>matchTab==='Upcoming'?m.status!=='Finished':m.status==='Finished').sort((a,b)=>matchTab==='Upcoming'?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date)).map(m=><MatchCard key={m.id} m={m} type={matchMode==='1v1'?'challenge':'team'}/>)}</div>{(matchMode==='team'?leagueMatches:leagueChallenges).filter(m=>matchTab==='Upcoming'?m.status!=='Finished':m.status==='Finished').length===0&&<Empty icon={CalendarDays} title="Nothing on the board" text="Try the other tab, or add a fixture from the admin panel."/>}</div>;

  function Empty({icon:Icon,title,text}){return <div className="empty"><div><Icon size={22}/></div><strong>{title}</strong><p>{text}</p></div>}
  const renderTable=()=> <div className="page-stack"><SectionTitle eyebrow="SEASON STANDINGS" title="League table" sub={`${league?.name} · ${league?.season||'Current season'}`} action={<button className="secondary-btn" onClick={()=>setSortMode(sortMode==='points'?'frame':'points')}><SlidersHorizontal size={15}/> Sort: {sortMode==='points'?'Points':'Frame diff'}</button>}/><div className="table-panel"><div className="table-heading"><div><span className="eyebrow">CURRENT RANKING</span><h3>Team standings</h3></div><span className="pill">{teams.length} teams</span></div><div className="responsive-table"><table><thead><tr><th>POS</th><th>TEAM</th><th>PL</th><th>W</th><th>L</th><th>PTS</th><th>FRAME DIFF.</th></tr></thead><tbody>{sortedTeams.map((t,i)=>{const diff=t.frameWon-t.frameLost;return <tr key={t.id}><td><span className={cx('rank-cell',i<3&&`rank-${i+1}`)}>{i+1}</span></td><td><div className="table-team"><span className="team-mark">{t.name.slice(0,2).toUpperCase()}</span><strong>{t.name}</strong></div></td><td>{t.played}</td><td className="muted">{t.wins}</td><td className="muted">{t.losses}</td><td><strong>{t.points}</strong></td><td><span className={cx('frame-diff',diff>0?'positive':diff<0?'negative':'neutral')}>{diff>0?'+':''}{diff}</span></td></tr>})}</tbody></table></div><div className="table-note"><span><i className="legend-dot green-dot"/>Top 3 positions highlighted</span><span>Points first · Frame difference tiebreaker</span></div></div></div>;

  const renderPlayers=()=> <div className="page-stack"><SectionTitle eyebrow="PLAYER DIRECTORY" title="Players" sub="Player stats, form, and head-to-head records." action={<button className="primary-btn" onClick={()=>setModal({kind:'player'})}><Plus size={16}/> Add player</button>}/><div className="searchbar"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search players or teams…"/><span>{players.filter(p=>teams.some(t=>t.id===p.teamId)&&`${p.name} ${teamBy(p.teamId)?.name}`.toLowerCase().includes(search.toLowerCase())).length} players</span></div><div className="players-grid">{players.filter(p=>teams.some(t=>t.id===p.teamId)&&`${p.name} ${teamBy(p.teamId)?.name}`.toLowerCase().includes(search.toLowerCase())).map(p=><button className="player-card" key={p.id} onClick={()=>openPlayer(p)}><div className="player-card-top"><PlayerAvatar p={p}/><span className="player-rank">#{p.rank}</span></div><strong>{p.name}</strong><span className="player-team">{teamBy(p.teamId)?.name||'Unassigned'}</span><div className="player-card-stats"><div><b>{p.wins}</b><small>WINS</small></div><div><b>{percent(p.wins,p.played)}%</b><small>WIN RATE</small></div><div><b className={p.framesWon-p.framesLost>=0?'green':'red'}>{p.framesWon-p.framesLost>0?'+':''}{p.framesWon-p.framesLost}</b><small>FRAME DIFF.</small></div></div><div className="player-card-bottom"><FormStrip form={p.form||[]}/><span>View profile <ArrowRight size={13}/></span></div></button>)}</div></div>;

  const renderPlayer=()=>{const p=players.find(x=>x.id===selectedPlayer?.id)||selectedPlayer;if(!p)return <Empty icon={Users} title="Player not found" text="Choose a player from the directory."/>;const team=teamBy(p.teamId);const hist=leagueChallenges.filter(c=>c.playerAId===p.id||c.playerBId===p.id).sort((a,b)=>new Date(b.date)-new Date(a.date));const teamHist=leagueMatches.filter(m=>[teamBy(m.homeId)?.players,teamBy(m.awayId)?.players].some(arr=>arr?.includes(p.id))).sort((a,b)=>new Date(b.date)-new Date(a.date));const rate=percent(p.wins,p.played);const frameDiff=p.framesWon-p.framesLost;return <div className="page-stack"><button className="back-link" onClick={()=>setPage('players')}><ChevronLeft size={16}/> Back to players</button><div className="profile-hero"><div className="profile-main"><label className="upload-avatar"><PlayerAvatar p={p} size="lg"/><span><ImagePlus size={14}/></span><input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{update('players',p.id,{avatar:reader.result});setSelectedPlayer({...p,avatar:reader.result});setToast('Profile photo updated')};reader.readAsDataURL(file)}}/></label><div><div className="eyebrow">PLAYER PROFILE · RANK #{p.rank}</div><h1>{p.name}</h1><p>{team?.name||'Independent player'} <span className="dot-sep">·</span> {league?.name}</p><div className="profile-form"><span>RECENT FORM</span><FormStrip form={p.form||[]}/></div></div></div><button className="secondary-btn" onClick={()=>setModal({kind:'edit-player',item:p})}><Pencil size={15}/> Edit profile</button></div><div className="stat-grid four"><Stat label="Win rate" value={`${rate}%`} icon={Target} accent sub={`${p.wins} wins from ${p.played} matches`}/><Stat label="Matches played" value={p.played} icon={Activity} sub={`${p.losses} losses`}/><Stat label="Frames won" value={p.framesWon} icon={Trophy} sub={`${p.framesLost} frames lost`}/><Stat label="Frame difference" value={`${frameDiff>0?'+':''}${frameDiff}`} icon={Gauge} accent={frameDiff>0} sub="Frames won − frames lost"/></div><div className="profile-stats-grid"><section className="panel"><SectionTitle eyebrow="BREAK & CLEARANCE" title="Signature stats"/>{playerPlanActive ?<div className="signature-grid"><Stat label="Golden breaks" value={p.goldenBreaks} icon={Crown} accent/><Stat label="Run out BnF" value={p.runOutBnF} icon={Flame}/><Stat label="Successful breaks" value={p.successfulBreaks} icon={Zap} accent sub={`${percent(p.successfulBreaks,p.successfulBreaks+p.dryBreaks)}% success`}/><Stat label="Dry breaks" value={p.dryBreaks} icon={Activity}/><Stat label="Pots made" value={p.potsMade} icon={Target} accent sub={`${percent(p.potsMade,p.shotsTaken)}% of shots`}/><Stat label="Shots taken" value={p.shotsTaken} icon={Gauge}/></div> : <div className="muted-copy">	
  Unlock Signature Stats, including golden breaks, run-outs and detailed performance insights with Player Pro.
</div>}</section><section className="panel"><SectionTitle eyebrow="HEAD TO HEAD" title="1v1 challenges" sub="Individual match history."/><div className="history-list">{hist.length?hist.map(c=>{const isA=c.playerAId===p.id;const won=c.status==='Finished'&&(isA?c.scoreA>c.scoreB:c.scoreB>c.scoreA);const opponent=playerBy(isA?c.playerBId:c.playerAId);return <div className="history-row" key={c.id}><div><strong>{opponent?.name||'Opponent'}</strong><small>{fmtDate(c.date)} · Race to {c.raceTo}</small></div><div className="history-score"><b>{isA?c.scoreA:c.scoreB}</b><span>–</span><b>{isA?c.scoreB:c.scoreA}</b></div><span className={cx('result-tag',c.status!=='Finished'?'tag-upcoming':won?'tag-win':'tag-loss')}>{c.status==='Finished'?(won?'WIN':'LOSS'):c.status}</span></div>}) : <p className="muted-copy">No 1v1 challenges recorded yet.</p>}</div></section></div><section className="panel"><SectionTitle eyebrow="MATCH HISTORY" title="Recent team fixtures"/><div className="match-list">{teamHist.slice(0,3).map(m=><MatchCard key={m.id} m={m} compact/>)}</div>{!teamHist.length&&<p className="muted-copy">No team match history found.</p>}</section></div>};

  const renderNight=()=>{const venueMatches=[...data.matches.filter(m=>m.venueId===venueFilter),...data.challenges.filter(m=>m.venueId===venueFilter)].sort((a,b)=>(a.table||99)-(b.table||99)||(a.queue||99)-(b.queue||99));const tables=venueBy(venueFilter)?.tables||0;return <div className="page-stack"><SectionTitle eyebrow="LIVE VENUE VIEW" title="Match night" sub="See what's playing and what's coming up on every table." action={<select className="select" value={venueFilter} onChange={e=>setVenueFilter(e.target.value)}>{data.venues.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select>}/><div className="night-banner"><div className="night-pulse"/><div><span className="eyebrow">MATCH NIGHT</span><h2>{venueBy(venueFilter)?.name||'Select venue'}</h2><p>{tables} tables · {venueMatches.filter(m=>m.status==='In Progress').length} matches in progress</p></div><div className="night-date">{new Date().toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})}</div></div><div className="table-grid">{Array.from({length:tables},(_,i)=>i+1).map(n=>{const rows=venueMatches.filter(m=>m.table===n);const now=rows.find(m=>m.status==='In Progress');const next=rows.filter(m=>m.status==='Upcoming').sort((a,b)=>(a.queue||99)-(b.queue||99))[0];return <div className="pool-table-card" key={n}><div className="pool-table-head"><div className="table-number">T{String(n).padStart(2,'0')}</div><div><strong>Table {n}</strong><small>{now?'Currently playing':next?'Next match queued':'Table available'}</small></div><span className={cx('table-state',now?'state-live':next?'state-next':'state-free')}>{now?'LIVE':next?'QUEUED':'FREE'}</span></div>{now?<div className="playing-match"><div className="playing-label"><span className="status-dot live"/>NOW PLAYING</div><strong>{now.playerAId?`${playerBy(now.playerAId)?.name} vs ${playerBy(now.playerBId)?.name}`:`${teamBy(now.homeId)?.name} vs ${teamBy(now.awayId)?.name}`}</strong><div className="playing-score">{now.homeScore??now.scoreA??0}<span>:</span>{now.awayScore??now.scoreB??0}</div><div className="playing-actions"><button onClick={()=>openMatch(now,now.playerAId?'challenge':'team')}>Score details <ArrowRight size={13}/></button><button className="finish-btn" onClick={()=>finishMatch(now,now.playerAId?'challenge':'team')}><Flag size={13}/> Finish</button></div></div>:<div className="table-empty"><div className="empty-ball"><Table2 size={19}/></div><span>No match in progress</span></div>}{next&&<div className="up-next"><span>UP NEXT</span><strong>{next.playerAId?`${playerBy(next.playerAId)?.name} vs ${playerBy(next.playerBId)?.name}`:`${teamBy(next.homeId)?.name} vs ${teamBy(next.awayId)?.name}`}</strong><small>{fmtTime(next.date)} · Queue #{next.queue||1}</small><button onClick={()=>startMatch(next,next.playerAId?'challenge':'team')}><Play size={12} fill="currentColor"/> Start match</button></div>}</div>})}</div><div className="callout"><div className="callout-icon"><ListOrdered size={20}/></div><div><strong>Queue controls</strong><p>Starting a match marks it as in progress. Finishing it promotes the next queued fixture on that table.</p></div><button onClick={()=>{setPage('admin');setAdminTab('Matches')}}>Manage queues <ArrowRight size={15}/></button></div></div>};

  const renderDetail=()=>{const m=selectedMatch;if(!m)return <Empty icon={CalendarDays} title="No match selected" text="Choose a match to see details."/>;const ch=m._type==='challenge'||!!m.playerAId;const a=ch?playerBy(m.playerAId):teamBy(m.homeId),b=ch?playerBy(m.playerBId):teamBy(m.awayId);const sa=ch?m.scoreA:m.homeScore,sb=ch?m.scoreB:m.awayScore;const status=m.status;return <div className="page-stack"><button className="back-link" onClick={()=>setPage('matches')}><ChevronLeft size={16}/> Back to matches</button><div className="detail-hero"><div className="detail-meta"><span className={cx('status-pill',status==='In Progress'?'live-pill':status==='Finished'?'finished-pill':'upcoming-pill')}>{status}</span><span>{ch?'1V1 CHALLENGE':'TEAM FIXTURE'}</span><span>·</span><span>{fmtFull(m.date)}</span></div><div className="detail-teams"><div><div className="detail-mark">{ch?<PlayerAvatar p={a}/>:a?.name?.slice(0,2).toUpperCase()}</div><h2>{a?.name||'TBC'}</h2><small>{ch?'Challenger':'Home side'}</small></div><div className="detail-score">{status==='Upcoming'?<span>VS</span>:<><b>{sa??0}</b><i>:</i><b>{sb??0}</b></>}</div><div><div className="detail-mark">{ch?<PlayerAvatar p={b}/>:b?.name?.slice(0,2).toUpperCase()}</div><h2>{b?.name||'TBC'}</h2><small>{ch?'Opponent':'Away side'}</small></div></div><div className="detail-location"><span><MapPin size={15}/>{venueBy(m.venueId)?.name||'Venue TBC'}</span><span><Table2 size={15}/>Table {m.table||'—'}</span><span><Clock3 size={15}/>{fmtTime(m.date)}</span></div><div className="detail-actions"><button className="secondary-btn" onClick={()=>exportICS(m,ch?'challenge':'team')}><CalendarPlus size={15}/> Add to calendar</button><button className="secondary-btn" onClick={()=>sharePreview({...m,_type:ch?'challenge':'team'})}><Share2 size={15}/> Share preview</button>{status==='Upcoming'&&<button className="primary-btn" onClick={()=>startMatch(m,ch?'challenge':'team')}><Play size={15}/> Start match</button>}{status==='In Progress'&&<button className="primary-btn" onClick={()=>setModal({kind:'score',item:m,type:ch?'challenge':'team'})}><Pencil size={15}/> Update score</button>}{status==='In Progress'&&<button className="secondary-btn" onClick={()=>finishMatch(m,ch?'challenge':'team')}><Flag size={15}/> Finish</button>}</div></div>{ch?<div className="panel"><SectionTitle eyebrow="CHALLENGE FORMAT" title={`Race to ${m.raceTo||5}`}/><p className="muted-copy">Head-to-head match. Record the frame score as play progresses.</p></div>:<div className="panel"><SectionTitle eyebrow="MATCH DETAILS" title="Team scorecard"/><p className="muted-copy">{m.note||'League fixture'} · Detailed player frame scoring and the BSA 3-player scorecard can be recorded from the scorecard module in a production backend.</p><button className="secondary-btn" onClick={()=>setModal({kind:'score',item:m,type:'team'})}><Pencil size={15}/> Edit score</button></div>}</div>};

const renderProfile=()=>(
  <div className="page-stack">
    <SectionTitle
      eyebrow="YOUR ACCOUNT"
      title="User Profile"
      sub="Manage your personal details and account settings."
    />
    <div className="panel">
      <div className="admin-head">
        <div>
          <h3>Personal details</h3>
          <p>Your RackStats account information.</p>
        </div>
        <div className="admin-avatar">RS</div>
      </div>
      <div className="settings-line">
        <div><strong>Name</strong><p>League Admin</p></div>
      </div>
      <div className="settings-line">
        <div><strong>Email</strong><p>Not set up yet</p></div>
      </div>
      <div className="settings-line">
        <div><strong>Role</strong><p>League Administrator</p></div>
      </div>
    </div>
    <div className="panel settings-panel">
      <div className="admin-head">
        <div>
          <h3>Account settings</h3>
          <p>Account security and preferences.</p>
        </div>
      </div>
      <div className="settings-line">
        <div><strong>Password</strong><p>Password management requires account authentication.</p></div>
        <span className="pill">Not connected</span>
      </div>
      <div className="settings-line">
        <div><strong>Account security</strong><p>This prototype does not yet have user login.</p></div>
        <span className="pill warning-pill">Demo mode</span>
      </div>
    </div>
    <button className="secondary-btn" onClick={()=>setPage('admin')}>
      Back to Admin
    </button>
  </div>
);  
const renderLeagueSetup=()=>(
  <div className="page-stack">
    <SectionTitle eyebrow="GET STARTED" title="Your league" sub="Create a new league or join one using an invitation code."/>
    {leagueSetupMode==='choose'&&(
      <div className="panel">
        <div className="admin-head">
          <div>
            <h3>Create a league</h3>
            <p>Start fresh and manage your own league.</p>
          </div>
          <button className="primary-btn" onClick={()=>setLeagueSetupMode('create')}>Create league</button>
        </div>
        <div className="admin-head">
          <div>
            <h3>Join a league</h3>
            <p>Join an existing league with its invitation code.</p>
          </div>
          <button className="secondary-btn" onClick={()=>setLeagueSetupMode('join')}>Join league</button>
        </div>
        {data.leagues.length > 0
          ? <button className="secondary-btn" onClick={()=>setPage('home')}>Back to dashboard</button>
          : <button className="secondary-btn" onClick={handleLogout}>Back to login</button>}
      </div>
    )}
    {leagueSetupMode==='create'&&(
      <div className="panel">
        <h3>Create your league</h3>
        <p>Choose a name for your new league.</p>
        <input className="input" value={leagueName} onChange={e=>setLeagueName(e.target.value)} placeholder="League name"/>
        <div className="admin-head">
          <button className="secondary-btn" onClick={()=>setLeagueSetupMode('choose')}>Back</button>
          <button
            className="primary-btn"
            disabled={dataLoading}
            onClick={async () => {
              if (leagueName.trim().length < 2) {
                setToast('League name must be at least 2 characters.');
                return;
              }

              setDataLoading(true);
              try {
                const { data: result, error } = await supabase.rpc('create_league', {
                  p_name: leagueName.trim(),
                  p_season: '2026 Season'
                });

                if (error) throw error;

                const createdLeague = Array.isArray(result) ? result[0] : result;
                if (!createdLeague?.id) {
                  throw new Error('The league was created, but its details could not be loaded.');
                }

                // Reload every league the user belongs to (with real roles from Supabase),
                // so existing leagues are kept and the owner role is applied.
                const workspace = await loadUserWorkspace(user.id, createdLeague.id);
                if (!workspace || !workspace.ok) return;

                setLeagueName('');

                if (!workspace.leagues.some(league => league.id === createdLeague.id)) {
                  setToast('The league was created, but it is not visible to your account yet. Please log out and back in.');
                  return;
                }

                setLeagueSetupMode('choose');
                setPage('home');
                setToast(workspace.leagueLoaded ? 'League created successfully!' : 'League created, but its data could not be loaded.');
              } catch (err) {
                setToast(err.message || 'Could not create the league.');
              } finally {
                setDataLoading(false);
              }
            }}
          >
            {dataLoading ? 'Creating...' : 'Create league'}
          </button>
        </div>
      </div>
    )}
    {leagueSetupMode==='join'&&(
      <div className="panel">
        <h3>Join a league</h3>
        <p>Enter the invitation code shared by the league owner.</p>
        <input className="input" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Invitation code"/>
        <div className="admin-head">
          <button className="secondary-btn" onClick={()=>setLeagueSetupMode('choose')}>Back</button>
          <button
            className="primary-btn"
            disabled={dataLoading}
            onClick={async () => {
              if (!inviteCode.trim()) {
                setToast('Please enter an invitation code.');
                return;
              }

              setDataLoading(true);
              try {
                const { data: joinedLeagueId, error } = await supabase.rpc('join_league_by_code', {
                  code: inviteCode.trim()
                });

                if (error) throw error;

           
                const workspace = await loadUserWorkspace(user.id, joinedLeagueId);
                if (!workspace || !workspace.ok) return;

                setInviteCode('');

                if (!workspace.leagues.some(league => league.id === joinedLeagueId)) {
                  setToast('You joined the league, but its details could not be loaded. Please log in again.');
                  return;
                }

                setLeagueSetupMode('choose');
                setPage('home');
                setToast(workspace.leagueLoaded ? 'Joined league successfully!' : 'Joined league, but its data could not be loaded.');
              } catch (err) {
                setToast(err.message || 'Could not join the league.');
              } finally {
                setDataLoading(false);
              }
            }}
          >
            {dataLoading ? 'Joining...' : 'Join league'}
          </button>
        </div>
      </div>
    )}
  </div>
);

const renderSignup=()=>(
  authMode === 'login' ? (
    <div className="page-stack">
      <SectionTitle
        eyebrow="WELCOME BACK"
        title="Log in to RackStats"
        sub="Sign in to access your account."
      />
      <div className="panel">
        <div className="settings-panel">
          <h3>Log in</h3>
          <label>Email address</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={loginEmail}
            onChange={e=>setLoginEmail(e.target.value)}
          />
          <label>Password</label>
          <input
            className="input"
            type="password"
            placeholder="Your password"
            value={loginPassword}
            onChange={e=>setLoginPassword(e.target.value)}
          />
          <button
            className="primary-btn signup-submit"
            disabled={authLoading}
            onClick={async()=>{
              if (!loginEmail.trim() || !loginPassword) {
                setToast('Please enter your email and password.');
                return;
              }

              setAuthLoading(true);
              try {
                const { error } = await supabase.auth.signInWithPassword({
                  email: loginEmail.trim(),
                  password: loginPassword
                });

                if (error) {
                  setToast(error.message);
                  return;
                }

                // The auth listener sets the user, and the user-ID effect then loads
                // leagues, roles and league data (or routes to league setup).
                setLoginPassword('');
                setToast('Logged in successfully!');
              } catch (err) {
                setToast(err?.message || 'Could not log in.');
              } finally {
                setAuthLoading(false);
              }
            }}
          >
            {authLoading ? 'Logging in...' : 'Log in'}
          </button>
          <p style={{marginTop:16,textAlign:'center'}}>
            Need an account?{' '}
            <button type="button" className="text-btn" onClick={switchAuthMode}>
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  ) : (
  <div className="page-stack">
    <SectionTitle
      eyebrow="WELCOME TO RACKSTATS"
      title="Join the league"
      sub="Create your player account to follow fixtures, track results and compete."
    />
    <div className="panel">
      <div className="settings-panel">
        <h3>Create your account</h3>
        <p>Enter your details to get started.</p>
        <label>Full name</label>
        <input
  className="input"
  placeholder="Your full name"
  value={signupName}
  onChange={e=>setSignupName(e.target.value)}
/>
        <label>Email address</label>
       <input
  className="input"
  type="email"
  placeholder="you@example.com"
  value={signupEmail}
  onChange={e=>setSignupEmail(e.target.value)}
/>
        <label>Password</label>
        <input
  className="input"
  type="password"
  placeholder="Create a password"
  value={signupPassword}
  onChange={e=>setSignupPassword(e.target.value)}
/>
        <label>League invitation code</label>
        <input
  className="input"
  placeholder="Enter code (optional)"
  value={signupCode}
  onChange={e=>setSignupCode(e.target.value)}
/>
        <button
          className="primary-btn signup-submit"
        onClick={async()=>{
  if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
    setToast('Please fill in your name, email and password.');
    return;
  }

  if (signupPassword.length < 6) {
    setToast('Password must be at least 6 characters.');
    return;
  }

  setAuthLoading(true);
  setToast('Creating your account...');

  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          full_name: signupName.trim(),
          invitation_code: signupCode.trim()
        }
      }
    });

    if (error) {
      setToast(error.message);
      return;
    }

    // With email confirmation on, Supabase returns a user with no identities
    // (and no error) when the email is already registered.
    if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
      setLoginEmail(signupEmail.trim());
      setSignupPassword('');
      setAuthMode('login');
      setToast('An account with this email already exists. Please log in.');
      return;
    }

    setSignupPassword('');

    if (signUpData.session) {
      // Immediate session: the auth listener loads the workspace and routes to
      // the dashboard, or to league setup if the user has no leagues yet.
      setToast('Account created successfully!');
    } else {
      setLoginEmail(signupEmail.trim());
      setAuthMode('login');
      setToast('Account created! Check your email to confirm it, then log in.');
    }
  } catch (err) {
    setToast(err?.message || 'Could not create your account.');
  } finally {
    setAuthLoading(false);
  }
}}
          disabled={authLoading}
        >
          {authLoading ? 'Creating account...' : 'Create account'}
   </button>

        <p style={{marginTop:16,textAlign:'center'}}>
          Already have an account?{' '}
          <button
            type="button"
            className="text-btn"
            onClick={switchAuthMode}
          >
            Log in
          </button>
        </p>		
            </div>
    </div>
  </div>
  )
);
const renderAdmin=()=>{const tabs=['Matches','1v1 fixtures','Teams','Players','Leagues','Venues','Members','Settings'];return <div className="page-stack"><SectionTitle eyebrow="CONTROL ROOM" title="Admin" sub="Manage the league, fixtures, rosters and match-night queues." action={<button className="secondary-btn" onClick={resetDemo}>Reload league data</button>}/><div className="admin-tabs">{tabs.map(t=><button key={t} className={adminTab===t?'active':''} onClick={()=>setAdminTab(t)}>{t}</button>)}</div>{adminTab==='Matches'&&<AdminMatches items={leagueMatches} type="team"/>}{adminTab==='1v1 fixtures'&&<AdminMatches items={leagueChallenges} type="challenge"/>}{adminTab==='Teams'&&<div className="panel"><div className="admin-head"><div><h3>Teams</h3><p>Manage league rosters and standings.</p></div><button className="primary-btn" onClick={()=>setModal({kind:'team'})}><Plus size={15}/> Add team</button></div><div className="admin-list">{teams.map(t=><div className="admin-row" key={t.id}><div className="team-mark">{t.name.slice(0,2).toUpperCase()}</div><div className="admin-row-main"><strong>{t.name}</strong><small>{t.players?.length||0} rostered players · {t.played} played</small></div><button className="icon-btn" onClick={()=>setModal({kind:'edit-team',item:t})}><Pencil size={15}/></button><button className="icon-btn danger-icon" onClick={()=>remove('teams',t.id)}><Trash2 size={15}/></button></div>)}</div></div>}{adminTab==='Players'&&<div className="panel"><div className="admin-head"><div><h3>Players</h3><p>Profiles and player statistics.</p></div><button className="primary-btn" onClick={()=>setModal({kind:'player'})}><Plus size={15}/> Add player</button></div><div className="admin-list">{players.filter(p=>teams.some(t=>t.id===p.teamId)).map(p=><div className="admin-row" key={p.id}><PlayerAvatar p={p}/><div className="admin-row-main"><strong>{p.name}</strong><small>{teamBy(p.teamId)?.name||'Unassigned'} · Rank #{p.rank}</small></div><button className="icon-btn" onClick={()=>setModal({kind:'edit-player',item:p})}><Pencil size={15}/></button><button className="icon-btn danger-icon" onClick={()=>remove('players',p.id)}><Trash2 size={15}/></button></div>)}</div></div>}{adminTab==='Leagues'&&<div className="panel"><div className="admin-head"><div><h3>Leagues</h3><p>Support for up to five active leagues.</p></div><button className="primary-btn" disabled={data.leagues.length>=5} onClick={()=>setModal({kind:'league'})}><Plus size={15}/> Add league</button></div><div className="admin-list">{data.leagues.map(l=><div className="admin-row" key={l.id}><div className="admin-row-main"><strong>{l.name}</strong><small>{l.season} · Code: {l.inviteCode||'Not available'}</small></div>
<button className="secondary-btn" onClick={async()=>{if(!l.inviteCode){setToast('No invite code available');return;}try{await navigator.clipboard.writeText(l.inviteCode);setToast('Invite code copied');}catch{setToast('Could not copy invite code');}}}>Copy code</button><button className="secondary-btn" onClick={async()=>{const shareText=`Join my RackStats league "${l.name}" using code: ${l.inviteCode}`;if(navigator.share){try{await navigator.share({title:`Join ${l.name}`,text:shareText});}catch{} }else{try{await navigator.clipboard.writeText(shareText);setToast('League invite copied');}catch{setToast('Could not share invite');}}}}>Share league</button><button className="icon-btn" onClick={()=>switchLeague(l.id,{nextPage:'admin',successToast:'Active league changed'})}><CheckCircle2 size={16}/></button><button className="icon-btn" onClick={()=>setModal({kind:'edit-league',item:l})}><Pencil size={15}/></button></div>)}</div></div>}{adminTab==='Venues'&&<div className="panel"><div className="admin-head"><div><h3>Venues & tables</h3><p>Venue details and table availability.</p></div><button className="primary-btn" onClick={()=>setModal({kind:'venue'})}><Plus size={15}/> Add venue</button></div><div className="admin-list">{data.venues.map(v=><div className="admin-row" key={v.id}><div className="venue-symbol"><MapPin size={17}/></div><div className="admin-row-main"><strong>{v.name}</strong><small>{v.location} · {v.tables} tables</small></div><button className="icon-btn" onClick={()=>setModal({kind:'edit-venue',item:v})}><Pencil size={15}/></button><button className="icon-btn danger-icon" onClick={()=>remove('venues',v.id)}><Trash2 size={15}/></button></div>)}</div></div>}
{adminTab==='Members'&&<div className="panel"><div className="admin-head"><div><h3>League members</h3><p>Manage access and member roles.</p></div><span className="pill">{leagueMembers.length} members</span></div>{!canManageLeagueMembers(currentRole)&&<p className="muted-copy">Only the league owner can change roles or remove members.</p>}<div className="admin-list">{leagueMembers.map(member=><div className="admin-row" key={member.user_id}><div className="admin-row-main"><strong>{member.user_id===user?.id?'You':member.user_id.slice(0,8)+'...'}</strong><small>{member.role.charAt(0).toUpperCase()+member.role.slice(1)}</small></div>{canManageLeagueMembers(currentRole)&&member.role!=='owner'&&<><button className="secondary-btn" onClick={async()=>{const newRole=member.role==='player'?'organiser':'player';const {error}=await supabase.rpc('update_league_member_role',{p_league_id:activeLeague,p_user_id:member.user_id,p_new_role:newRole});if(error){setToast(error.message);return;}const {data:updated}=await supabase.from('league_members').select('user_id,role').eq('league_id',activeLeague);setLeagueMembers(updated??[]);setToast('Member role updated');}}>{member.role==='player'?'Make organiser':'Make player'}</button><button className="icon-btn danger-icon" onClick={async()=>{if(!window.confirm('Remove this member from the league?'))return;const {error}=await supabase.rpc('remove_league_member',{p_league_id:activeLeague,p_user_id:member.user_id});if(error){setToast(error.message);return;}setLeagueMembers(current=>current.filter(m=>m.user_id!==member.user_id));setToast('Member removed');}}><Trash2 size={15}/></button></>}</div>)}</div></div>}
{adminTab==='Settings'&&<div className="panel settings-panel"><div className="settings-line"><div><strong>Match reminders</strong><p>Reminder timing preference for players.</p></div><select className="select" defaultValue="60"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="120">2 hours</option></select></div><div className="settings-line"><div><strong>In-app notifications</strong><p>Queue and match-start banners.</p></div><span className="pill green-pill">Enabled in prototype</span></div><div className="settings-line"><div><strong>Email delivery</strong><p>Requires a backend email provider and scheduled server job.</p></div><span className="pill warning-pill">Not connected</span></div><div className="settings-line"><div><strong>Google Calendar sync</strong><p>Individual player account connection was not authorised.</p></div><span className="pill">Not connected</span></div><div className="settings-line"><div><strong>Data storage</strong><p>Prototype currently saves to this browser's local storage.</p></div><span className="pill warning-pill">Local only</span></div></div>}</div>};
  function AdminMatches({items,type}){const ch=type==='challenge';return <div className="panel"><div className="admin-head"><div><h3>{ch?'1v1 fixtures':'Team fixtures'}</h3><p>Scores, status, venue, table and queue order.</p></div><button className="primary-btn" onClick={()=>setModal({kind:ch?'challenge':'match'})}><Plus size={15}/> Add fixture</button></div><div className="admin-list">{items.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(m=><div className="admin-row" key={m.id}><div className={cx('admin-status-icon',m.status==='In Progress'?'live-bg':m.status==='Finished'?'done-bg':'upcoming-bg')}>{ch?<Swords size={16}/>:<CalendarDays size={16}/>}</div><div className="admin-row-main"><strong>{ch?`${playerBy(m.playerAId)?.name||'Player'} vs ${playerBy(m.playerBId)?.name||'Player'}`:`${teamBy(m.homeId)?.name||'Team'} vs ${teamBy(m.awayId)?.name||'Team'}`}</strong><small>{fmtFull(m.date)} · {venueBy(m.venueId)?.name||'Venue'} · Table {m.table} · Queue #{m.queue||'—'}</small><small>{m.status}{m.status==='Finished'?` · ${ch?m.scoreA+'–'+m.scoreB:m.homeScore+'–'+m.awayScore}`:''}</small></div><button className="icon-btn" title="Edit" onClick={()=>setModal({kind:'edit-'+(ch?'challenge':'match'),item:m})}><Pencil size={15}/></button><button className="icon-btn danger-icon" title="Delete" onClick={()=>remove(ch?'challenges':'matches',m.id)}><Trash2 size={15}/></button></div>)}</div></div>}

  const renderModal=()=>{if(!modal)return null;const kind=modal.kind;const item=modal.item||{};const isEdit=kind.startsWith('edit-');const baseKind=isEdit?kind.slice(5):kind;const submit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const v=Object.fromEntries(fd.entries());if(['match','challenge'].includes(baseKind)){const type=baseKind==='challenge';const entity={leagueId:activeLeague,date:v.date,venueId:v.venueId,table:Number(v.table||1),status:v.status||'Upcoming',queue:Number(v.queue||1),...(type?{playerAId:v.playerAId,playerBId:v.playerBId,raceTo:Number(v.raceTo||5),scoreA:Number(v.scoreA||0),scoreB:Number(v.scoreB||0)}:{homeId:v.homeId,awayId:v.awayId,homeScore:Number(v.homeScore||0),awayScore:Number(v.awayScore||0),note:v.note||'League fixture'})};const arr=type?'challenges':'matches';if(isEdit)update(arr,item.id,entity);else add(arr,entity);setToast(isEdit?'Fixture updated':'Fixture created');}else if(kind==='edit-player'){
  // Updates the existing Supabase `players` row (matched by its UUID and the active league UUID).
  // Only the form's editable columns are sent; avatar, form and other columns are left untouched.
  // Blank number fields keep the player's existing values. React state is updated only after
  // a successful save, using the returned row. On failure the modal stays open.
  if(savingPlayerRef.current)return;
  const name=(v.name||'').trim();
  if(!name){setToast('Could not update player: please enter a name.');return;}
  if(!isUuid(item.id)){setToast('Could not update player: this player has not been saved to the server.');return;}
  if(!isUuid(activeLeague)){setToast('Could not update player: the active league has not been saved to the server.');return;}
  const team=teams.find(t=>t.id===v.teamId);
  if(!team||!isUuid(team.id)){setToast('Could not update player: please choose a team in this league.');return;}

  const leagueId=activeLeague;
  const leagueRequest=leagueRequestRef.current;
  const playerPayload={
    name,
    team_id:team.id,
    email:(v.email||'').trim()||null,
    rank:numOr(v.rank,item.rank),
    played:numOr(v.played,item.played),
    wins:numOr(v.wins,item.wins),
    losses:numOr(v.losses,item.losses),
    frames_won:numOr(v.framesWon,item.framesWon),
    frames_lost:numOr(v.framesLost,item.framesLost),
    golden_breaks:numOr(v.goldenBreaks,item.goldenBreaks),
    run_out_bnf:numOr(v.runOutBnF,item.runOutBnF),
    dry_breaks:numOr(v.dryBreaks,item.dryBreaks),
    successful_breaks:numOr(v.successfulBreaks,item.successfulBreaks),
    pots_made:numOr(v.potsMade,item.potsMade),
    shots_taken:numOr(v.shotsTaken,item.shotsTaken)
  };

  savingPlayerRef.current=true;
  try{
    const {data:rows,error}=await supabase
      .from('players')
      .update(playerPayload)
      .eq('id',item.id)
      .eq('league_id',leagueId)
      .select();

    if(error){setToast('Could not update player: '+error.message);return;}

    // RLS or a missing row makes the update match 0 rows without an error.
    const row=rows?.[0];
    if(!row?.id){
      setToast('Could not update player: you may not have permission to edit players in this league, or the player no longer exists.');
      return;
    }

    const savedPlayer=mapPlayerRow(row);

    // Only touch state if the same league is still loaded (no switch or reload in the meantime).
    if(leagueRequestRef.current===leagueRequest&&row.league_id===leagueId){
      setData(d=>({
        ...d,
        // Avatar uploads are still local-only, so keep any unsaved local avatar on screen.
        players:d.players.map(p=>p.id===savedPlayer.id?{...savedPlayer,avatar:savedPlayer.avatar||p.avatar||''}:p),
        // Move the player between team rosters if their team changed.
        teams:d.teams.map(t=>{
          const others=(t.players||[]).filter(id=>id!==savedPlayer.id);
          return t.id===savedPlayer.teamId?{...t,players:[...others,savedPlayer.id]}:{...t,players:others};
        })
      }));
    }

    setToast('Player updated');
    setModal(null);
  }catch(err){
    setToast('Could not update player: '+(err?.message||'Unknown error'));
  }finally{
    savingPlayerRef.current=false;
  }
  return;
}else if(kind==='player'){
  // Inserts into Supabase `players`. React state is updated only after a successful insert,
  // using the returned row (with its real UUID). On failure the modal stays open.
  if(savingPlayerRef.current)return;
  const name=(v.name||'').trim();
  if(!name){setToast('Could not add player: please enter a name.');return;}
  if(!isUuid(activeLeague)){setToast('Could not add player: the active league has not been saved to the server.');return;}
  const team=teams.find(t=>t.id===v.teamId);
  if(!team||!isUuid(team.id)){setToast('Could not add player: please choose a team in this league.');return;}

  const leagueId=activeLeague;
  const leagueRequest=leagueRequestRef.current;
  savingPlayerRef.current=true;
  try{
    const {data:row,error}=await supabase
      .from('players')
      .insert({
        league_id:leagueId,
        team_id:team.id,
        name,
        email:(v.email||'').trim()||null,
        rank:numOr(v.rank,players.length+1)
      })
      .select()
      .single();

    if(error){setToast('Could not add player: '+error.message);return;}
    if(!row?.id){setToast('Player was saved, but could not be loaded. Please refresh.');setModal(null);return;}

    const savedPlayer=mapPlayerRow(row);

    // Only touch state if the same league is still loaded (no switch or reload in the meantime).
    if(leagueRequestRef.current===leagueRequest&&row.league_id===leagueId){
      setData(d=>({
        ...d,
        players:[...d.players.filter(p=>p.id!==savedPlayer.id),savedPlayer],
        teams:d.teams.map(t=>t.id===savedPlayer.teamId
          ?{...t,players:[...(t.players||[]).filter(id=>id!==savedPlayer.id),savedPlayer.id]}
          :t)
      }));
    }

    setToast('Player added');
    setModal(null);
  }catch(err){
    setToast('Could not add player: '+(err?.message||'Unknown error'));
  }finally{
    savingPlayerRef.current=false;
  }
  return;
}else if(['team','edit-team'].includes(kind)){
  const teamPayload={
    league_id:v.leagueId||activeLeague,
    name:v.name,
    // When editing, blank fields keep the team's existing values so stats are never reset to 0.
    played:numOr(v.played,isEdit?item.played:0),
    wins:numOr(v.wins,isEdit?item.wins:0),
    losses:numOr(v.losses,isEdit?item.losses:0),
    points:numOr(v.points,isEdit?item.points:0)
  };

  const result=isEdit
    ? await supabase.from('teams').update(teamPayload).eq('id',item.id).select().single()
    : await supabase.from('teams').insert(teamPayload).select().single();

  if(result.error){
    setToast('Could not save team: '+result.error.message);
    return;
  }

  const row=result.data;
  const savedTeam={
    id:row.id,
    name:row.name,
    leagueId:row.league_id,
    players:isEdit?(item.players||[]):[],
    played:Number(row.played)||0,
    wins:Number(row.wins)||0,
    losses:Number(row.losses)||0,
    points:Number(row.points)||0
  };

  setData(d=>({
    ...d,
    teams:isEdit
      ? (teamPayload.league_id===activeLeague
          ? d.teams.map(t=>t.id===item.id?savedTeam:t)
          : d.teams.filter(t=>t.id!==item.id))
      : (teamPayload.league_id===activeLeague
          ? [...d.teams,savedTeam]
          : d.teams)
  }));

  setToast(isEdit?'Team updated':'Team added');
}else if(kind==='edit-league'){
  // TEMPORARY, LOCAL-ONLY: league edits are not yet saved to Supabase.
  // They last until the next refresh or league reload. Migrate with an owner-only update (migration step 8).
  update('leagues',item.id,{name:v.name,season:v.season||'2026 Season'});
  setToast('League updated on this device only. Not yet saved to the server.');
}else if(kind==='league'){
  // Creates the league in Supabase via the existing create_league RPC.
  // The league ID is always the UUID returned by Supabase, never uid().
  if(creatingLeagueRef.current)return;
  const name=(v.name||'').trim();
  const season=(v.season||'').trim()||'2026 Season';
  if(name.length<2){setToast('League name must be at least 2 characters.');return;}

  creatingLeagueRef.current=true;
  try{
    const {data:result,error}=await supabase.rpc('create_league',{p_name:name,p_season:season});
    if(error){setToast('Could not create league: '+error.message);return;}

    const createdLeague=Array.isArray(result)?result[0]:result;
    if(!createdLeague?.id||!isUuid(createdLeague.id)){
      setToast('The league was created, but its details could not be loaded. Please refresh.');
      setModal(null);
      return;
    }

    setModal(null);

    // Reload all of the user's leagues and roles from Supabase, then load the new league.
    const workspace=await loadUserWorkspace(user.id,createdLeague.id);
    if(!workspace||!workspace.ok)return;

    if(!workspace.leagues.some(l=>l.id===createdLeague.id)){
      setToast('The league was created, but it is not visible to your account yet. Please log out and back in.');
      return;
    }

    setToast(workspace.leagueLoaded?'League created successfully!':'League created, but its data could not be loaded.');
  }catch(err){
    setToast('Could not create league: '+(err?.message||'Unknown error'));
  }finally{
    creatingLeagueRef.current=false;
  }
  return;
}else if(['venue','edit-venue'].includes(kind)){const vnu={name:v.name,location:v.location,tables:Number(v.tables||1)};if(isEdit)update('venues',item.id,vnu);else add('venues',vnu);setToast(isEdit?'Venue updated':'Venue added');}else if(baseKind==='score'){const isCh=modal.type==='challenge';const arr=isCh?'challenges':'matches';const patch=isCh?{scoreA:Number(v.scoreA),scoreB:Number(v.scoreB)}:{homeScore:Number(v.homeScore),awayScore:Number(v.awayScore)};update(arr,item.id,patch);setToast('Score saved');}setModal(null)};
    const field=(label,name,def='',type='text',opts=null,required=false)=><label className="form-field"><span>{label}</span>{opts?<select name={name} defaultValue={def} required={required}>{opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input name={name} type={type} defaultValue={def} required={required}/>}</label>;
    let title='';let fields=[];
    if(baseKind==='match'||baseKind==='challenge'){const ch=baseKind==='challenge';title=(isEdit?'Edit ':'New ')+(ch?'1v1 fixture':'team fixture');fields=[field('Date & time','date',item.date||'2026-10-24T18:00','datetime-local',null,true),...(ch?[field('Player A','playerAId',item.playerAId||players[0]?.id,'text',players.map(p=>({value:p.id,label:p.name})),true),field('Player B','playerBId',item.playerBId||players[1]?.id,'text',players.map(p=>({value:p.id,label:p.name})),true),field('Race to','raceTo',item.raceTo||5,'number')]:[field('Home team','homeId',item.homeId||teams[0]?.id,'text',teams.map(t=>({value:t.id,label:t.name})),true),field('Away team','awayId',item.awayId||teams[1]?.id,'text',teams.map(t=>({value:t.id,label:t.name})),true)]),field('Venue','venueId',item.venueId||data.venues[0]?.id,'text',data.venues.map(v=>({value:v.id,label:v.name})),true),field('Table number','table',item.table||1,'number'),field('Queue position','queue',item.queue||1,'number'),field('Status','status',item.status||'Upcoming','text',['Upcoming','In Progress','Finished'].map(s=>({value:s,label:s}))),...(ch?[field('Player A score','scoreA',item.scoreA||0,'number'),field('Player B score','scoreB',item.scoreB||0,'number')]:[field('Home score','homeScore',item.homeScore||0,'number'),field('Away score','awayScore',item.awayScore||0,'number'),field('Notes','note',item.note||'League fixture')])];}
    else if(kind==='player'){title='Add player';fields=[field('Full name','name','','text',null,true),field('Team','teamId',teams[0]?.id,'text',teams.map(t=>({value:t.id,label:t.name})),true),field('Email','email'),field('Ranking','rank',players.length+1,'number')];}
    else if(kind==='edit-player'){title='Edit player';fields=[field('Full name','name',item.name,'text',null,true),field('Team','teamId',item.teamId,'text',teams.map(t=>({value:t.id,label:t.name})),true),field('Email','email',item.email),field('Ranking','rank',item.rank,'number'),field('Matches played','played',item.played,'number'),field('Wins','wins',item.wins,'number'),field('Losses','losses',item.losses,'number'),field('Frames won','framesWon',item.framesWon,'number'),field('Frames lost','framesLost',item.framesLost,'number'),field('Golden breaks','goldenBreaks',item.goldenBreaks,'number'),field('Run out BnF','runOutBnF',item.runOutBnF,'number'),field('Dry breaks','dryBreaks',item.dryBreaks,'number'),field('Successful breaks','successfulBreaks',item.successfulBreaks,'number'),field('Pots made','potsMade',item.potsMade,'number'),field('Shots taken','shotsTaken',item.shotsTaken,'number')];}
    else if(kind==='team'){title='Add team';fields=[field('Team name','name','','text',null,true),field('League','leagueId',activeLeague,'text',data.leagues.map(l=>({value:l.id,label:l.name})),true)];}
    else if(kind==='edit-team'){title='Edit team';fields=[field('Team name','name',item.name,'text',null,true),field('League','leagueId',item.leagueId,'text',data.leagues.map(l=>({value:l.id,label:l.name})),true),field('Played','played',item.played,'number'),field('Wins','wins',item.wins,'number'),field('Losses','losses',item.losses,'number'),field('Points','points',item.points,'number')];}
    else if(baseKind==='league'||baseKind==='edit-league'){title=isEdit?'Edit league':'Add league';fields=[field('League name','name',item.name||'','text',null,true),field('Season','season',item.season||'2026 Season')];}
    else if(baseKind==='venue'||baseKind==='edit-venue'){title=isEdit?'Edit venue':'Add venue';fields=[field('Venue name','name',item.name||'','text',null,true),field('Location','location',item.location||''),field('Number of tables','tables',item.tables||4,'number')];}
    else if(baseKind==='score'){const ch=modal.type==='challenge';title='Update score';fields=ch?[field(`${playerBy(item.playerAId)?.name||'Player A'} score`,'scoreA',item.scoreA||0,'number'),field(`${playerBy(item.playerBId)?.name||'Player B'} score`,'scoreB',item.scoreB||0,'number')]:[field(`${teamBy(item.homeId)?.name||'Home'} score`,'homeScore',item.homeScore||0,'number'),field(`${teamBy(item.awayId)?.name||'Away'} score`,'awayScore',item.awayScore||0,'number')];}
    return <Modal title={title} onClose={()=>setModal(null)} wide={kind==='edit-player'}><form className="form-grid" onSubmit={submit}>{fields}{kind==='edit-player'&&<p className="form-hint">Frame difference and win percentage are calculated automatically from these values.</p>}{kind==='edit-league'&&<p className="form-hint">League edits are temporarily saved on this device only and will be lost on refresh.</p>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setModal(null)}>Cancel</button><button type="submit" className="primary-btn"><Check size={15}/> Save changes</button></div></form></Modal>;
  };

  return <div className="app-shell"><aside className={cx('sidebar',mobileMenu&&'sidebar-open')}><div className="brand"><div className="brand-icon"><div className="brand-eight">8</div></div><div><strong>RACK<span>STATS</span></strong><small>POOL, TRACKED.</small></div><button className="mobile-close icon-btn" onClick={()=>setMobileMenu(false)}><X size={18}/></button></div><div className="league-select-wrap"><span className="nav-caption">ACTIVE LEAGUE</span><div className="league-select"><span className="league-icon"><Trophy size={15}/></span><select value={activeLeague} onChange={e=>setLeague(e.target.value)}>{data.leagues.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><ChevronDown size={14}/></div><button className="secondary-btn" style={{width:'100%',marginTop:8}} onClick={()=>{setLeagueSetupMode('join');setPage('league-setup')}}>+ Join another league</button></div><div className="nav-caption nav-heading">MENU</div><nav className="side-nav">{NAV.filter(n => n.id !== 'admin' || currentRole === 'owner' || currentRole === 'organiser').map(n=><button key={n.id} className={cx('nav-item',page===n.id||(page==='player'&&n.id==='players')||(page==='match-detail'&&n.id==='matches')?'active':'')} onClick={()=>{setPage(n.id);setMobileMenu(false)}}><n.icon size={18}/><span>{n.label}</span>{n.id==='night'&&<span className="nav-live"/>}</button>)}</nav><div className="sidebar-bottom"><div className="season-card"><div className="season-icon"><Award size={17}/></div><div><strong>{league?.season||'2026 Season'}</strong><small>Season in progress</small></div><span className="green-indicator"/></div><button className="user-mini" onClick={()=>setPage('profile')}><div className="admin-avatar">RS</div><div><strong>League Admin</strong><small>Administrator</small></div><Settings size={15}/></button></div></aside>
    {mobileMenu&&<button className="mobile-scrim" onClick={()=>setMobileMenu(false)} aria-label="Close menu"/>}
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="menu-trigger icon-btn" onClick={()=>setMobileMenu(true)}><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13}/><strong>{page==='home'?'Overview':page==='table'?'League table':page==='night'?'Match night':page==='player'?'Player profile':page==='match-detail'?'Match details':page==='admin'?'Admin':'Matches'}</strong></div></div><div className="topbar-actions"><div className="season-pill"><span className="green-indicator"/> {league?.season||'Current season'}</div><button className="icon-btn notification-btn" onClick={()=>setToast('No new notifications')}><Bell size={18}/><i/></button><div className="top-avatar">RS</div></div></header><div className="content-wrap">{renderContent()}</div><footer className="app-footer"><span>© 2026 RackStats</span><span>Built for the love of the game <span className="footer-dot">●</span></span></footer></main>{renderModal()}{toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}</div>;

  function renderPage(){
  return page === 'home' || page === 'signup' ? renderHome()
  : page === 'matches' ? renderMatches()
  : page === 'table' ? renderTable()
  : page === 'players' ? renderPlayers()
  : page === 'membership' ? renderMembership()	
  : page === 'player' ? renderPlayer()
  : page === 'night' ? renderNight()
  : page === 'match-detail' ? renderDetail()
  : page === 'admin' && (currentRole === 'owner' || currentRole === 'organiser') ? renderAdmin() : renderHome();
  }

  function renderStatus(title, text){
    return <div className="page-stack"><div className="panel"><SectionTitle eyebrow="RACKSTATS" title={title} sub={text}/></div></div>;
  }

  function renderLoadError(title, message, onRetry){
    return <div className="page-stack"><div className="panel"><SectionTitle eyebrow="SOMETHING WENT WRONG" title={title} sub={message}/><div className="admin-head"><button className="primary-btn" onClick={onRetry}>Try again</button><button className="secondary-btn" onClick={handleLogout}>Log out</button></div></div></div>;
  }

  // Never renders league pages until the user's leagues and the active league's
  // data have loaded from Supabase for the current user.
  function renderContent(){
    if (authChecking) return renderStatus('Restoring your session…', 'Checking your sign-in details.');
    if (!user) return renderSignup();
    if (workspaceLoading || workspaceUserId !== user.id) return renderStatus('Loading your leagues…', 'Fetching your leagues and membership.');
    if (workspaceError) return renderLoadError('Could not load your leagues', workspaceError, () => loadUserWorkspace(user.id, activeLeague));
    if (page === 'league-setup' || data.leagues.length === 0) return renderLeagueSetup();
    if (leagueLoading || !activeLeague) return renderStatus('Loading league…', `Fetching ${league?.name || 'league'} data.`);
    if (leagueError) return renderLoadError(`Could not load ${league?.name || 'league'} data`, leagueError, () => reloadLeague(activeLeague));
    return renderPage();
  }
}