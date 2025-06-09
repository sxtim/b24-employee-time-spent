<template>
	<v-app>
		<v-main>
			<v-container>
				<h1 class="mb-4">Bitrix24 Employee List</h1>
				<EmployeeList />
			</v-container>
		</v-main>
	</v-app>
</template>

<script setup>
import EmployeeList from "./components/EmployeeList.vue"
</script>

<style>
/* Global styles if needed */
</style>
