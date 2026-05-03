import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/OrderList.vue'),
  },
  {
    path: '/waybills',
    name: 'Waybills',
    component: () => import('@/views/WaybillList.vue'),
  },
  {
    path: '/tracking',
    name: 'Tracking',
    component: () => import('@/views/TrackingView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
