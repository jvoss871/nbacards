'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useUserId } from '@/lib/use-user-id'

interface CreditsContextValue {
  credits: number | null
  setCredits: React.Dispatch<React.SetStateAction<number | null>>
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: null,
  setCredits: () => {},
})

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useUserId()
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_state')
      .select('credits')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => { if (data) setCredits(data.credits) })
  }, [userId])

  return (
    <CreditsContext.Provider value={{ credits, setCredits }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  return useContext(CreditsContext)
}
