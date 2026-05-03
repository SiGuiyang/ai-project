<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1 class="logo">冷链物流PaaS平台</h1>
        <el-menu
          :default-active="activeRoute"
          mode="horizontal"
          :router="true"
          class="nav-menu"
        >
          <el-menu-item index="/">仪表盘</el-menu-item>
          <el-menu-item index="/orders">订单管理</el-menu-item>
          <el-menu-item index="/waybills">转运单管理</el-menu-item>
          <el-menu-item index="/tracking">物流轨迹</el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeRoute = computed(() => route.path)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f7fa;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: #fff;
  padding: 0;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 20px;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  margin-right: 40px;
  white-space: nowrap;
}

.nav-menu {
  flex: 1;
  border-bottom: none !important;
}

.app-main {
  padding: 20px;
  background-color: #f5f7fa;
}
</style>
