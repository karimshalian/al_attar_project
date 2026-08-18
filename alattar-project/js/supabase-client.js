/* Al-Attar — supabase-client.js
   Initializes the Supabase connection and exposes small auth/profile helpers
   used by auth.js, app.js, nav.js, and admin.js.
*/
const SUPABASE_URL = "https://hbgagjeqzstdxdhziqzv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZ2FnamVxenN0ZHhkaHppcXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU3NDQsImV4cCI6MjEwMDYzMTc0NH0.wNdlh9C5AAwjn2RH5_AlewCVT2vm3DLZauGCFPrvicY";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Shared in-memory auth state. Populated by refreshAuthState() and kept
   current via onAuthStateChange. Other scripts read window.AUTH.* directly. */
window.AUTH = { user: null, profile: null, ready: false };

async function refreshAuthState(event) {
  const { data: { session } } = await sb.auth.getSession();
  window.AUTH.user = session?.user || null;
  if (window.AUTH.user) {
    const { data: profile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", window.AUTH.user.id)
      .single();
    window.AUTH.profile = profile || null;
  } else {
    window.AUTH.profile = null;
  }
  window.AUTH.ready = true;
  // TOKEN_REFRESHED fires silently in the background (e.g. when the browser tab
  // regains focus) — the session is unchanged, so don't tell the rest of the app
  // to re-render. Real sign-in/sign-out/user-update events still notify as usual.
  if (event === "TOKEN_REFRESHED") return;
  document.dispatchEvent(new CustomEvent("auth-changed"));
}

sb.auth.onAuthStateChange((event) => { refreshAuthState(event); });
refreshAuthState();
