import { App } from "@/components/app";
import { home } from "@/lib/service";

// Live rows (trending, K-dramas…) refresh every 6 hours.
export const revalidate = 21600;

export default async function Page() {
  return <App home={await home()} />;
}
