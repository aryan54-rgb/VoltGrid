import * as React from 'react'

const ThemeContext = React.createContext({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = React.useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  const setTheme = React.useCallback((next) => {
    setThemeState(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('voltgrid-theme', next)
    } catch {
      /* private mode */
    }
  }, [])

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return React.useContext(ThemeContext)
}
