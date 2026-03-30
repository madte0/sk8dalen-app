"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

type Leader = {
  rider_name: string
  best_score: number
}

export default function LeaderboardPage() {

  const [leaders, setLeaders] = useState<Leader[]>([])
  const [flashLeader, setFlashLeader] = useState<string | null>(null)

  useEffect(() => {

    fetchLeaderboard()

    const channel = supabase
      .channel("leaderboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        () => fetchLeaderboard()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  }, [])

  const fetchLeaderboard = async () => {

    const { data } = await supabase.rpc("leaderboard_view")

    if (!data) return

    if (leaders.length && data[0]?.rider_name !== leaders[0]?.rider_name) {

      setFlashLeader(data[0]?.rider_name)

      setTimeout(() => {
        setFlashLeader(null)
      }, 4000)

    }

    setLeaders(data)

  }

  return (

    <div className="min-h-screen bg-black text-white p-10 relative overflow-hidden">

      {/* Grit Background */}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#111,_#000)] opacity-80" />

      {/* HEADER */}

      <h1 className="text-6xl font-extrabold mb-12 tracking-widest text-center relative z-10">
        SK8DALEN BOWL WARRIORS<br/>
        2026 STHML
      </h1>

      {/* NEW LEADER FLASH */}

      {flashLeader && (

        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-pink-600 text-white px-10 py-6 rounded-xl text-3xl font-bold animate-bounce z-50">

          🔥 NEW LEADER  
          {" "}
          {flashLeader}

        </div>

      )}

      {/* LEADERBOARD */}

      <div className="space-y-6 relative z-10 max-w-4xl mx-auto">

        <AnimatePresence>

          {leaders.map((leader, index) => {

            const podium = index === 0 || index === 1 || index === 2

            return (

              <motion.div
                key={leader.rider_name}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className={`p-8 rounded-2xl flex justify-between items-center text-3xl font-bold
                ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-500 to-pink-600 shadow-2xl scale-105"
                    : podium
                    ? "bg-zinc-800"
                    : "bg-zinc-900"
                }`}
              >

                <span className="flex items-center gap-4">

                  {index === 0 && "👑"}

                  {index + 1}. {leader.rider_name}

                </span>

                <span className="text-white text-4xl font-extrabold">
                  {leader.best_score.toFixed(2)}
                </span>

              </motion.div>

            )

          })}

        </AnimatePresence>

      </div>

      {/* FOOTER */}

      <div className="text-center text-zinc-500 mt-16 text-sm relative z-10">
        LIVE SCORING — SK8DALEN COMPETITION
      </div>

    </div>

  )

}