'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, USER_ID } from './supabase'

interface CreditsContextValue {
  credits: number | null
  setCredits: React.Dispatch<React.SetStateAction<number | null>>
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: null,
  setCredits: () => {},
})

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('user_state')
      .select('credits')
      .eq('user_id', USER_ID)
      .single()
      .then(({ data }) => { if (data) setCredits(data.credits) })
  }, [])

  return (
    <CreditsContext.Provider value={{ credits, setCredits }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  return useContext(CreditsContext)
}
