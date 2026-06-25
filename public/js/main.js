    // ── Theme toggle ──
    function applyTheme(t) {
      const icon = document.querySelector('.theme-toggle i');
      document.documentElement.classList.toggle('light', t === 'light');
      if (icon) icon.className = t === 'light' ? 'fas fa-sun' : 'fas fa-moon';
      localStorage.setItem('theme', t);
    }
    function toggleTheme() {
      applyTheme(document.documentElement.classList.contains('light') ? 'dark' : 'light');
    }
    applyTheme(localStorage.getItem('theme') || 'dark');

    // ── Stars: 3 depth layers (now in fixed #space-bg) ──
    // Near = big + bright  →  far = tiny + dim
    // As you scroll DOWN the sky recedes: all layers scale toward 0 from center
    const starConfig = [
      { id: 'stars-far',  count: 200, minSz: 0.3, maxSz: 1.1, recess: 0.28 },
      { id: 'stars-mid',  count: 85,  minSz: 0.9, maxSz: 1.9, recess: 0.54 },
      { id: 'stars-near', count: 32,  minSz: 1.8, maxSz: 3.4, recess: 0.82 }
    ];

    const starLayers = starConfig.map(cfg => {
      const el = document.getElementById(cfg.id);
      for (let i = 0; i < cfg.count; i++) {
        const s   = document.createElement('div');
        const sz  = (Math.random() * (cfg.maxSz - cfg.minSz) + cfg.minSz).toFixed(2);
        const twD = (Math.random() * 4 + 2).toFixed(2);
        const drD = (Math.random() * 20 + 8).toFixed(2);
        const dx  = ((Math.random() - 0.5) * 30).toFixed(1);
        const dy  = ((Math.random() - 0.5) * 20).toFixed(1);
        s.style.cssText = [
          'position:absolute',
          `left:${(Math.random()*100).toFixed(2)}%`,
          `top:${(Math.random()*100).toFixed(2)}%`,
          `width:${sz}px`, `height:${sz}px`,
          'background:white', 'border-radius:50%',
          `opacity:${(Math.random()*0.55+0.25).toFixed(2)}`,
          `--dx:${dx}px`, `--dy:${dy}px`,
          `animation:twinkle ${twD}s ease-in-out ${(Math.random()*5).toFixed(2)}s infinite,` +
          ` drift ${drD}s ease-in-out ${(Math.random()*-20).toFixed(2)}s infinite alternate`
        ].join(';');
        el.appendChild(s);
      }
      return { el, recess: cfg.recess };
    });

    // ── Shooting stars (appear in hero viewport) ──
    function shootStar(fast) {
      const hero = document.getElementById('hero');
      const s = document.createElement('div');
      s.className = 'shooting-star ' + (fast ? 'fast' : 'normal');
      s.style.top    = (Math.random() * 48 + 4) + '%';
      s.style.left   = (Math.random() * 65 + 5) + '%';
      s.style.zIndex = 6;
      hero.appendChild(s);
      setTimeout(() => s.remove(), fast ? 650 : 950);
    }
    setInterval(shootStar, 4200);

    // ── Master scroll handler (RAF-throttled) ──
    let rafPending = false;

    function doParallax() {
      const y         = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress  = y / maxScroll; // 0 = top  →  1 = bottom

      // Stars recede into the distance: near stars zoom out fastest
      // Near top  → full size, full brightness  (you're surrounded by stars)
      // Near bottom → tiny pinpoints, barely visible  (you're deep in space)
      starLayers.forEach(layer => {
        const scale   = Math.max(0.06, 1 - progress * layer.recess);
        const opacity = Math.max(0.02, 1 - progress * (layer.recess * 0.88));
        layer.el.style.transform = `scale(${scale.toFixed(4)})`;
        layer.el.style.opacity   = opacity.toFixed(4);
      });

      // Sky-end vignette: appears smoothly in the last 30% of the page
      const skyEnd = document.getElementById('sky-end');
      if (skyEnd) skyEnd.style.opacity = Math.max(0, (progress - 0.70) / 0.30).toFixed(3);

      // Mountains parallax (hero only)
      if (y < window.innerHeight * 1.8) {
        const m1 = document.getElementById('mtn1');
        const m2 = document.getElementById('mtn2');
        const m3 = document.getElementById('mtn3');
        if (m1) m1.style.transform = `translateY(${(y * 0.04).toFixed(1)}px)`;
        if (m2) m2.style.transform = `translateY(${(y * 0.12).toFixed(1)}px)`;
        if (m3) m3.style.transform = `translateY(${(y * 0.22).toFixed(1)}px)`;
        const hc = document.querySelector('.hero-content');
        if (hc) hc.style.transform = `translateY(${(y * 0.1).toFixed(1)}px)`;
      }

      rafPending = false;
    }

    // ── Scroll listener: recession + velocity shooting stars ──
    let lastScrollY = 0, shootCooldown = false;
    window.addEventListener('scroll', () => {
      const speed = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
      if (!rafPending) { rafPending = true; requestAnimationFrame(doParallax); }
      if (speed > 10 && !shootCooldown && Math.random() < 0.45) {
        shootStar(true);
        shootCooldown = true;
        setTimeout(() => shootCooldown = false, 480);
      }
    }, { passive: true });

    // ── Counter animation for stat numbers ──
    function animateCount(el) {
      const raw = el.textContent.trim();
      const isFloat = raw.includes('.');
      const hasPlus = raw.includes('+');
      const target  = parseFloat(raw);
      if (isNaN(target)) return;
      const dur = 1700, t0 = performance.now();
      function step(now) {
        const p    = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        el.textContent = isFloat
          ? (ease * target).toFixed(1)
          : Math.floor(ease * target) + (hasPlus && p >= 1 ? '+' : '');
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      }
      requestAnimationFrame(step);
    }

    const counterObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { animateCount(e.target); counterObs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.stat-num').forEach(el => counterObs.observe(el));

    // ── Stat card animations ──
    (function initStatCards() {
      // Build bar segments (20 blocks)
      const barSegs = document.querySelector('.bar-segs');
      if (barSegs) {
        for (let i = 0; i < 20; i++) {
          const s = document.createElement('div'); s.className = 'seg'; barSegs.appendChild(s);
        }
      }
      // Build dot grid (10 dots)
      const dotsRow = document.querySelector('.dots-row');
      if (dotsRow) {
        for (let i = 0; i < 10; i++) {
          const d = document.createElement('div'); d.className = 'dot'; dotsRow.appendChild(d);
        }
      }

      const statCardObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const card = e.target;
          statCardObs.unobserve(card);

          if (card.classList.contains('stat-ring')) {
            setTimeout(() => card.classList.add('animated'), 120);
          }

          if (card.classList.contains('stat-bar-card')) {
            setTimeout(() => card.classList.add('animated'), 120);
            card.querySelectorAll('.seg').forEach((seg, i) => {
              if (i < 18) setTimeout(() => seg.classList.add('lit'), 200 + i * 55);
            });
          }

          if (card.classList.contains('stat-dots-card')) {
            card.querySelectorAll('.dot').forEach((dot, i) => {
              setTimeout(() => {
                if (i < 7)      dot.classList.add('lit');
                else if (i === 7) dot.classList.add('half');
              }, 150 + i * 110);
            });
          }
        });
      }, { threshold: 0.45 });

      document.querySelectorAll('.stat').forEach(c => statCardObs.observe(c));
    })();

    // ── Top nav scroll effect ──
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // ── Bottom nav: active section tracking ──
    const bnItems = document.querySelectorAll('.bn-item');
    const sections = document.querySelectorAll('section[id]');

    function setActiveBn(id) {
      bnItems.forEach(a => {
        const isActive = a.dataset.section === id;
        a.classList.toggle('active', isActive);
      });
    }

    window.addEventListener('scroll', () => {
      let cur = 'hero';
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 140) cur = s.id;
      });
      setActiveBn(cur);
    }, { passive: true });

    // ── Bottom nav: ripple on click ──
    function createBnRipple(wrap) {
      if (!wrap) return;
      const r = document.createElement('span');
      Object.assign(r.style, {
        position: 'absolute', inset: '0', borderRadius: '50%',
        background: 'rgba(232,168,124,0.3)', transform: 'scale(0)',
        animation: 'bnRipple 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        pointerEvents: 'none', zIndex: '0',
      });
      wrap.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    }

    (function injectBnKeyframes() {
      const s = document.createElement('style');
      s.textContent = '@keyframes bnRipple{0%{transform:scale(0);opacity:1}100%{transform:scale(2.8);opacity:0}}';
      document.head.appendChild(s);
    })();

    bnItems.forEach(item => {
      item.addEventListener('click', () => {
        createBnRipple(item.querySelector('.bn-icon-wrap'));
        if (navigator.vibrate) navigator.vibrate(10);
      });
    });

    // ── Bottom nav: touch swipe ──
    (function initSwipe() {
      let startX = 0;
      const THRESHOLD = 65;
      const sectionIds = ['hero', 'about', 'skills', 'projects', 'experience', 'blog', 'certificates', 'education', 'contact'];
      document.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      document.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) < THRESHOLD) return;
        const cur = [...bnItems].find(i => i.classList.contains('active'))?.dataset.section || 'hero';
        const idx = sectionIds.indexOf(cur);
        const next = dx < 0 ? sectionIds[Math.min(idx + 1, sectionIds.length - 1)] : sectionIds[Math.max(idx - 1, 0)];
        const target = document.getElementById(next);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, { passive: true });
    })();

    // ── Skill bar fill animation ──
    const sbObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        e.target.querySelectorAll('.skill-bar-fill').forEach((bar, i) => {
          setTimeout(() => bar.classList.add('sb-lit'), i * 80);
        });
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.skill-bars-grid').forEach(el => sbObs.observe(el));

    // ── Heading color on scroll ──
    const titleObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const title = e.target.querySelector('h2.sec-title');
        if (title) title.classList.add('title-lit');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll('section[id]').forEach(s => titleObs.observe(s));

    // ── Scroll reveal ──
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 70);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

    // ── Blog ──
    const API = '/api/posts';

    function formatDate(iso) {
      return new Date(iso).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
    }

    function renderCard(p) {
      const tagsHtml = (p.tags || []).map(t => `<span class="blog-tag">${t}</span>`).join('');
      return `
        <div class="blog-card" onclick="openPost('${p.id}')">
          <div class="blog-tags">${tagsHtml}</div>
          <h3>${p.title}</h3>
          <p>${p.excerpt}</p>
          <div class="blog-meta">
            <span class="blog-date">${formatDate(p.createdAt)}</span>
            <span class="read-more">Read more <i class="fas fa-arrow-right"></i></span>
          </div>
        </div>`;
    }

    async function loadPosts() {
      const grid = document.getElementById('blog-grid');
      try {
        const res = await fetch(API);
        if (!res.ok) throw new Error();
        const posts = await res.json();
        if (!posts.length) {
          grid.innerHTML = `<div class="blog-empty"><div class="icon">✍️</div><p>No posts yet — check back soon!<br/>Or run <code>npm start</code> and add your first post via <a href="/admin.html" style="color:var(--teal)">admin panel</a>.</p></div>`;
          return;
        }
        grid.innerHTML = posts.map(renderCard).join('');
        grid.querySelectorAll('.blog-card').forEach((el, i) => {
          setTimeout(() => { el.style.opacity = 0; el.style.transform = 'translateY(16px)'; el.style.transition = 'all 0.4s'; requestAnimationFrame(() => { el.style.opacity = 1; el.style.transform = 'translateY(0)'; }); }, i * 80);
        });
      } catch {
        grid.innerHTML = `<div class="blog-empty"><div class="icon">🚀</div><p>Start the server to load blog posts:<br/><code>npm install &amp;&amp; npm start</code><br/><br/>Then manage posts at <a href="/admin.html" style="color:var(--teal)">/admin.html</a></p></div>`;
      }
    }

    loadPosts();

    // ── Post modal ──
    async function openPost(id) {
      try {
        const res = await fetch(`${API}/${id}`);
        const post = await res.json();
        document.getElementById('modalTitle').textContent = post.title;
        document.getElementById('modalDate').textContent = formatDate(post.createdAt);
        document.getElementById('modalTags').innerHTML = (post.tags || []).map(t => `<span class="blog-tag">${t}</span>`).join('');
        document.getElementById('modalBody').innerHTML = marked.parse ? marked.parse(post.content) : marked(post.content);
        document.getElementById('postModal').classList.add('open');
        document.body.style.overflow = 'hidden';
      } catch (e) {
        console.error(e);
      }
    }

    function closeModal() {
      document.getElementById('postModal').classList.remove('open');
      document.body.style.overflow = '';
    }

    function handleModalClick(e) {
      if (e.target === document.getElementById('postModal')) closeModal();
    }

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ── Contact form ──────────────────────────────────────────────
    document.getElementById('contactForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn    = document.getElementById('cfBtn');
      const btnTxt = document.getElementById('cfBtnText');
      const status = document.getElementById('cfStatus');
      const form   = e.target;

      btn.disabled = true;
      btnTxt.textContent = 'Sending…';
      status.className = 'cf-status';

      const payload = {
        name:    form.querySelector('[name="name"]').value.trim(),
        email:   form.querySelector('[name="email"]').value.trim(),
        subject: form.querySelector('[name="subject"]').value.trim(),
        message: form.querySelector('[name="message"]').value.trim()
      };

      try {
        const res  = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Something went wrong.');
        status.className = 'cf-status success';
        status.textContent = json.message || "Message sent! I'll get back to you soon.";
        form.reset();
      } catch (err) {
        status.className = 'cf-status error';
        status.textContent = err.message || 'Failed to send. Please email me directly.';
      } finally {
        btn.disabled = false;
        btnTxt.textContent = 'Send Message';
      }
    });
