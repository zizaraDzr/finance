<template>
  <p class="app-version">v{{ version }}</p>
</template>

<script setup lang="ts">
import packageJson from '../../package.json'

const version = packageJson.version
</script>
