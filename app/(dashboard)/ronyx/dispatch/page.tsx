import { redirect } from "next/navigation";

// /ronyx/dispatch is not a work surface — the Dispatch Board is. Send anyone who
// lands here (old links, typed URL) straight to the board so there's one clear home
// for dispatch instead of a stale landing page.
export default function RonyxDispatchPage() {
  redirect("/ronyx/dispatch/board");
}
