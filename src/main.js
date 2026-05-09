import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-sans/800.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'

import App from './App.vue'
import router from './router'
import './assets/theme.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
