import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pomelo_token') || '')
  const username = ref(localStorage.getItem('pomelo_user') || '')

  const isLoggedIn = computed(() => !!token.value)

  function setAuth(t, u) {
    token.value = t
    username.value = u
    localStorage.setItem('pomelo_token', t)
    localStorage.setItem('pomelo_user', u)
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('pomelo_token')
    localStorage.removeItem('pomelo_user')
  }

  return { token, username, isLoggedIn, setAuth, logout }
})
