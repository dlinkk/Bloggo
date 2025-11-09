import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../services/firebase';

const routes = [
    { path: '/', name: 'Landing', component: () => import('../views/Landing.vue') },
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
    { path: '/signup', name: 'Signup', component: () => import('../views/Signup.vue') },
    {
        path: '/dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresAuth: true },
        children: [
            { path: '', name: 'DashboardPosts', component: () => import('../views/DashboardPosts.vue') },
            { path: 'analytics', name: 'DashboardAnalytics', component: () => import('../views/Analytics.vue') },
            { path: 'comments', name: 'DashboardComments', component: () => import('../views/Comments.vue') },
        ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHistory(), routes });

// "Navigation Guard" - Chạy trước mỗi lần chuyển trang
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const currentUser = auth.currentUser;

    if (requiresAuth && !currentUser) {
        // Nếu trang yêu cầu đăng nhập và user chưa đăng nhập -> đá về /login
        next('/login');
    } else if ((to.path === '/login' || to.path === '/signup') && currentUser) {
        // Nếu user đã đăng nhập nhưng lại vào trang login/signup -> đá về dashboard
        next('/dashboard');
    } else {
        // Các trường hợp khác -> cho phép đi tiếp
        next();
    }
});

export default router;