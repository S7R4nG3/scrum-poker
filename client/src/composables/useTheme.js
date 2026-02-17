import { ref, watch, onMounted } from 'vue'

const isDarkMode = ref(false)

export function useTheme() {
  const initializeTheme = () => {
    // Check localStorage first
    const storedTheme = localStorage.getItem('scrumPokerTheme')

    if (storedTheme) {
      isDarkMode.value = storedTheme === 'dark'
    } else {
      // Fall back to system preference
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    applyTheme()
  }

  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value
  }

  const applyTheme = () => {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  // Watch for theme changes and persist
  watch(isDarkMode, (newValue) => {
    localStorage.setItem('scrumPokerTheme', newValue ? 'dark' : 'light')
    applyTheme()
  })

  return {
    isDarkMode,
    initializeTheme,
    toggleTheme
  }
}
