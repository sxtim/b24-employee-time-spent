<template>
	<v-card>
		<v-card-title class="pb-4"
			>Отчет по затраченному времени сотрудника</v-card-title
		>
		<v-card-text>
			<!-- Filters -->
			<v-row>
				<v-col cols="12" sm="6" md="3">
					<v-autocomplete
						label="Сотрудник"
						:items="allUsers"
						v-model="selectedEmployees"
						item-title="name"
						item-value="ID"
						multiple
						clearable
						chips
						closable-chips
					>
						<template v-slot:item="{ props, item }">
							<v-list-item v-bind="props" :title="item.raw.name">
								<template v-slot:prepend>
									<v-checkbox-btn
										:model-value="selectedEmployees.includes(item.raw.ID)"
									></v-checkbox-btn>
								</template>
							</v-list-item>
						</template>
					</v-autocomplete>
				</v-col>
				<v-col cols="12" sm="6" md="3">
					<v-select
						label="Статус задачи"
						:items="taskStatuses"
						v-model="selectedStatuses"
						item-title="title"
						item-value="value"
						multiple
						clearable
						chips
						closable-chips
					></v-select>
				</v-col>
				<v-col cols="12" sm="6" md="2">
					<v-text-field
						label="Завершение с"
						v-model="dateRange.start"
						type="date"
						clearable
					></v-text-field>
				</v-col>
				<v-col cols="12" sm="6" md="2">
					<v-text-field
						label="Завершение по"
						v-model="dateRange.end"
						type="date"
						clearable
					></v-text-field>
				</v-col>
				<v-col cols="12" md="2" class="d-flex align-center">
					<v-btn color="primary" @click="fetchReportData" block
						>Сформировать</v-btn
					>
				</v-col>
			</v-row>

			<!-- Mode Toggle -->
			<v-row class="mt-0 mb-4 justify-end">
				<v-col cols="auto">
					<v-btn-toggle v-model="reportMode" mandatory density="compact">
						<v-btn value="byTask">По задачам</v-btn>
						<v-btn value="byEmployee">По сотрудникам</v-btn>
					</v-btn-toggle>
				</v-col>
			</v-row>

			<!-- Data Table -->
			<v-data-table
				:headers="currentHeaders"
				:items="reportData"
				:loading="loading"
				class="elevation-1"
				item-value="id"
			>
				<template v-slot:loading>
					<v-skeleton-loader type="table-row@5"></v-skeleton-loader>
				</template>

				<template v-slot:bottom>
					<v-footer class="pa-2 mt-4">
						<v-row justify="end" class="font-weight-bold">
							<v-col cols="auto">Общий итог:</v-col>
							<v-col cols="2">Запланировано: {{ totalPlanned }} ч</v-col>
							<v-col cols="2">Затрачено: {{ totalActual }} ч</v-col>
							<v-col cols="2">Всего задач: {{ totalTasks }}</v-col>
						</v-row>
					</v-footer>
				</template>
			</v-data-table>
		</v-card-text>

		<v-alert v-if="error" type="error" dense>
			{{ error }}
		</v-alert>
	</v-card>
</template>

<script setup>
import { computed, inject, onMounted, ref } from "vue"

// --- Helper Functions ---
const formatHours = seconds => {
	if (!seconds) return 0
	return Math.round(seconds / 3600)
}

const getDaysBetween = (startDate, endDate) => {
	if (!startDate || !endDate) return "N/A"
	const start = new Date(startDate)
	const end = new Date(endDate)
	const diffTime = Math.abs(end - start)
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
	return diffDays
}

// --- State ---
const loading = ref(false)
const error = ref(null)
const BX24 = inject("BX24")

// Filters and Mode
const reportMode = ref("byTask") // 'byTask' or 'byEmployee'
const selectedEmployees = ref([])
const selectedStatuses = ref([])
const dateRange = ref({ start: null, end: null })

// Data
const rawTasks = ref([]) // Raw data from Bitrix24
const allUsers = ref([]) // For employee filter
const taskStatuses = ref([
	{ title: "Новая", value: "2" },
	{ title: "Выполняется", value: "3" },
	{ title: "Ждет выполнения", value: "4" },
	{ title: "Завершена", value: "5" },
	{ title: "Отложена", value: "6" },
])

// --- Computed Properties for Table ---

const userMap = computed(() => {
	return allUsers.value.reduce((acc, user) => {
		acc[user.ID] = user.name
		return acc
	}, {})
})

const reportData = computed(() => {
	if (reportMode.value === "byTask") {
		return rawTasks.value.map(task => ({
			id: `task-${task.id}`, // Unique key for v-data-table
			task: task.title,
			employee: userMap.value[task.responsibleId] || "Не назначен",
			planned: formatHours(task.timeEstimate),
			actual: formatHours(task.timeSpentInLogs),
			days: getDaysBetween(task.createdDate, task.closedDate),
		}))
	} else {
		// Group by employee
		const byEmployee = rawTasks.value.reduce((acc, task) => {
			const employeeId = task.responsibleId
			if (!acc[employeeId]) {
				acc[employeeId] = {
					id: `emp-${employeeId}`, // Unique key for v-data-table
					employee: userMap.value[employeeId] || "Не назначен",
					taskCount: 0,
					planned: 0,
					actual: 0,
				}
			}
			acc[employeeId].taskCount++
			acc[employeeId].planned += task.timeEstimate
				? parseInt(task.timeEstimate)
				: 0
			acc[employeeId].actual += task.timeSpentInLogs
				? parseInt(task.timeSpentInLogs)
				: 0
			return acc
		}, {})
		return Object.values(byEmployee).map(emp => ({
			...emp,
			planned: formatHours(emp.planned),
			actual: formatHours(emp.actual),
		}))
	}
})

const totalPlanned = computed(() => {
	const totalSeconds = rawTasks.value.reduce(
		(sum, task) => sum + (task.timeEstimate ? parseInt(task.timeEstimate) : 0),
		0
	)
	return formatHours(totalSeconds)
})

const totalActual = computed(() => {
	const totalSeconds = rawTasks.value.reduce(
		(sum, task) =>
			sum + (task.timeSpentInLogs ? parseInt(task.timeSpentInLogs) : 0),
		0
	)
	return formatHours(totalSeconds)
})

const totalTasks = computed(() => rawTasks.value.length)

const headersByTask = [
	{ title: "Задача", key: "task" },
	{ title: "Сотрудник", key: "employee" },
	{ title: "План (ч)", key: "planned" },
	{ title: "Факт (ч)", key: "actual" },
	{ title: "Дней на выполнение", key: "days" },
]

const headersByEmployee = [
	{ title: "Сотрудник", key: "employee" },
	{ title: "Задачи", key: "taskCount" },
	{ title: "План (ч)", key: "planned" },
	{ title: "Факт (ч)", key: "actual" },
]

const currentHeaders = computed(() => {
	return reportMode.value === "byTask" ? headersByTask : headersByEmployee
})

// --- Methods ---
const fetchReportData = async () => {
	if (!BX24) {
		error.value = "BX24 object is not available."
		return
	}
	loading.value = true
	error.value = null
	rawTasks.value = []

	const filter = {}
	if (selectedEmployees.value.length > 0) {
		filter.RESPONSIBLE_ID = selectedEmployees.value
	}
	if (selectedStatuses.value.length > 0) {
		filter.STATUS = selectedStatuses.value
	}
	if (dateRange.value.start) {
		filter[">=CLOSED_DATE"] = dateRange.value.start
	}
	if (dateRange.value.end) {
		filter["<=CLOSED_DATE"] = dateRange.value.end
	}

	try {
		BX24.callMethod(
			"tasks.task.list",
			{
				select: [
					"ID",
					"TITLE",
					"RESPONSIBLE_ID",
					"CREATED_DATE",
					"CLOSED_DATE",
					"TIME_ESTIMATE",
					"TIME_SPENT_IN_LOGS",
				],
				filter: filter,
			},
			res => {
				const B24error = res.error ? res.error() : null
				if (B24error) {
					console.error("B24 Error:", B24error)
					error.value = `Не удалось загрузить задачи. ${
						B24error.error_description || ""
					}`
				} else {
					// The API returns tasks under a 'tasks' property in the data object
					rawTasks.value = res.data().tasks || []
				}
				loading.value = false
			}
		)
	} catch (e) {
		console.error("Failed to call B24 method:", e)
		error.value = "Ошибка при запросе задач."
		loading.value = false
	}
}

const fetchInitialData = async () => {
	if (!BX24) {
		error.value = "BX24 object is not available."
		return
	}
	try {
		BX24.callMethod("user.get", { ACTIVE: true }, result => {
			if (result.error()) {
				console.error(result.error())
				error.value = "Не удалось загрузить список сотрудников."
			} else {
				allUsers.value = result.data().map(user => ({
					ID: user.ID, // Keep it as string for consistency
					name: `${user.NAME} ${user.LAST_NAME}`.trim(),
				}))
			}
		})
	} catch (err) {
		console.error(err)
		error.value = "Ошибка при запросе списка сотрудников."
	}
}

onMounted(() => {
	fetchInitialData()
})
</script>
