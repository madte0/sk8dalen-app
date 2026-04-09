"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// REVIEW: No authentication required — anyone with the URL can insert rows into the
// "riders" table. If registration should be restricted, add auth or at minimum
// a Supabase RLS policy on the riders table.

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [stance, setStance] = useState("regular");
  const [age, setAge] = useState("");

  const register = async () => {
    // REVIEW: No client-side validation — name can be empty, age can be 0 or negative.
    // Number("") returns 0, which is a valid but nonsensical age. Validate before insert.

    const { error } = await supabase.from("riders").insert({
      name,
      sponsor,
      stance,
      age: Number(age),
    });

    // REVIEW: Using alert() for user feedback — use inline state-based messages instead.
    // REVIEW: Error details (error.message) are swallowed — log or display them for debugging.
    if (error) {
      alert("Registration failed");
    } else {
      alert("Registration successful!");
      setName("");
      setSponsor("");
      setAge("");
      // REVIEW: stance is not reset after successful registration — it keeps whatever
      // the previous user selected.
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-4xl font-bold mb-10">Rider Registration</h1>

      {/* REVIEW: No <form> wrapper — users can't submit with Enter key.
          Also no loading/disabled state on the button during submission,
          so users can double-click and create duplicate entries. */}

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

        {/* REVIEW: No min attribute — negative ages can be entered. Add min="1" and
            consider a max as well. */}
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

        {/* REVIEW: No navigation link back to login or other pages — user is stranded here. */}
      </div>
    </div>
  );
}
