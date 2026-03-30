"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type Heat={
  id:string
  name:string
  category:string
  status:string
}

export default function AdminPage(){

  const router=useRouter()

  const [checkingAuth,setCheckingAuth]=useState(true)
  const [profile,setProfile]=useState<any>(null)

  const [heats,setHeats]=useState<Heat[]>([])
  const [riders,setRiders]=useState<any[]>([])
  const [judges,setJudges]=useState<any[]>([])
  const [heatRiders,setHeatRiders]=useState<any>({})

  const [currentRun,setCurrentRun]=useState<any>(null)
  const [runWinners,setRunWinners]=useState<any[]>([])

  const [runsPerRider,setRunsPerRider]=useState(2)

  const [timeLeft,setTimeLeft]=useState(60)
  const [timerRunning,setTimerRunning]=useState(false)
  const [customTime,setCustomTime]=useState(60)

  /* ---------------- AUTH ---------------- */

  useEffect(()=>{

    const checkAccess=async()=>{

      const {data}=await supabase.auth.getUser()

      if(!data.user){
        router.replace("/login")
        return
      }

      const {data:userRole}=await supabase
        .from("users")
        .select("*")
        .eq("id",data.user.id)
        .single()

      if(!userRole || userRole.role!=="admin"){
        router.replace("/judge")
        return
      }

      setProfile(userRole)

      await fetchHeats()
      await fetchRiders()
      await fetchJudges()
      await fetchCurrentRun()
      await fetchRunWinners()

      setCheckingAuth(false)

    }

    checkAccess()

  },[])

  /* ---------------- FIX: refetch winners after heats load ---------------- */

  useEffect(()=>{
    if(heats.length>0){
      fetchRunWinners()
    }
  },[heats])

  /* ---------------- TIMER ---------------- */

  useEffect(()=>{

    if(!timerRunning) return

    const interval=setInterval(()=>{

      setTimeLeft(prev=>{
        if(prev<=1){
          clearInterval(interval)
          setTimerRunning(false)
          return 0
        }
        return prev-1
      })

    },1000)

    return()=>clearInterval(interval)

  },[timerRunning])

  const startTimer=()=>{setTimeLeft(customTime);setTimerRunning(true)}
  const pauseTimer=()=>setTimerRunning(false)
  const continueTimer=()=>timeLeft>0 && setTimerRunning(true)
  const resetTimer=()=>{setTimerRunning(false);setTimeLeft(customTime)}
  const setTimer=()=>{setTimerRunning(false);setTimeLeft(customTime)}

  /* ---------------- DATA ---------------- */

  const fetchCurrentRun=async()=>{

    const {data}=await supabase
      .from("runs")
      .select(`
        id,
        run_number,
        rider:rider_id(name)
      `)
      .eq("active",true)
      .maybeSingle()

    setCurrentRun(data||null)

  }

  const fetchRunWinners=async()=>{

    const {data,error}=await supabase
      .from("leaderboard_by_run")
      .select("*")
      .order("run_number")
  
    if(error){
      console.error(error)
      setRunWinners([])
      return
    }
  
    const mapped=(data||[]).map((run:any)=>{
  
      const heat=heats.find(h=>h.id===run.heat_id)
  
      return{
        ...run,
        heat_name:heat?.name || run.heat_name
      }
  
    })
  
    setRunWinners(mapped)
  
  }

  const fetchHeats=async()=>{

    const {data}=await supabase
      .from("heats")
      .select("*")
      .order("name")

    if(data) setHeats(data)

  }

  const fetchRiders=async()=>{
    const {data}=await supabase.from("riders").select("*").order("name")
    if(data) setRiders(data)
  }

  const fetchJudges=async()=>{
    const {data}=await supabase.from("users").select("name").eq("role","judge")
    if(data) setJudges(data)
  }

  /* ---------------- HEAT CONTROLS ---------------- */

  const createHeat=async()=>{
    const name=prompt("Heat name")
    if(!name) return
    await supabase.from("heats").insert({name,status:"upcoming"})
    fetchHeats()
  }

  const deleteHeat=async(id:string)=>{
    if(!confirm("Delete heat?")) return
    await supabase.from("heats").delete().eq("id",id)
    fetchHeats()
  }

  const setLiveHeat=async(id:string)=>{
    await supabase.from("heats").update({status:"live"}).eq("id",id)
    fetchHeats()
  }

  const endHeat=async(id:string)=>{
    await supabase.from("heats").update({status:"finished"}).eq("id",id)
    fetchHeats()
  }

  /* ---------------- RIDER ASSIGNMENT ---------------- */

  const toggleRider=(heatId:string,riderId:string)=>{

    const selected=heatRiders[heatId]||[]

    if(selected.includes(riderId)){
      setHeatRiders({
        ...heatRiders,
        [heatId]:selected.filter((id:string)=>id!==riderId)
      })
    }else{
      setHeatRiders({
        ...heatRiders,
        [heatId]:[...selected,riderId]
      })
    }

  }

  /* ---------------- RUN CONTROL ---------------- */

  const generateRuns=async(heatId:string)=>{

    const selected=heatRiders[heatId]
  
    if(!selected || selected.length===0){
      alert("Please select riders for this heat before generating runs.")
      return
    }
  
    let order=1
  
    for(let round=1;round<=runsPerRider;round++){
  
      for(const riderId of selected){
  
        await supabase.from("runs").insert({
          rider_id:riderId,
          heat_id:heatId,
          run_number:round,
          run_order:order,
          status:"pending",
          active:false
        })
  
        order++
  
      }
  
    }
  
    alert("Runs generated")
  
  }

  const nextRun=async()=>{

    const {data:liveHeat}=await supabase
      .from("heats")
      .select("*")
      .eq("status","live")
      .single()

    if(!liveHeat){
      alert("No live heat")
      return
    }

    const {data:next}=await supabase
      .from("runs")
      .select("*")
      .eq("heat_id",liveHeat.id)
      .eq("status","pending")
      .order("run_order")
      .limit(1)
      .maybeSingle()

    if(!next){
      alert("Heat finished")
      await supabase.from("heats").update({status:"finished"}).eq("id",liveHeat.id)
      fetchHeats()
      return
    }

    await supabase.from("runs").update({active:false}).eq("active",true)
    await supabase.from("runs").update({active:true}).eq("id",next.id)

    fetchCurrentRun()
    startTimer()

  }

  const skipRider=async()=>{
    await supabase.from("runs").update({active:false}).eq("active",true)
    nextRun()
  }

  const resetCompetition=async()=>{

    if(!confirm("DELETE ALL DATA?")) return

    await supabase.from("scores").delete().neq("id","")
    await supabase.from("runs").delete().neq("id","")
    await supabase.from("heats").delete().neq("id","")

    fetchHeats()
    fetchCurrentRun()
    fetchRunWinners()

  }

  /* ---------------- ENSURE ONLY ONE WINNER PER RUN ---------------- */

  const bestRunMap:any={}

  runWinners.forEach((run:any)=>{

    const key=`${run.heat_name}_${run.run_number}`

    if(!bestRunMap[key]){
      bestRunMap[key]=run
    }else{
      if((run.best_score||0)>(bestRunMap[key].best_score||0)){
        bestRunMap[key]=run
      }
    }

  })

  const filteredRunWinners=Object.values(bestRunMap)

  /* ---------------- GROUP WINNERS BY HEAT ---------------- */

const winnersByHeat:any={}

filteredRunWinners.forEach((run:any)=>{

  const heat=run.heat_name || run.heat || "Unknown Heat"

  if(!winnersByHeat[heat]){
    winnersByHeat[heat]=[]
  }

  winnersByHeat[heat].push(run)

})

  /* ---------------- UI ---------------- */

  if(checkingAuth){
    return(
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading Admin Panel...
      </div>
    )
  }

  return(

    <div className="min-h-screen bg-black text-white p-10">

      {/* HEADER */}

      <div className="flex justify-between mb-10">

        <div>
          <h1 className="text-4xl font-bold">SK8DALEN BOWL WARRIORS ADMIN PANEL</h1>
          <div className="text-zinc-400">
            {profile?.name} ({profile?.role})
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={()=>supabase.auth.signOut().then(()=>router.replace("/login"))}
            className="bg-pink-600 px-4 py-2 rounded"
          >
            Logout
          </button>

          <button
            onClick={resetCompetition}
            className="bg-red-600 px-4 py-2 rounded"
          >
            Reset Competition
          </button>
        </div>

      </div>

      {/* RUNS PER RIDER */}

      <div className="mb-8 hidden">
        <div className="mb-2">Runs per Rider</div>
        <select
          value={runsPerRider}
          onChange={(e)=>setRunsPerRider(Number(e.target.value))}
          className="bg-zinc-900 p-2 rounded"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>

      {/* TIMER */}

      <div className="text-center mb-10">

        <div className="text-zinc-400">RUN TIMER</div>
        <div className="text-6xl font-bold text-yellow-400">{timeLeft}</div>

        <div className="flex gap-3 justify-center mt-4">
          <button onClick={startTimer} className="bg-green-600 px-6 py-2 rounded">Start</button>
          <button onClick={pauseTimer} className="bg-yellow-600 px-6 py-2 rounded">Pause</button>
          <button onClick={continueTimer} className="bg-blue-600 px-6 py-2 rounded">Continue</button>
          <button onClick={resetTimer} className="bg-red-600 px-6 py-2 rounded">Reset</button>
        </div>

        <div className="flex gap-3 justify-center mt-4">
          <input
            type="number"
            value={customTime}
            onChange={(e)=>setCustomTime(Number(e.target.value))}
            className="bg-zinc-900 p-2 rounded w-24 text-center"
          />
          <button onClick={setTimer} className="bg-purple-600 px-4 py-2 rounded">Set</button>
        </div>

      </div>

      {/* CURRENT RIDER */}

      <div className="bg-zinc-900 p-8 rounded-xl mb-10 text-center">

        <div className="text-zinc-400 mb-2">CURRENT RIDER</div>

        {currentRun ? (
          <>
            <div className="text-3xl font-bold text-pink-500">
              {currentRun?.rider?.name || "Unknown Rider"}
            </div>

            <div className="text-xl mt-2">
              Run {currentRun.run_number}
            </div>
          </>
        ):(
          <div className="text-zinc-500">
            Waiting for rider
          </div>
        )}

      </div>

      {/* CONTROLS */}

      <div className="flex gap-4 mb-10">
        <button onClick={nextRun} className="bg-blue-600 px-6 py-3 rounded-lg">
          Next Rider
        </button>

        <button onClick={skipRider} className="bg-yellow-600 px-6 py-3 rounded-lg">
          Skip Rider
        </button>
      </div>

      {/* HEATS + RIDER ASSIGNMENT */}

      <h2 className="text-3xl mb-4">Heats</h2>

      <div className="flex items-center gap-4 mb-4">

        <button
          onClick={createHeat}
          className="bg-green-600 px-4 py-2 rounded"
        >
          Create Heat
        </button>

        <div className="flex items-center gap-2">

          <span className="text-zinc-400">Runs per Rider</span>

          <select
            value={runsPerRider}
            onChange={(e)=>setRunsPerRider(Number(e.target.value))}
            className="bg-zinc-900 p-2 rounded"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>

        </div>

      </div>

      {heats.map((heat)=>{

        const selected=heatRiders[heat.id] || []

        return(

          <div key={heat.id} className="bg-zinc-900 p-6 rounded mb-6">

            <div className="flex justify-between mb-4">

              <div>
                <div className="font-bold">{heat.name}</div>
                <div className="text-zinc-400">Status: {heat.status}</div>
              </div>

              <div className="flex gap-2">

                <button onClick={()=>generateRuns(heat.id)} className="bg-purple-600 px-3 py-1 rounded">
                  Generate Runs
                </button>

                <button onClick={()=>setLiveHeat(heat.id)} className="bg-blue-600 px-3 py-1 rounded">
                  Set Live
                </button>

                <button onClick={()=>endHeat(heat.id)} className="bg-orange-600 px-3 py-1 rounded">
                  End
                </button>

                <button onClick={()=>deleteHeat(heat.id)} className="bg-red-600 px-3 py-1 rounded">
                  Delete
                </button>

              </div>

            </div>

            {/* ASSIGN RIDERS */}

            <div className="grid grid-cols-2 gap-2">

              {riders.map((rider)=>{

                const active=selected.includes(rider.id)

                return(

                  <div
                    key={rider.id}
                    onClick={()=>toggleRider(heat.id,rider.id)}
                    className={`p-2 rounded cursor-pointer ${
                      active ? "bg-green-600" : "bg-zinc-800"
                    }`}
                  >
                    {rider.name}
                  </div>

                )

              })}

            </div>

          </div>

        )

      })}

      {/* RUN WINNERS */}

<h2 className="text-3xl mb-4">Run Winners</h2>

<div className="space-y-6 mb-10">

  {Object.keys(winnersByHeat).map((heatName)=>(
    
    <div key={heatName}>

      <div className="text-xl font-bold mb-2 text-yellow-400">
        {heatName}
      </div>

      <div className="space-y-2">

        {winnersByHeat[heatName].map((run:any,index:number)=>(
          
          <div key={index} className="bg-zinc-900 p-3 rounded flex justify-between">

            <span>
              Winner Run {run.run_number} — {run.rider_name || "Unknown Rider"}
            </span>

            <span className="text-pink-500 font-bold">
              {run.best_score?.toFixed(2)}
            </span>

          </div>

        ))}

      </div>

    </div>

  ))}

</div>

      {/* RIDERS */}

      <h2 className="text-3xl mb-4">Riders</h2>

      <div className="space-y-2 mb-10">

        {riders.map((rider)=>(
          <div key={rider.id} className="bg-zinc-900 p-3 rounded">
            {rider?.name || "Unknown Rider"}
          </div>
        ))}

      </div>

      {/* JUDGES */}

      <h2 className="text-3xl mb-4">Judges</h2>

      <div className="space-y-2">

        {judges.map((judge,index)=>(
          <div key={index} className="bg-zinc-900 p-3 rounded">
            {judge?.name}
          </div>
        ))}

      </div>

    </div>

  )

}