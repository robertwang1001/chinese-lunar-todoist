import { token } from "@/lib/session";
import { Planner } from "@/components/planner";
export default async function Home() {
  return (
    <Planner
      connected={Boolean(await token())}
      configured={Boolean(
        process.env.TODOIST_CLIENT_ID &&
        process.env.TODOIST_CLIENT_SECRET &&
        process.env.SESSION_SECRET,
      )}
    />
  );
}
