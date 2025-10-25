import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../services/firebase';

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue')
    },
    {
        path: '/signup',
        name: 'Signup',
        component: () => import('../views/Signup.vue')
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresAuth: true } // Đánh dấu route này cần đăng nhập
    },
    { // Route mặc định
        path: '/:pathMatch(.*)*',
        redirect: '/dashboard'
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

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