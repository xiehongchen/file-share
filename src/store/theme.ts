import { defineStore } from 'pinia'

export const useTheme = defineStore('theme', {
  state: () => ({
    theme: 'light',
  }),
  actions: {
    changeTheme() {
      this.theme = 'dark'
    },
  },
})
