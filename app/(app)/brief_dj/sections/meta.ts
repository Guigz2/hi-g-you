import type { SectionId } from "../types";

export interface SectionMeta {
  id: SectionId;
  num: string;
  label: string;
  subtitle: string;
  icon: "clock" | "music" | "list" | "mic" | "users" | "note";
}

export const SECTIONS: SectionMeta[] = [
  { id: "logistique", num: "01", label: "Logistique",        subtitle: "Lieu, horaires de la journée, contraintes techniques.", icon: "clock" },
  { id: "musique",    num: "02", label: "Programme musical", subtitle: "Moments clés et ambiances par séquence.",               icon: "music" },
  { id: "playlists",  num: "03", label: "Playlists",         subtitle: "Must-play, no-go et profil du public.",                 icon: "list" },
  { id: "micro",      num: "04", label: "Micro & animation", subtitle: "Prises de parole, ton du DJ, jingles.",                 icon: "mic" },
  { id: "contacts",   num: "05", label: "Contacts",          subtitle: "Les mariés et les référents joignables.",               icon: "users" },
  { id: "notes",      num: "06", label: "Notes libres",      subtitle: "Tout le reste — coordination, points d'attention.",     icon: "note" },
];
