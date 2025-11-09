<template>
  <section class="landing">
    <header class="hero">
      <div class="hero-copy">
        <span class="hero-badge">Quản lý blog của riêng bạn dễ dàng</span>
        <h1>Xây dựng blog chuyên nghiệp chỉ trong vài phút</h1>
        <p>
          Bloggo giúp bạn tạo, xuất bản và theo dõi hiệu suất của nhiều blog ngay trên một bảng điều khiển.
          Quy trình tối giản, không cần kiến thức kỹ thuật.
        </p>
        <div class="cta-group">
          <RouterLink class="ui-btn primary" to="/signup">Bắt đầu miễn phí</RouterLink>
          <RouterLink class="ui-btn ghost" to="/login">Đăng nhập</RouterLink>
        </div>
      </div>
      <div class="hero-visual">
        <img class="hero-logo" src="/logo.png" alt="Bloggo" />
      </div>
    </header>

    <section class="feature-grid">
      <article class="feature-card">
        <span class="feature-icon" aria-hidden="true">
          <Icon name="lightning" size="26" />
        </span>
        <h3>Thiết lập nhanh</h3>
        <p>Tạo workspace, thêm thương hiệu và xuất bản bài viết đầu tiên chỉ với vài bước.</p>
      </article>
      <article class="feature-card">
        <span class="feature-icon" aria-hidden="true">
          <Icon name="chart" size="26" />
        </span>
        <h3>Phân tích rõ ràng</h3>
        <p>Theo dõi lượt xem, nguồn truy cập và hiệu suất bài viết để tối ưu chiến lược.</p>
      </article>
      <article class="feature-card">
        <span class="feature-icon" aria-hidden="true">
          <Icon name="team" size="26" />
        </span>
        <h3>Cộng tác mượt mà</h3>
        <p>Phân quyền, duyệt bài và làm việc cùng đội nội dung ngay trên nền tảng.</p>
      </article>
    </section>

    <section class="highlight">
      <div class="highlight-card">
        <h2>Tập trung vào nội dung, Bloggo lo phần còn lại</h2>
        <p>
          Tự động hóa các bước triển khai kỹ thuật, tích hợp Firebase, lưu trữ hình ảnh và bảo mật sẵn sàng.
          Bạn chỉ cần viết và xuất bản.
        </p>
      </div>
    </section>

    <section class="cta-final">
      <div class="cta-content">
        <h2>Thử Bloggo ngay hôm nay</h2>
        <p>Đăng ký tài khoản để trải nghiệm quy trình quản lý blog đơn giản, hiệu quả.</p>
        <RouterLink class="ui-btn primary" to="/signup">Đăng ký miễn phí</RouterLink>
        <p class="cta-login">Đã có tài khoản? <RouterLink to="/login">Đăng nhập</RouterLink></p>
      </div>
    </section>

    <footer class="landing-footer">
      <span>&copy; {{ currentYear }} Bloggo Platform</span>
    </footer>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '../components/Icon.vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.landing {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), #ffffff 72%),
    radial-gradient(900px 640px at 20% -10%, rgba(167, 139, 250, 0.26), transparent 68%),
    radial-gradient(900px 640px at 80% -12%, rgba(59, 130, 246, 0.22), transparent 68%);
  color: var(--text, #0f172a);
  overflow: hidden;
}

.landing::before,
.landing::after {
  content: '';
  position: absolute;
  width: 560px;
  height: 560px;
  border-radius: 50%;
  filter: blur(160px);
  z-index: 0;
  opacity: 0.75;
}

.landing::before {
  background: rgba(167, 139, 250, 0.6);
  top: -220px;
  left: -220px;
}

.landing::after {
  background: rgba(59, 130, 246, 0.42);
  bottom: -260px;
  right: -210px;
}

.hero {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 48px;
  max-width: 1040px;
  margin: 0 auto;
  padding: 96px 32px 72px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-badge {
  display: inline-flex;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--brand-700, #8b5cf6);
  font-weight: 600;
  font-size: 0.85rem;
  width: fit-content;
  letter-spacing: 0.02em;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 3.3rem);
  letter-spacing: -0.03em;
}

.hero p {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: rgba(15, 23, 42, 0.75);
}

.cta-group {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.cta-group .ui-btn.primary,
.cta-group .ui-btn.ghost,
.cta-group .link {
  text-decoration: none;
}

.hero-visual {
  display: flex;
  justify-content: center;
  position: relative;
}

.hero-logo {
  width: min(240px, 80%);
  height: auto;
  border-radius: 32px;
  box-shadow: 0 36px 90px -45px rgba(15, 23, 42, 0.6), 0 0 0 1.5px rgba(255, 255, 255, 0.45);
  background: radial-gradient(circle at 28% 28%, rgba(167, 139, 250, 0.3), transparent 72%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.85), rgba(236, 233, 255, 0.92));
  padding: 32px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  padding: 32px 24px 48px;
  max-width: 960px;
  margin: 0 auto;
}

.feature-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 24px 55px -30px rgba(15, 23, 42, 0.42);
  border: 1px solid rgba(148, 163, 184, 0.22);
  background-image: linear-gradient(150deg, rgba(99, 102, 241, 0.12), rgba(255, 255, 255, 0));
  display: grid;
  gap: 12px;
  justify-items: start;
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(99, 102, 241, 0.16);
  color: var(--brand-700, #8b5cf6);
  font-size: 1.6rem;
  box-shadow: 0 12px 35px -20px rgba(99, 102, 241, 0.45);
}

.feature-icon .icon {
  width: 26px;
  height: 26px;
}

.feature-card h3 {
  margin: 0;
  font-size: 1.2rem;
}

.feature-card p {
  margin: 0;
  color: rgba(15, 23, 42, 0.7);
  line-height: 1.6;
}

.highlight {
  padding: 48px 24px 56px;
  position: relative;
}

.highlight-card {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
  padding: 44px 36px;
  border-radius: 24px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.18), rgba(167, 139, 250, 0.22)),
    rgba(255, 255, 255, 0.78);
  box-shadow: 0 45px 90px -50px rgba(15, 23, 42, 0.48);
  display: grid;
  gap: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.45);
}

.highlight-card h2 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.4rem);
}

.highlight-card p {
  margin: 0;
  color: rgba(15, 23, 42, 0.7);
  line-height: 1.7;
}

.cta-final {
  padding: 56px 24px 72px;
  position: relative;
}

.cta-content {
  max-width: 540px;
  margin: 0 auto;
  text-align: center;
  display: grid;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.cta-content h2 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.5rem);
}

.cta-content p {
  margin: 0;
  color: rgba(15, 23, 42, 0.65);
}

.cta-login {
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.6);
}

.cta-login a {
  color: var(--brand-700, #8b5cf6);
  font-weight: 600;
  text-decoration: none;
}

.cta-login a:hover {
  text-decoration: none;
}

.cta-final::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(520px 380px at 50% 10%, rgba(167, 139, 250, 0.24), transparent 75%);
  z-index: 0;
}

.landing-footer {
  margin-top: auto;
  padding: 28px 24px 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  color: rgba(15, 23, 42, 0.55);
}

@media (max-width: 992px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-copy {
    align-items: center;
  }

  .cta-group {
    justify-content: center;
  }

  .hero h1 {
    font-size: clamp(2.2rem, 8vw, 3rem);
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 80px 20px 60px;
  }

  .cta-group {
    gap: 10px;
  }

  .feature-grid {
    padding: 28px 20px 40px;
  }

  .highlight-card {
    padding: 36px 24px;
  }

  .landing-footer {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}
</style>
