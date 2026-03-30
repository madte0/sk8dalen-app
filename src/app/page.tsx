"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const [riders, setRiders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRiders()
  }, [])

  const fetchRiders = async () => {
    const { data, error } = await supabase
      .from("riders")
      .select("*")

    if (error) {
      console.error("Error fetching riders:", error)
    } else {
      setRiders(data || [])
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen text-white p-10">
      <h1 className="text-5xl font-bold mb-6">
        SK8DALEN COMPETITION
      </h1>

      {loading && <p>Loading riders...</p>}

      {!loading && riders.length === 0 && (
        <p>No riders yet (connection works 👍)</p>
      )}

      {riders.map((rider) => (
        <div key={rider.id} className="mb-2 text-xl">
          {rider.name}
        </div>
      ))}
    </main>
  )
}