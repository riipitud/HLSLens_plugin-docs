/* HLSLens before/after image slider.

   Before/after slider (two images):
     <figure class="compare">
       <img data-label="Off" src="a.webp" alt="...">
       <img data-label="On"  src="b.webp" alt="...">
       <figcaption>...</figcaption>
     </figure>

   Without JavaScript the two images are shown side by side. */
(function () {
  /* ---------- before/after slider ---------- */

  function initCompare(fig) {
    var imgs = fig.querySelectorAll(':scope > img');
    if (imgs.length !== 2) return;
    var a = imgs[0], b = imgs[1];

    var stage = document.createElement('div');
    stage.className = 'compare-stage';
    fig.insertBefore(stage, imgs[0]);
    stage.appendChild(a);
    stage.appendChild(b);
    b.classList.add('compare-top');

    function tag(img, cls) {
      var t = document.createElement('span');
      t.className = 'compare-label ' + cls;
      t.textContent = img.dataset.label || (cls === 'l' ? 'Before' : 'After');
      t.setAttribute('aria-hidden', 'true');
      stage.appendChild(t);
      return t;
    }
    var labelL = tag(a, 'l');
    var labelR = tag(b, 'r');

    var handle = document.createElement('div');
    handle.className = 'compare-handle';
    handle.setAttribute('aria-hidden', 'true');
    handle.innerHTML = '<span class="compare-grip"></span>';
    stage.appendChild(handle);

    var hint = document.createElement('span');
    hint.className = 'compare-hint';
    hint.textContent = 'Drag to compare';
    hint.setAttribute('aria-hidden', 'true');
    stage.appendChild(hint);

    /* Keyboard and screen reader control */
    var range = document.createElement('input');
    range.type = 'range';
    range.min = 0; range.max = 100; range.step = 1; range.value = 50;
    range.className = 'compare-range';
    range.setAttribute('aria-label', 'Comparison slider: ' + (a.dataset.label || 'before') +
      ' on the left, ' + (b.dataset.label || 'after') + ' on the right');
    stage.appendChild(range);

    var pos = 50;
    function set(p) {
      pos = Math.max(0, Math.min(100, p));
      fig.style.setProperty('--pos', pos + '%');
      range.value = Math.round(pos);
      range.setAttribute('aria-valuetext', Math.round(pos) + '% ' + (a.dataset.label || 'before') + ' visible');

      /* Fade a label once the divider reaches it, on either side */
      var x = pos / 100 * stage.clientWidth, gap = 10;
      labelL.classList.toggle('is-covered', x < labelL.offsetLeft + labelL.offsetWidth + gap);
      labelR.classList.toggle('is-covered', x > labelR.offsetLeft - gap);
    }
    function fromEvent(e) {
      var r = stage.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    }
    function used() { fig.classList.add('is-used'); }

    var dragging = false;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      fig.classList.add('is-dragging');
      used();
      fromEvent(e);
    });
    stage.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    function end() { dragging = false; fig.classList.remove('is-dragging'); }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('lostpointercapture', end);

    range.addEventListener('input', function () { used(); set(+range.value); });
    stage.addEventListener('dblclick', function () { set(50); });
    window.addEventListener('resize', function () { set(pos); });

    set(50);
    fig.classList.add('is-ready');
  }

  function run() {
    document.querySelectorAll('figure.compare').forEach(initCompare);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
