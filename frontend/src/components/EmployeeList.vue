<template>
	<v-card>
		<v-card-title>Employees</v-card-title>
		<v-card-text>
			<v-data-table
				:headers="headers"
				:items="employees"
				:loading="loading"
				class="elevation-1"
				item-value="ID"
			>
				<template v-slot:loading>
					<v-skeleton-loader type="table-row@5"></v-skeleton-loader>
				</template>
			</v-data-table>
		</v-card-text>
		<v-alert v-if="error" type="error" dense>
			{{ error }}
		</v-alert>
	</v-card>
</template>

<script setup>
import { inject, onMounted, ref } from "vue"

const loading = ref(true)
const employees = ref([])
const error = ref(null)
const BX24 = inject("BX24") // Inject the BX24 object

const headers = [
	{ title: "ID", align: "start", key: "ID" },
	{ title: "Name", key: "NAME" },
	{ title: "Last Name", key: "LAST_NAME" },
	{ title: "Email", key: "EMAIL" },
]

const fetchEmployees = async () => {
	if (!BX24) {
		error.value = "BX24 object is not available."
		loading.value = false
		return
	}

	loading.value = true
	error.value = null
	try {
		// Use the official JS library to call the method
		BX24.callMethod("user.get", {}, result => {
			if (result.error()) {
				error.value = `Error: ${result.error().ex.error_description}`
				console.error(result.error())
			} else {
				employees.value = result.data()
			}
			loading.value = false
		})
	} catch (err) {
		error.value = "An unexpected error occurred while calling the API."
		console.error(err)
		loading.value = false
	}
}

onMounted(() => {
	fetchEmployees()
})
</script>
