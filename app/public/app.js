// --- Move Around TMS login script ---
const supabase = window.supabase.createClient(
  "https://wqeidcatuwqtzwhvmqfr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ",
);

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.textContent = "Enter both email and password.";
    msg.style.color = "orange";
    return;
  }

  msg.textContent = "Signing in...";
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    msg.textContent = "❌ " + error.message;
    msg.style.color = "#ff6b6b";
  } else {
    msg.textContent = "✅ Login successful! Redirecting...";
    msg.style.color = "#90ee90";
    setTimeout(() => (window.location.href = "/"), 800);
  }
}

// Allow Enter key to submit
document.addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});

// Check if user is already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    console.log("User already logged in, redirecting...");
    window.location.href = "/";
  }
});
