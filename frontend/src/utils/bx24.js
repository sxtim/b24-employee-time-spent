/**
 * Creates a mock BX24 object for local development outside the Bitrix24 iframe.
 * This allows for UI development without needing a live connection to the portal.
 * @returns {object} A mock BX24 object with a fake API.
 */
const createMockBx24 = () => {
	console.warn(
		"BX24 SDK not found or failed to init. Running in DEV mode with a mock BX24 object."
	)

	const mockUsers = [
		{ ID: "1", NAME: "John", LAST_NAME: "Doe", EMAIL: "john.doe@example.com" },
		{
			ID: "2",
			NAME: "Jane",
			LAST_NAME: "Smith",
			EMAIL: "jane.smith@example.com",
		},
		{
			ID: "3",
			NAME: "Peter",
			LAST_NAME: "Jones",
			EMAIL: "peter.jones@example.com",
		},
	]

	const mockTasks = Array.from({ length: 173 }, (_, i) => {
		const responsibleId = String((i % 3) + 1)
		const created = new Date(2024, 4, 1 + (i % 30))
		const closed = new Date(created)
		closed.setDate(created.getDate() + (i % 5) + 1)

		return {
			id: `${101 + i}`,
			title: `Задача ${101 + i}: ${
				i % 2 === 0 ? "Разработка" : "Тестирование"
			} модуля ${String.fromCharCode(65 + (i % 10))}`,
			responsibleId: responsibleId,
			timeEstimate: String(3600 * ((i % 4) + 1)), // 1 to 4 hours
			timeSpentInLogs: String(3600 * ((i % 4) + 0.5)), // 0.5 to 3.5 hours
			createdDate: created.toISOString(),
			closedDate: closed.toISOString(),
			status: String((i % 4) + 2), // Mock status
		}
	})

	return {
		callMethod: (method, params, callback) => {
			console.log(`[MOCK BX24] Method: ${method}, Params:`, params)
			let result = null
			let error = null
			let total = 0

			if (method === "user.get") {
				result = mockUsers
			} else if (method === "tasks.task.list") {
				console.log("[MOCK] tasks.task.list with params:", params)

				let filteredTasks = mockTasks

				// Mock filtering by responsible ID
				if (params.filter && params.filter.RESPONSIBLE_ID) {
					const responsibleIds = Array.isArray(params.filter.RESPONSIBLE_ID)
						? params.filter.RESPONSIBLE_ID
						: [params.filter.RESPONSIBLE_ID]
					filteredTasks = filteredTasks.filter(task =>
						responsibleIds.includes(task.responsibleId)
					)
				}

				// Mock filtering by status
				if (params.filter && params.filter.STATUS) {
					const statuses = Array.isArray(params.filter.STATUS)
						? params.filter.STATUS
						: [params.filter.STATUS]
					filteredTasks = filteredTasks.filter(task =>
						statuses.includes(task.status)
					)
				}

				// Mock filtering by date range
				if (params.filter && params.filter[">=CLOSED_DATE"]) {
					const startDate = new Date(params.filter[">=CLOSED_DATE"])
					filteredTasks = filteredTasks.filter(
						task => new Date(task.closedDate) >= startDate
					)
				}
				if (params.filter && params.filter["<=CLOSED_DATE"]) {
					const endDate = new Date(params.filter["<=CLOSED_DATE"])
					filteredTasks = filteredTasks.filter(
						task => new Date(task.closedDate) <= endDate
					)
				}

				total = filteredTasks.length
				const start = params.start || 0
				const limit = params.limit || 50
				const paginatedTasks = filteredTasks.slice(start, start + limit)

				console.log(
					`[MOCK] Slicing tasks. Start: ${start}, Limit: ${limit}. Returning ${paginatedTasks.length} of ${total} tasks.`
				)

				result = { tasks: paginatedTasks }
			} else {
				error = () => ({
					error: "METHOD_NOT_FOUND",
					error_description: `The method ${method} is not mocked for local development.`,
				})
			}

			// Simulate async API call
			setTimeout(() => {
				if (callback) {
					callback({
						data: () => (result ? result.tasks || result : []),
						error: () => error,
						total: () => total,
					})
				}
			}, 500)
		},
		getAuth: () => {
			console.log("[MOCK BX24] getAuth() called")
			return {
				domain: "mock.bitrix24.ru",
				access_token: "mock_access_token",
				member_id: "mock_member_id",
			}
		},
		init: callback => {
			console.log("[MOCK BX24] init() called")
			if (callback) callback()
		},
	}
}

/**
 * Dynamically loads the Bitrix24 JS library and returns a Promise
 * that resolves with the initialized BX24 object.
 *
 * This approach ensures that the library is loaded and ready before
 * any API calls are made. It memoizes the promise to prevent reloading
 * the script on subsequent calls.
 */

// A Promise that resolves with the BX24 object once the script is loaded.
const loadBx24Script = () => {
	return new Promise((resolve, reject) => {
		// If running outside a browser (e.g., during SSR), do nothing.
		if (typeof window === "undefined") {
			return resolve(null)
		}

		// If the real BX24 object is already available, use it.
		if (window.BX24) {
			window.BX24.init(() => resolve(window.BX24))
			return
		}

		const script = document.createElement("script")
		script.src = "//api.bitrix24.com/api/v1/"
		script.async = true

		script.onload = () => {
			// The script is loaded, now we wait for BX24 to be ready.
			if (window.BX24) {
				window.BX24.init(() => resolve(window.BX24))
			} else {
				// Script loaded, but BX24 object not there.
				// This happens when running outside the Bitrix24 iframe.
				if (import.meta.env.DEV) {
					resolve(createMockBx24())
				} else {
					reject(new Error("BX24 object not found after script load."))
				}
			}
		}

		script.onerror = () => {
			// The script failed to load (e.g., network error, ad blocker).
			if (import.meta.env.DEV) {
				resolve(createMockBx24())
			} else {
				reject(new Error("Failed to load the Bitrix24 API script."))
			}
		}

		document.head.appendChild(script)
	})
}

// Memoize the promise to ensure the script is loaded only once.
let bx24Promise = null

export const initBX24 = () => {
	if (!bx24Promise) {
		bx24Promise = loadBx24Script()
	}
	return bx24Promise
}
