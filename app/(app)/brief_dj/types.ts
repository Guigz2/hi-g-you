// Domain types for the Brief DJ app.

export type EnergyLevel = "calme" | "moyenne" | "haute";
export type DjVoice = "annonces" | "minimal" | "silencieux";

export interface Logistique {
  date: string;
  venue_name: string;
  address: string;
  load_in: string;
  cocktail: string;
  dinner: string;
  party: string;
  end_time: string;
  curfew: string;
  power_notes: string;
}

export interface Musique {
  ceremony_entry: string;
  ceremony_exit: string;
  cocktail_vibe: string;
  dinner_style: string;
  first_dance: string;
  cake_song: string;
  last_song: string;
  key_moments: string;
}

export interface Playlists {
  must_play: string[];
  do_not_play: string[];
  preferred_genres: string[];
  preferred_artists: string[];
  age_range: string;
  nationalities: string;
  energy_level: EnergyLevel;
  guest_notes: string;
}

export interface Micro {
  speeches: string;
  speech_time: string;
  dj_voice: DjVoice;
  jingles: string;
  animation_notes: string;
}

export interface Contacts {
  partner_a: string;
  partner_b: string;
  onsite_name: string;
  onsite_phone: string;
  planner_name: string;
  planner_phone: string;
}

export interface NotesSlice {
  free: string;
}

export interface BriefingData {
  logistique: Logistique;
  musique: Musique;
  playlists: Playlists;
  micro: Micro;
  contacts: Contacts;
  notes: NotesSlice;
}

export interface Briefing {
  id: string | null;
  user_id?: string;
  title: string;
  wedding_date: string | null;
  data: BriefingData;
  saved: Record<string, string>; // section id -> ISO timestamp of last save
  created_at: string | null;
  updated_at: string | null;
}

export interface BriefingListRow {
  id: string;
  title: string | null;
  wedding_date: string | null;
  created_at: string;
  updated_at: string;
}

export type SectionId =
  | "logistique"
  | "musique"
  | "playlists"
  | "micro"
  | "contacts"
  | "notes";

export const EMPTY_BRIEFING = (): Briefing => ({
  id: null,
  title: "",
  wedding_date: null,
  saved: {},
  created_at: null,
  updated_at: null,
  data: {
    logistique: {
      date: "", venue_name: "", address: "",
      load_in: "", cocktail: "", dinner: "", party: "", end_time: "",
      curfew: "", power_notes: "",
    },
    musique: {
      ceremony_entry: "", ceremony_exit: "",
      cocktail_vibe: "", dinner_style: "",
      first_dance: "", cake_song: "", last_song: "",
      key_moments: "",
    },
    playlists: {
      must_play: [], do_not_play: [],
      preferred_genres: [], preferred_artists: [],
      age_range: "", nationalities: "", energy_level: "moyenne",
      guest_notes: "",
    },
    micro: {
      speeches: "", speech_time: "",
      dj_voice: "annonces", jingles: "", animation_notes: "",
    },
    contacts: {
      partner_a: "", partner_b: "",
      onsite_name: "", onsite_phone: "",
      planner_name: "", planner_phone: "",
    },
    notes: { free: "" },
  },
});

// Merge a server row (possibly partial JSON) with defaults so the UI is safe.
export function hydrateBriefing(raw: Partial<Briefing> & { data?: Partial<BriefingData> }): Briefing {
  const empty = EMPTY_BRIEFING();
  return {
    ...empty,
    ...raw,
    id: raw.id ?? null,
    saved: raw.saved ?? {},
    data: {
      logistique: { ...empty.data.logistique, ...(raw.data?.logistique || {}) },
      musique:    { ...empty.data.musique,    ...(raw.data?.musique || {}) },
      playlists:  { ...empty.data.playlists,  ...(raw.data?.playlists || {}) },
      micro:      { ...empty.data.micro,      ...(raw.data?.micro || {}) },
      contacts:   { ...empty.data.contacts,   ...(raw.data?.contacts || {}) },
      notes:      { ...empty.data.notes,      ...(raw.data?.notes || {}) },
    },
  };
}

export function isSectionComplete(id: SectionId, data: BriefingData): boolean {
  const s = data[id] as any;
  switch (id) {
    case "logistique": return !!(s.date && s.venue_name && (s.party || s.cocktail));
    case "musique":    return !!(s.first_dance && s.last_song);
    case "playlists":  return (s.must_play?.length || 0) > 0 || (s.preferred_genres?.length || 0) > 0;
    case "micro":      return !!s.dj_voice;
    case "contacts":   return !!(s.partner_a && s.partner_b);
    case "notes":      return !!(s.free && s.free.trim().length > 0);
  }
}
