"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// REVIEW: Extensive use of `any` types throughout this file (11+ instances) defeats the
// purpose of TypeScript. Define proper interfaces for User, Profile, Heat, Run, Score, etc.

export default function JudgePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [heats, setHeats] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [runWinner, setRunWinner] = useState<any>(null);

  const [selectedHeat, setSelectedHeat] = useState<string>("");

  const [currentRun, setCurrentRun] = useState<any>(null);
  const [nextRuns, setNextRuns] = useState<any[]>([]);

  // REVIEW: Score sliders default to 8 and range is 8–14. This is a narrow, arbitrary range
  // with no documentation. Consider using a standard 1–10 or 0–100 scale and making it
  // configurable. The min value of 8 means judges can never give a low score.
  const [difficulty, setDifficulty] = useState(8);
  const [style, setStyle] = useState(8);
  const [consistency, setConsistency] = useState(8);

  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  /* ---------------- AUTH ---------------- */

  // REVIEW: Stale closure bug — `currentRun` on line 54 is captured as `null` (the initial
  // value) when this effect runs. It will never be truthy inside the realtime callback.
  // Use a ref (useRef) to track currentRun, or add currentRun to the dependency array
  // (which would require unsubscribing/resubscribing on every change).

  // REVIEW: Missing dependency array values — ESLint react-hooks/exhaustive-deps would
  // flag `currentRun` and `fetchCurrentQueue`, `fetchLeaderboard`, `fetchRunWinner`, `checkUser`
  // as missing dependencies.
  useEffect(() => {
    checkUser();
    fetchCurrentQueue();

    const channel = supabase
      .channel("judge-live")

      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "runs" },
        (payload) => {
          if (payload.new.active === true || payload.old.active === true) {
            fetchCurrentQueue();
          }
        },
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        () => {
          fetchLeaderboard();
          if (currentRun) {
            fetchRunWinner(currentRun.run_number);
          }
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedHeat) {
      fetchLeaderboard();
      fetchCurrentQueue();
    }
  }, [selectedHeat]);

  /* ---------------- AUTH CHECK ---------------- */

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.replace("/login");
      return;
    }

    const { data: userRole } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!userRole) {
      router.replace("/login");
      return;
    }

    // REVIEW: Non-judge users are redirected to /admin regardless of their actual role.
    // Should redirect to /login instead, or check if the user is actually an admin first.
    if (userRole.role !== "judge") {
      router.replace("/admin");
      return;
    }

    setUser(data.user);
    setProfile(userRole);

    fetchHeats();
  };

  /* ---------------- DATA ---------------- */

  const fetchHeats = async () => {
    const { data } = await supabase.from("heats").select("*").order("name");

    if (data) {
      setHeats(data);

      if (data.length > 0) {
        setSelectedHeat(data[0].id);
      }
    }
  };

  const fetchCurrentQueue = async () => {
    const { data: active } = await supabase
      .from("runs")
      .select(
        `
        id,
        run_number,
        heat_id,
        status,
        active,
        rider:rider_id(name)
      `,
      )
      .eq("active", true)
      .maybeSingle();

    if (active) {
      setCurrentRun(active);
      setScoreSubmitted(false);

      fetchRunWinner(active.run_number);
    } else {
      setCurrentRun(null);
    }

    const { data: next } = await supabase
      .from("runs")
      .select(
        `
        run_number,
        rider:rider_id(name)
      `,
      )
      .eq("status", "pending")
      .order("run_order")
      .limit(3);

    setNextRuns(next || []);
  };

  const fetchLeaderboard = async () => {
    if (!selectedHeat) return;

    const { data } = await supabase
      .from("leaderboard_by_heat")
      .select("*")
      .eq("heat_id", selectedHeat)
      .order("best_score", { ascending: false });

    setLeaders(data || []);
  };

  const fetchRunWinner = async (runNumber: number) => {
    const { data } = await supabase
      .from("leaderboard_by_run")
      .select("*")
      .eq("run_number", runNumber)
      .order("best_score", { ascending: false })
      .limit(1)
      .maybeSingle();

    setRunWinner(data || null);
  };

  /* ---------------- SCORE ---------------- */

  const submitScore = async () => {
    if (!currentRun || !currentRun.active) {
      alert("Waiting for admin to start run");
      return;
    }

    if (currentRun.status === "completed") {
      alert("Run already finished");
      return;
    }

    if (scoreSubmitted) {
      alert("Score already submitted");
      return;
    }

    const { error } = await supabase.from("scores").insert({
      run_id: currentRun.id,
      judge_id: user.id,
      difficulty,
      style,
      consistency,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setScoreSubmitted(true);

    const { data: judges } = await supabase
      .from("users")
      .select("id")
      .eq("role", "judge");

    const { data: scores } = await supabase
      .from("scores")
      .select("judge_id")
      .eq("run_id", currentRun.id);

    // REVIEW: Race condition — this auto-complete logic runs on the client. If two judges
    // submit at the same time, both may read the same score count and both attempt to
    // mark the run as completed. This logic belongs in a Supabase database trigger or
    // Edge Function to ensure atomicity.
    if (judges && scores && scores.length >= judges.length) {
      await supabase
        .from("runs")
        .update({
          status: "completed",
          active: false,
        })
        .eq("id", currentRun.id);

      fetchRunWinner(currentRun.run_number);
    }
  };

  /* ---------------- LOADING ---------------- */

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Checking authentication...
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Judge Panel</h1>

          <div className="text-zinc-400">{profile?.name} (Judge)</div>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="bg-pink-600 px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {/* CURRENT RUN */}

      <div className="bg-zinc-900 p-8 rounded-xl mb-8 text-center">
        <div className="text-zinc-400 mb-2">NOW SKATING</div>

        {currentRun ? (
          <>
            <div className="text-3xl font-bold text-pink-500">
              {currentRun?.rider?.name || "Unknown Rider"}
            </div>

            <div className="text-xl mt-2">Run {currentRun?.run_number}</div>
          </>
        ) : (
          <div className="text-yellow-400">Waiting for Admin to start run</div>
        )}
      </div>

      {/* SCORING */}

      {/* REVIEW: The heats, leaders, nextRuns, and runWinner state variables are fetched
          but never rendered in the UI. Either display them (e.g. a heat selector, a
          leaderboard sidebar, upcoming runs queue) or remove the dead state and data fetching. */}

      <div className="bg-zinc-900 p-8 rounded-xl mb-10">
        <h2 className="text-2xl mb-6 text-center">Submit Score</h2>

        <div className="mb-6">
          <label>Difficulty: {difficulty}</label>
          <input
            type="range"
            min="8"
            max="14"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-6">
          <label>Style: {style}</label>
          <input
            type="range"
            min="8"
            max="14"
            value={style}
            onChange={(e) => setStyle(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-8">
          <label>Consistency: {consistency}</label>
          <input
            type="range"
            min="8"
            max="14"
            value={consistency}
            onChange={(e) => setConsistency(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={submitScore}
          disabled={!currentRun || !currentRun.active || scoreSubmitted}
          className="w-full bg-green-500 hover:bg-green-600 p-4 rounded font-bold disabled:bg-gray-600"
        >
          Submit Score
        </button>
      </div>
    </div>
  );
}
