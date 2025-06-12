<template>
	<v-card>
		<v-card-title class="pb-4 d-flex align-center">
			Отчет по затраченному времени сотрудника
			<v-icon class="ml-2" size="small" @click="faqDialog = true">
				mdi-information-outline
			</v-icon>
		</v-card-title>
		<v-card-text>
			<!-- Filters -->
			<v-row align="center">
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
				<v-col cols="12" sm="12" md="4" style="max-width: 360px">
					<v-menu
						v-model="dateMenu"
						:close-on-content-click="false"
						transition="scale-transition"
						min-width="auto"
						max-width="360px"
						@update:model-value="onDateMenuToggle"
					>
						<template v-slot:activator="{ props }">
							<v-text-field
								v-bind="props"
								:model-value="formattedDateRange"
								label="Период завершения задачи"
								prepend-icon="mdi-calendar"
								readonly
								clearable
								@click:clear="dateRange = []"
								style="width: 360px; max-width: 360px"
								class="date-picker-field"
							></v-text-field>
						</template>
						<v-card
							style="width: 100%; max-width: 360px; box-sizing: border-box"
						>
							<v-card-text>
								<v-date-picker
									v-model="tempDateRange"
									multiple="range"
									color="primary"
									show-adjacent-months
									:first-day-of-week="1"
									hide-header
									locale="ru"
									:day-format="date => new Date(date).getDate()"
									style="width: 100%; max-width: 360px; box-sizing: border-box"
								></v-date-picker>
							</v-card-text>
							<v-card-actions>
								<v-spacer></v-spacer>
								<v-btn variant="text" @click="dateMenu = false"> Отмена </v-btn>
								<v-btn color="primary" variant="text" @click="applyDateRange">
									Применить
								</v-btn>
							</v-card-actions>
						</v-card>
					</v-menu>
				</v-col>
				<v-col cols="12" sm="12" md="auto" class="d-flex justify-end">
					<v-btn-toggle v-model="reportMode" mandatory density="compact">
						<v-btn value="byTask">По задачам</v-btn>
						<v-btn value="byEmployee">По сотрудникам</v-btn>
					</v-btn-toggle>
				</v-col>
			</v-row>

			<!-- Data Table -->
			<v-data-table-server
				v-model:items-per-page="itemsPerPage"
				:headers="currentHeaders"
				:items="reportData"
				:items-length="totalFromApi"
				:loading="loading"
				:search="searchTrigger"
				@update:options="loadReportItems"
				class="elevation-1"
				item-value="id"
				:items-per-page-options="itemsPerPageOptions"
				:style="tableStyle"
			>
				<template v-slot:loading>
					<v-skeleton-loader type="table-row@5"></v-skeleton-loader>
				</template>
			</v-data-table-server>

			<!-- Summary Information for Tasks -->
			<v-card-text v-if="reportMode === 'byTask'" class="pa-2 mt-4">
				<v-row justify="end" class="font-weight-bold">
					<v-col cols="auto">Общий итог:</v-col>
					<v-col cols="2">Запланировано: {{ totalPlanned }} ч</v-col>
					<v-col cols="2">Затрачено: {{ totalActual }} ч</v-col>
					<v-col cols="2">Всего задач: {{ totalTasks }}</v-col>
				</v-row>
			</v-card-text>
		</v-card-text>

		<v-alert v-if="error" type="error" dense>
			{{ error }}
		</v-alert>

		<v-dialog v-model="faqDialog" max-width="600px">
			<v-card>
				<v-card-title>
					<span class="text-h5">Справка по работе с отчетом</span>
				</v-card-title>
				<v-card-text>
					<p>
						Это приложение предназначено для формирования отчетов по
						затраченному времени на основе данных из вашего Битрикс24.
					</p>
					<br />
					<p><strong>Режимы отчета:</strong></p>
					<ul>
						<li>
							<strong>По задачам:</strong> Детальный отчет, где каждая строка -
							это отдельная задача. Отображаются плановые и фактические
							трудозатраты по каждой задаче.
						</li>
						<li>
							<strong>По сотрудникам:</strong> Сводный отчет, группирующий все
							задачи по исполнителям. Показывает общее количество задач,
							суммарное плановое и фактическое время для каждого сотрудника.
						</li>
					</ul>
					<br />
					<p><strong>Фильтры:</strong></p>
					<ul>
						<li>
							<strong>Сотрудник:</strong> Выберите одного или нескольких
							сотрудников для фильтрации отчета.
						</li>
						<li>
							<strong>Статус задачи:</strong> Фильтрация по текущему статусу
							задач (Новая, Выполняется, Завершена и т.д.).
						</li>
						<li>
							<strong>Период завершения задачи:</strong> Укажите диапазон дат, в
							который задачи были завершены.
						</li>
					</ul>
					<br />
					<p>
						Отчет обновляется автоматически при изменении любого из фильтров.
					</p>
				</v-card-text>
				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="primary" text @click="faqDialog = false">Закрыть</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-card>
</template>

<script setup>
import { computed, inject, onMounted, ref, watch } from "vue"

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
const loading = ref(true)
const error = ref(null)
const BX24 = inject("BX24")

// --- Table and Data State ---
const itemsPerPage = ref(10)
const itemsPerPageOptions = [
	{ value: 10, title: "10" },
	{ value: 25, title: "25" },
	{ value: 50, title: "50" },
]
const totalFromApi = ref(0)
const searchTrigger = ref(0)
const cache = ref({})
const faqDialog = ref(false)

// Filters and Mode
const reportMode = ref("byTask") // 'byTask' or 'byEmployee'
const selectedEmployees = ref([])
const selectedStatuses = ref([])
const dateRange = ref([])
const tempDateRange = ref([])
const dateMenu = ref(false)

const onDateMenuToggle = isOpen => {
	if (isOpen) {
		// Clone the array to avoid reactivity issues
		tempDateRange.value = [...dateRange.value]
	}
}

const applyDateRange = () => {
	dateRange.value = [...tempDateRange.value]
	dateMenu.value = false
}

// Форматирование диапазона дат для отображения
const formattedDateRange = computed(() => {
	if (!dateRange.value || dateRange.value.length === 0) {
		return ""
	}

	// Функция для форматирования даты в формат ДД.ММ.ГГГГ
	const formatDate = dateString => {
		const date = new Date(dateString)
		return date.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		})
	}

	if (dateRange.value.length === 1) {
		return formatDate(dateRange.value[0])
	}
	return `${formatDate(dateRange.value[0])} — ${formatDate(
		dateRange.value[dateRange.value.length - 1]
	)}`
})

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

const totalTasks = computed(() => totalFromApi.value)

const headersByTask = [
	{ title: "Задача", key: "task", sortable: false },
	{ title: "Сотрудник", key: "employee", sortable: false },
	{ title: "План (ч)", key: "planned", sortable: false },
	{ title: "Факт (ч)", key: "actual", sortable: false },
	{ title: "Дней на выполнение", key: "days", sortable: false },
]

const headersByEmployee = [
	{ title: "Сотрудник", key: "employee", sortable: false },
	{ title: "Задачи", key: "taskCount", sortable: false },
	{ title: "План (ч)", key: "planned", sortable: false },
	{ title: "Факт (ч)", key: "actual", sortable: false },
]

const currentHeaders = computed(() => {
	return reportMode.value === "byTask" ? headersByTask : headersByEmployee
})

const tableStyle = computed(() => {
	// Approximate heights for Vuetify components to calculate min-height
	const headerHeight = 56 // v-table header
	const rowHeight = 52 // v-table row with default density
	const footerHeight = 59 // v-data-table-footer
	const minHeight = headerHeight + itemsPerPage.value * rowHeight + footerHeight
	return { minHeight: `${minHeight}px` }
})

// --- Methods ---

// Promisify BX24.callMethod to use with async/await
const callB24Method = (method, params) => {
	return new Promise((resolve, reject) => {
		if (!BX24) {
			return reject("BX24 object is not available.")
		}
		BX24.callMethod(method, params, res => {
			const b24Error = res.error ? res.error() : null
			if (b24Error) {
				console.error("B24 Error:", b24Error)
				reject(new Error(b24Error.error_description || "Bitrix24 API error"))
			} else {
				resolve(res)
			}
		})
	})
}

const generateNewReport = () => {
	cache.value = {} // Clear cache on new report
	searchTrigger.value += 1
}

const loadReportItems = async ({ page, itemsPerPage, sortBy }) => {
	loading.value = true
	error.value = null

	const startOffset = (page - 1) * itemsPerPage
	const b24PageStart = Math.floor(startOffset / 50) * 50

	try {
		// Fetch from Bitrix24 API only if the page is not in cache
		if (!cache.value[b24PageStart]) {
			const filter = {}
			if (selectedEmployees.value.length > 0) {
				filter.RESPONSIBLE_ID = selectedEmployees.value
			}
			if (selectedStatuses.value.length > 0) {
				filter.STATUS = selectedStatuses.value
			}
			if (dateRange.value && dateRange.value.length > 0) {
				if (dateRange.value.length >= 1) {
					filter[">=CLOSED_DATE"] = dateRange.value[0]
				}
				if (dateRange.value.length >= 2) {
					filter["<=CLOSED_DATE"] = dateRange.value[dateRange.value.length - 1]
				}
			}

			const res = await callB24Method("tasks.task.list", {
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
				start: b24PageStart,
			})

			cache.value[b24PageStart] = res.data().tasks || []
			if (page === 1) {
				totalFromApi.value = res.total() || 0
			}
		}

		const cachedPage = cache.value[b24PageStart] || []
		const sliceStart = startOffset % 50
		const sliceEnd = sliceStart + itemsPerPage
		rawTasks.value = cachedPage.slice(sliceStart, sliceEnd)
	} catch (e) {
		console.error("Failed to load report items:", e)
		error.value = e.message || "Ошибка при загрузке отчета."
		rawTasks.value = []
		// Do not reset totalFromApi here to avoid pagination collapse on error
	} finally {
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

watch(
	[selectedEmployees, selectedStatuses, dateRange, reportMode],
	() => {
		generateNewReport()
	},
	{ deep: true }
)

onMounted(() => {
	fetchInitialData()
})
</script>

<style>
/* Global styles if needed */
.v-row {
	justify-content: space-between;
}
.v-card .v-card-text {
	padding: 16px; /* Re-add default padding, can be overridden by utility classes */
}

/* Стили для иконки календаря */
.date-picker-field .v-input__prepend .mdi-calendar {
	color: var(--v-theme-primary);
	font-size: 20px;
}

.v-input__prepend {
	margin-right: 0 !important;
}
</style>
