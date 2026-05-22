import BriefDjClient from "./BriefDjClient";
import { listBriefings } from "./actions";

export const dynamic = "force-dynamic";

export default async function BriefDjPage() {
  const initialList = await listBriefings();
  return <BriefDjClient initialList={initialList} />;
}
