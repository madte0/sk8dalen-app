"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function LoginPage() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleLogin = async () => {

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Login failed: " + error.message)
      setLoading(false)
      return
    }

    const userId = data.user.id

    // GET USER ROLE
    const { data: userRole, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single()

    if (roleError || !userRole) {
      alert("User role not found")
      setLoading(false)
      return
    }

    // REDIRECT BASED ON ROLE
    if (userRole.role === "admin") {
      router.push("/admin")
    } else if (userRole.role === "judge") {
      router.push("/judge")
    } else {
      alert("Invalid user role")
    }

    setLoading(false)

  }

  return (

    <div className="login-m bg-black text-white flex items-center justify-center">

      <div className="bg-zinc-900 p-8 rounded-xl w-[350px]">

        <h1 className="text-3xl font-bold mb-6 text-center">
          SK8DALEN LOGIN
        </h1>

        <input
          className="w-full mb-4 p-2 bg-black border border-zinc-700 rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

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

      </div>

    </div>

  )

}