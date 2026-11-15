import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { QUESTIONS } from '../domain/questions'
import { RULES } from '../domain/rules'
import type { Question, Rule, Staff } from '../domain/types'
import { questionsApi, rulesApi, staffApi } from './api'
import { useAuth } from './AuthContext'

interface Config {
  questions: Question[]
  rules: Rule[]
  staff: Staff[]
  reload: () => Promise<void>
}

const ConfigContext = createContext<Config | null>(null)

/** Preguntas, reglas y funcionarios con los cambios del administrador aplicados. */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [state, setState] = useState({ questions: QUESTIONS, rules: RULES, staff: [] as Staff[] })

  const reload = useCallback(async () => {
    const [questions, rules, staff] = await Promise.all([
      questionsApi.list(),
      rulesApi.list(),
      isAdmin ? staffApi.list() : staffApi.directory(),
    ])
    setState({ questions, rules, staff })
  }, [isAdmin])

  useEffect(() => {
    void reload()
  }, [reload])

  return <ConfigContext.Provider value={{ ...state, reload }}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig debe usarse dentro de ConfigProvider')
  return ctx
}
