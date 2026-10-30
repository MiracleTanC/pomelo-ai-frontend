import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/kb' },
      { path: 'kb', name: 'kb-list', component: () => import('../views/KbList.vue') },
      { path: 'kb/:id', name: 'kb-detail', component: () => import('../views/KbDetail.vue') },
      { path: 'doc/:id', name: 'doc-detail', component: () => import('../views/DocDetail.vue') },
      { path: 'chat', name: 'chat', component: () => import('../views/Chat.vue') },
      { path: 'search-test/:kbId', name: 'search-test', component: () => import('../views/SearchTest.vue') },
      { path: 'viz', name: 'vector-viz', component: () => import('../views/VectorViz.vue') },
      { path: 'viz/:kbId', name: 'vector-viz-kb', component: () => import('../views/VectorViz.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!auth.token && to.name !== 'login') {
    return { name: 'login' }
  }
})

export default router
