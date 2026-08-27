/* ==========================================================================
   Meks · Portfolio — 交互
   章节滚动高亮（scroll-spy） / 点击复制（QQ 号、Discord 用户名）
   ========================================================================== */
(function () {
  'use strict';

  /* ================= 章节滚动高亮 =================
     右栏滚动时，左栏导航高亮当前章节 */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.snav'));
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute('data-sec')); })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-sec') === id);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setActive(en.target.id);
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    sections.forEach(function (s) { io.observe(s); });
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
})();
