import { redirect } from "next/navigation";

/** Legacy URL — geography UI now lives under Diversification. */
export default function GeographieRedirectPage() {
  redirect("/diversification");
}
