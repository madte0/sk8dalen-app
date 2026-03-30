"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [sponsor, setSponsor] = useState("")
  const [stance, setStance] = useState("regular")
  const [age, setAge] = useState("")

  const register = async () => {
    const { error } = await supabase.from("riders").insert({
      name,
      sponsor,
      stance,
      age: Number(age),
    })

    if (error) {
      alert("Registration failed")
    } else {
      alert("Registration successful!")
      setName("")
      setSponsor("")
      setAge("")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-4xl font-bold mb-10">
        Rider Registration
      </h1>

      <div className="space-y-4 max-w-md">

        <input
          placeholder="Name"
          className="w-full p-3 bg-zinc-900 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Sponsor"
          className="w-full p-3 bg-zinc-900 rounded"
          value={sponsor}
          onChange={(e) => setSponsor(e.target.value)}
        />

        <input
          placeholder="Age"
          type="number"
          className="w-full p-3 bg-zinc-900 rounded"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />

        <select
          className="w-full p-3 bg-zinc-900 rounded"
          value={stance}
          onChange={(e) => setStance(e.target.value)}
        >
          <option value="regular">Regular</option>
          <option value="goofy">Goofy</option>
        </select>

        <button
          onClick={register}
          className="bg-green-600 px-6 py-3 rounded hover:bg-green-700"
        >
          Register
        </button>

      </div>
    </div>
  )
}