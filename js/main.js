/* ==========================================================================
   Interspace · 交互
   滚轮整屏翻页 + 分区文本浮入（方案 A：JS 接管滚轮 + transform 位移）
   ========================================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var body = document.body;

  /* ================= 主题（Light / Dark / System 三态） ================= */
  var THEME_KEY = 'yiyu-theme';
  var themeSeq = ['system', 'light', 'dark'];
  var themeNames = { system: 'Theme · Auto', light: 'Theme · Light', dark: 'Theme · Dark' };
  var themeBtn = document.getElementById('themeToggle');

  function currentTheme() { return docEl.getAttribute('data-theme') || 'system'; }

  function setTheme(mode, save) {
    docEl.setAttribute('data-theme', mode);
    if (save !== false) { try { localStorage.setItem(THEME_KEY, mode); } catch (e) {} }
    if (themeBtn) themeBtn.textContent = themeNames[mode];
  }

  if (themeBtn) themeBtn.addEventListener('click', function () {
    setTheme(themeSeq[(themeSeq.indexOf(currentTheme()) + 1) % themeSeq.length]);
  });

  setTheme(currentTheme(), false);

  /* ================= 点击复制（QQ 号 / Discord 用户名） =================
     复制后保持 "Copied!"，直到复制了其他内容才复原 */
  var copyBtns = Array.prototype.slice.call(document.querySelectorAll('[data-copy]'));
  function resetCopyBtns(except) {
    copyBtns.forEach(function (b) { if (b !== except) b.classList.remove('copied'); });
  }
  copyBtns.forEach(function (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy');
      var done = function () {
        resetCopyBtns(copyBtn);
        copyBtn.classList.add('copied');
      };
      var fallback = function () {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });
  /* 页面内发生其他复制（如选中文字 Ctrl+C）时，复原全部按钮 */
  document.addEventListener('copy', function () { resetCopyBtns(null); });
  /* 切到其他标签页 / 窗口 / 离开页面时，复原全部按钮 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) resetCopyBtns(null);
  });
  window.addEventListener('blur', function () { resetCopyBtns(null); });
  window.addEventListener('pagehide', function () { resetCopyBtns(null); });

  /* ================= GameJam 折叠条目 =================
     手风琴式：鼠标悬停即展开，同时只展开一个；触屏退化为点击 */
  var gjItems = Array.prototype.slice.call(document.querySelectorAll('.gj-item'));
  function gjActivate(active) {
    gjItems.forEach(function (item) {
      var open = item === active;
      item.classList.toggle('is-open', open);
      var head = item.querySelector('.gj-head');
      if (head) head.setAttribute('aria-expanded', String(open));
    });
  }
  gjItems.forEach(function (item) {
    item.addEventListener('mouseenter', function () { gjActivate(item); });
    var head = item.querySelector('.gj-head');
    if (head) head.addEventListener('click', function () { gjActivate(item); });
  });

  /* ================= 文章页：回到顶部悬浮按钮 =================
     右下灰色虚化圆钮，滚动超过一屏后出现，点击平滑回到文首 */
  if (document.querySelector('.post')) {
    var topBtn = document.createElement('button');
    topBtn.className = 'to-top';
    topBtn.type = 'button';
    topBtn.setAttribute('aria-label',
      (docEl.getAttribute('lang') || '').indexOf('zh') === 0 ? '回到文章开头' : 'Back to top');
    topBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    body.appendChild(topBtn);
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: docEl.classList.contains('reduced') ? 'auto' : 'smooth' });
    });
    var topTicking = false;
    function topToggle() {
      topBtn.classList.toggle('show', window.scrollY > window.innerHeight * 0.6);
      topTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!topTicking) { topTicking = true; requestAnimationFrame(topToggle); }
    }, { passive: true });
    topToggle();
  }

  /* ================= 环境判定 ================= */
  var mqMobile = window.matchMedia('(max-width: 767px), (pointer: coarse)');
  var reduced = docEl.classList.contains('reduced');

  var deck = document.getElementById('deck');
  var track = document.getElementById('track');
  var sections = track ? Array.prototype.slice.call(track.querySelectorAll('.sheet')) : [];
  var N = sections.length;
  var dots = Array.prototype.slice.call(document.querySelectorAll('.rail-dot'));
  var flipMode = !!deck && !mqMobile.matches && !reduced;

  /* ================= 文本浮入编排 =================
     按 data-order 级联，间隔 70ms；
     data-delay 可叠加额外延迟（如格言引号）。 */
  var GAP = 70;

  function activate(section) {
    if (section.classList.contains('is-active')) return;
    section.classList.add('is-active');
    var items = Array.prototype.slice.call(section.querySelectorAll('[data-reveal]'));
    items.sort(function (a, b) {
      return (parseInt(a.getAttribute('data-order') || '0', 10) -
              parseInt(b.getAttribute('data-order') || '0', 10));
    });
    var timers = [];
    items.forEach(function (el, i) {
      var extra = parseInt(el.getAttribute('data-delay') || '0', 10);
      timers.push(setTimeout(function () { el.classList.add('revealed'); }, i * GAP + extra));
    });
    section._timers = timers;
  }

  function resetReveals(section) {
    section.classList.remove('is-active');
    if (section._timers) { section._timers.forEach(clearTimeout); section._timers = null; }
    var items = section.querySelectorAll('.revealed');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('revealed');
  }

  /* ================= 墨点进度 ================= */
  function setActiveDot(i) {
    dots.forEach(function (d, k) { d.classList.toggle('is-current', k === i); });
  }
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () {
      if (body.classList.contains('mode-deck')) go(i);
      else if (sections[i]) sections[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ================= 整屏翻页 ================= */
  var index = 0, locked = false, nudging = false;
  function vh() { return window.innerHeight; }

  function go(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= N) { nudge(i < 0 ? -1 : 1); return; }
    if (i === index && !opts.instant) return;
    index = i;
    resetCopyBtns(null); /* 翻屏即复原复制按钮 */
    var target = sections[i];
    locked = true; /* 输入锁定 ~450ms，避免连跳多屏 */
    setTimeout(function () { locked = false; }, opts.instant ? 0 : 450);
    sections.forEach(function (s) { if (s !== target) resetReveals(s); });
    if (opts.instant) { /* 锚点直达：无动画定位，再播浮入 */
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0,' + (-i * vh()) + 'px,0)';
      void track.offsetHeight;
      track.style.transition = '';
      activate(target);
    } else {
      track.style.transform = 'translate3d(0,' + (-i * vh()) + 'px,0)';
      setTimeout(function () { activate(target); }, 320); /* 位移完成约 80% 时启动浮入 */
    }
    setActiveDot(i);
    try { history.replaceState(null, '', '#s' + (i + 1)); } catch (e) {}
  }

  /* 已到顶/底：轻微橡皮筋回弹提示 */
  function nudge(dir) {
    if (nudging) return;
    nudging = true;
    var base = -index * vh();
    if (track.animate) {
      track.animate([
        { transform: 'translate3d(0,' + base + 'px,0)' },
        { transform: 'translate3d(0,' + (base - dir * 42) + 'px,0)' },
        { transform: 'translate3d(0,' + base + 'px,0)' }
      ], { duration: 340, easing: 'ease-out' });
    }
    setTimeout(function () { nudging = false; }, 380);
  }

  /* ---- 滚轮：以“一次明显滑动意图”为单位判定 ---- */
  var gestureAcc = 0, lastWheel = 0;
  window.addEventListener('wheel', function (e) {
    if (!flipMode) return;
    e.preventDefault();
    var t = performance.now();
    if (t - lastWheel > 200) gestureAcc = 0; /* 静默 200ms 后视为新意图 */
    lastWheel = t;
    if (locked) return;
    gestureAcc += e.deltaY;
    if (Math.abs(gestureAcc) >= 60) {
      var dir = gestureAcc > 0 ? 1 : -1;
      gestureAcc = 0;
      go(index + dir);
    }
  }, { passive: false });

  /* ---- 键盘：↓ / ↑ / PageDown / PageUp / Home / End ---- */
  window.addEventListener('keydown', function (e) {
    if (!flipMode) return;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': case ' ':
        e.preventDefault(); if (!locked) go(index + 1); break;
      case 'ArrowUp': case 'PageUp':
        e.preventDefault(); if (!locked) go(index - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(N - 1); break;
    }
  });

  /* ---- 触屏：一次明显滑动手势翻一页 ---- */
  var touchY = null;
  window.addEventListener('touchstart', function (e) {
    if (flipMode) touchY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (flipMode) e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', function (e) {
    if (!flipMode || touchY === null) return;
    var dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) > 60 && !locked) go(index + (dy > 0 ? 1 : -1));
  });

  /* ---- 窗口缩放：重算屏高，保持当前屏对齐 ---- */
  window.addEventListener('resize', function () {
    if (!flipMode) return;
    track.style.transition = 'none';
    track.style.transform = 'translate3d(0,' + (-index * vh()) + 'px,0)';
    void track.offsetHeight;
    track.style.transition = '';
  });

  /* ---- 翻页模式下接管 #sN 锚点链接 ---- */
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#s"]'), function (a) {
    a.addEventListener('click', function (e) {
      var m = /^#s([1-7])$/.exec(a.getAttribute('href'));
      if (m && body.classList.contains('mode-deck')) {
        e.preventDefault();
        go(parseInt(m[1], 10) - 1);
      }
    });
  });

  /* ================= 启动 ================= */
  if (deck) {
    if (flipMode) {
      /* 桌面：滚轮劫持 + transform 翻页 */
      body.classList.add('mode-deck');
      var start = 0;
      var m = /^#s([1-7])$/.exec(location.hash);
      if (m) start = Math.min(N - 1, parseInt(m[1], 10) - 1);
      go(start, { instant: true });
    } else {
      /* 移动端 / 减弱动效：自由滚动 + scroll-snap + IntersectionObserver */
      body.classList.add('mode-scroll');
      if (!reduced) {
        docEl.classList.add('snap');
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            var i = sections.indexOf(en.target);
            if (en.isIntersecting) {
              activate(en.target);
              setActiveDot(i);
              try { history.replaceState(null, '', '#s' + (i + 1)); } catch (e) {}
            } else {
              resetReveals(en.target); /* 离开即复位，再次到访重新播放 */
              resetCopyBtns(null); /* 滚出 Contact 屏即复原复制按钮 */
            }
          });
        }, { threshold: 0.4 });
        sections.forEach(function (s) { io.observe(s); });
      }
    }
  } else {
    /* 子页面：普通滚动 + IntersectionObserver 触发浮入（仅播一次） */
    body.classList.add('mode-scroll');
    if (!reduced) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('revealed');
            io2.unobserve(en.target);
          }
        });
      }, { threshold: 0 }); /* 超长文章整体作为一个 data-reveal 元素时，比例阈值可能永远达不到，改为任意部分进入视口即触发 */
      Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), function (el) {
        io2.observe(el);
      });
    }
  }
})();
