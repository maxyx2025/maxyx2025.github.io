/* ==========================================================================
   Interspace · 交互
   主题切换 / 点击复制 / GameJam 折叠 / 章节导航（无任何动效）
   ========================================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;

  /* ================= 主题（Light / Dark / System 三态） ================= */
  var THEME_KEY = 'yiyu-theme';
  var themeSeq = ['system', 'light', 'dark'];
  var themeNames = { system: 'Theme · Auto', light: 'Theme · Light', dark: 'Theme · Dark' };
  var themeBtn = document.getElementById('themeToggle');

  function currentTheme() { return docEl.getAttribute('data-theme') || 'system'; }

  function setTheme(mode, save) {
    docEl.setAttribute('data-theme', mode);
    if (save !== false) { try { localStorage.setItem(THEME_KEY, mode); } catch (e) {} }
    if (themeBtn) {
      themeBtn.setAttribute('data-mode', mode);
      themeBtn.setAttribute('aria-label', themeNames[mode]);
      themeBtn.title = themeNames[mode];
    }
  }

  if (themeBtn) themeBtn.addEventListener('click', function () {
    setTheme(themeSeq[(themeSeq.indexOf(currentTheme()) + 1) % themeSeq.length]);
  });

  setTheme(currentTheme(), false);

  /* ================= 页头：滚动时浮现毛玻璃背景 ================= */
  var siteNav = document.querySelector('.site-nav');
  if (siteNav) {
    var navOnScroll = function () {
      siteNav.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', navOnScroll, { passive: true });
    navOnScroll();
  }

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

  /* ================= 章节导航（右侧圆点） =================
     点击直达对应章节；滚动时高亮当前章节 */
  var sections = Array.prototype.slice.call(document.querySelectorAll('.sheet'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.rail-dot'));
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () {
      if (sections[i]) sections[i].scrollIntoView();
    });
  });
  if ('IntersectionObserver' in window && sections.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var i = sections.indexOf(en.target);
          dots.forEach(function (d, k) { d.classList.toggle('is-current', k === i); });
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(function (s) { io.observe(s); });
  }
})();
