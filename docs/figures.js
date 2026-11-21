/* HLSLens figure helpers: before/after slider and zoom boxes.

   Before/after slider (two images):
     <figure class="compare">
       <img data-label="Off" src="a.webp" alt="...">
       <img data-label="On"  src="b.webp" alt="...">
       <figcaption>...</figcaption>
     </figure>

   Zoom box (works on a single image or on a compare figure):
     <figure class="compare" data-zoom="52 62 14" data-zoom-pos="bl" data-zoom-size="38">
     data-zoom       "x y w": top-left corner and width of the magnified region,
                     all in % of the image. The region keeps the image's aspect ratio.
     data-zoom-pos   where the box sits: br (default), bl, tr, tl
     data-zoom-size  width of the box in % of the image (default 36)

   Without JavaScript a compare figure shows its two images side by side
   and a zoom figure is just a normal image. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- zoom box ---------- */

  function hull(pts) {
    pts = pts.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
    var lo = [], up = [], i;
    for (i = 0; i < pts.length; i++) {
      while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop();
      lo.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop();
      up.push(pts[i]);
    }
    lo.pop(); up.pop();
    return lo.concat(up);
  }

  function addZoom(fig, stage, images) {
    var v = (fig.dataset.zoom || '').split(/[\s,]+/).map(Number);
    if (v.length < 3 || v.some(isNaN)) return;
    var rx = v[0], ry = v[1], rw = v[2];
    var size = parseFloat(fig.dataset.zoomSize) || 36;
    var pos = fig.dataset.zoomPos || 'br';
    var margin = 2;                               /* % of the image */

    /* Region outline on the image */
    var region = document.createElement('div');
    region.className = 'zoom-region';
    region.style.cssText = 'left:' + rx + '%;top:' + ry + '%;width:' + rw + '%;height:' + rw + '%';
    stage.appendChild(region);

    /* The magnified box. Same aspect ratio as the image, so region height in % equals rw. */
    var box = document.createElement('div');
    box.className = 'zoom-box';
    box.setAttribute('aria-hidden', 'true');
    var bx = pos.indexOf('l') > -1 ? margin : 100 - margin - size;
    var by = pos.indexOf('t') > -1 ? margin * 1.9 : 100 - margin * 1.9 - size;
    box.style.cssText = 'left:' + bx + '%;top:' + by + '%;width:' + size + '%;height:' + size + '%';

    var scale = 100 / rw;
    images.forEach(function (src, i) {
      var z = document.createElement('img');
      z.src = src.currentSrc || src.src;
      z.alt = '';
      z.draggable = false;
      z.style.cssText = 'width:' + scale * 100 + '%;left:' + (-rx / rw * 100) + '%;top:' + (-ry / rw * 100) + '%';
      var layer = document.createElement('div');
      layer.className = 'zoom-layer' + (images.length === 2 && i === 1 ? ' zoom-right' : '');
      layer.appendChild(z);
      box.appendChild(layer);
    });
    if (images.length === 2) {
      var split = document.createElement('span');
      split.className = 'zoom-split';
      box.appendChild(split);
    }
    stage.appendChild(box);

    /* Thin connector lines: the outer edges between region and box */
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'zoom-lines');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    var R = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rw], [rx, ry + rw]];
    var B = [[bx, by], [bx + size, by], [bx + size, by + size], [bx, by + size]];
    var pts = [];
    R.forEach(function (p) { pts.push({ x: p[0], y: p[1], g: 'r' }); });
    B.forEach(function (p) { pts.push({ x: p[0], y: p[1], g: 'b' }); });
    var h = hull(pts);
    for (var i = 0; i < h.length; i++) {
      var p = h[i], q = h[(i + 1) % h.length];
      if (p.g !== q.g) {
        var l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', p.x); l.setAttribute('y1', p.y);
        l.setAttribute('x2', q.x); l.setAttribute('y2', q.y);
        svg.appendChild(l);
      }
    }
    stage.insertBefore(svg, region);
  }

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

    if (fig.dataset.zoom) addZoom(fig, stage, [a, b]);
    set(50);
    fig.classList.add('is-ready');
  }

  /* ---------- single image with a zoom box ---------- */

  function initZoom(fig) {
    var img = fig.querySelector(':scope > img');
    if (!img) return;
    var stage = document.createElement('div');
    stage.className = 'zoom-stage';
    fig.insertBefore(stage, img);
    stage.appendChild(img);
    addZoom(fig, stage, [img]);
  }

  function run() {
    document.querySelectorAll('figure.compare').forEach(initCompare);
    document.querySelectorAll('figure[data-zoom]:not(.compare)').forEach(initZoom);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
