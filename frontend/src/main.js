import { createApp } from "vue"
import App from "./App.vue"
import { initBX24 } from "./utils/bx24"

// Vuetify
import { createVuetify } from "vuetify"
import * as components from "vuetify/components"
import * as directives from "vuetify/directives"
import "vuetify/styles"

const vuetify = createVuetify({
	components,
	directives,
})

// Initialize the Bitrix24 API and then mount the app
initBX24()
	.then(bx24 => {
		const app = createApp(App)
		app.provide("BX24", bx24) // Provide the BX24 object to all components
		app.use(vuetify).mount("#app")
	})
	.catch(console.error)
