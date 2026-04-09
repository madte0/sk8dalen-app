import { redirect } from "next/navigation";

// REVIEW: This redirects ALL visitors to /login unconditionally — even users who are
// already authenticated. Check the auth session first and redirect logged-in users
// to their role-appropriate page (e.g. /admin, /judge) instead of forcing re-login.
export default function Home() {
  redirect("/login");
}
