"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // REVIEW: Using alert() for error feedback is poor UX — blocks the UI thread.
    // Display errors inline with a state variable (e.g. <p className="text-red-500">...</p>).
    if (error) {
      alert("Login failed: " + error.message);
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // GET USER ROLE
    const { data: userRole, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (roleError || !userRole) {
      alert("User role not found");
      setLoading(false);
      return;
    }

    // REVIEW: No handling for the "rider" role — if a rider logs in they get an
    // "Invalid user role" alert and are stuck on the login page. Either add a rider
    // dashboard route or redirect them to the leaderboard / registration page.
    if (userRole.role === "admin") {
      router.push("/admin");
    } else if (userRole.role === "judge") {
      router.push("/judge");
    } else {
      alert("Invalid user role");
    }

    // REVIEW: setLoading(false) is called after router.push — the component may already
    // be unmounting. Move this into a finally block or guard with an isMounted check.
    setLoading(false);
  };

  return (
    <div className="login-m bg-black text-white flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-xl w-[350px]">
        <h1 className="text-3xl font-bold mb-6 text-center">SK8DALEN LOGIN</h1>

        {/* REVIEW: Wrap inputs in a <form> element with onSubmit so users can press Enter
            to log in. Currently there is no form submission — only the button click works. */}

        {/* REVIEW: Missing type="email" on email input — mobile users won't get the
            email-optimized keyboard layout. Also missing value={email} for controlled input. */}
        <input
          className="w-full mb-4 p-2 bg-black border border-zinc-700 rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* REVIEW: Missing value={password} — input is uncontrolled. Should be controlled
            for consistency and so React owns the input state. */}
        <input
          type="password"
          className="w-full mb-4 p-2 bg-black border border-zinc-700 rounded"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-700 transition p-2 rounded font-bold"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* REVIEW: No link to the /register page — riders have no way to discover registration. */}
      </div>
    </div>
  );
}
