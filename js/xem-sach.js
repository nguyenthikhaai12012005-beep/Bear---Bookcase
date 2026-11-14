/* =============================================================
 * BEAR BOOKCASE — ĐỌC SÁCH PDF NGAY TRÊN TRANG (xem-sach.html?file=...)
 * Vẽ từng trang bằng PDF.js (chạy được cả trên điện thoại), chỉ vẽ những trang
 * gần màn hình để nhẹ máy, nhớ trang đang đọc trên thiết bị.
 * ============================================================= */
(function () {
  'use strict';

  var K = window.BearKeSach, PDF = window.BearPDF;
  if (!K || !PDF) return;
  var esc = K.esc;
  function $(id) { return document.getElementById(id); }

  var el = {
    view: $('pdf-view'), title: $('reader-title'), bar: $('read-progress-bar'), pill: $('page-pill'),
    header: document.querySelector('.reader-header'),
    tools: $('pdf-tools'), btnTools: $('btn-tools'),
    zoomOut: $('zoom-out'), zoomIn: $('zoom-in'), zoomFit: $('zoom-fit'), zoomVal: $('zoom-value'),
    gotoForm: $('goto-form'), gotoInput: $('goto-input'),
    openTab: $('pdf-open-tab'), download: $('pdf-download'),
    resume: $('resume-toast'), resumeText: $('resume-text'), resumeBtn: $('resume-btn'), resumeClose: $('resume-close')
  };

  function thamSo(ten) {
    var m = location.search.match(new RegExp('[?&]' + ten + '=([^&]*)'));
    try { return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; } catch (e) { return ''; }
  }
  function thongBao(tieuDe, noiDung, them) {
    el.view.innerHTML = '<div class="reader-col reader-error"><h1>' + esc(tieuDe) + '</h1><p>' + noiDung + '</p>' + (them || '') +
      '<p><a class="toggle-btn" href="index.html#ke-sach">← Về Kệ sách</a></p></div>';
    el.btnTools.hidden = true;
  }

  /* ---------- Kiểm tra đầu vào ---------- */
  var sach = K.timSach(thamSo('file'));
  if (!sach || !sach.file) return thongBao('Không tìm thấy sách', 'Cuốn này không có trong danh sách <code>sach/danh-sach.js</code>.');
  var url = K.duongDan(sach);
  el.title.textContent = sach.ten;
  document.title = sach.ten + ' · Bear Bookcase';
  el.openTab.href = url;
  el.download.href = url;
  var nutMoFile = '<p><a class="toggle-btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">📖 Mở file PDF ở tab mới</a></p>';
  if (!K.daMoKhoa()) return thongBao('Kệ sách cần mật khẩu', 'Hãy mở khóa Kệ sách ở trang chủ trước.');
  if (!PDF.coThe) {
    return thongBao('Chưa đọc được trong trang', 'Khi mở trực tiếp file trên máy (file://), trình duyệt không cho trang đọc nội dung PDF. ' +
      'Đọc trong trang sẽ chạy khi website được mở qua web (GitHub Pages, Netlify) hoặc máy chủ cục bộ.', nutMoFile);
  }

  /* ---------- Trạng thái ---------- */
  var pdf = null, soTrang = 0;
  var tiLe = [];            // tỉ lệ cao/rộng của từng trang
  var MUC_ZOOM = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  var zoom = 1;
  var daVe = {}, dangVe = {};
  var trangHienTai = 1;
  var choLuu = false;       // chưa khôi phục xong thì chưa lưu trang

  function rongTrang() {
    var w = Math.min(document.documentElement.clientWidth - 24, 900);
    return Math.max(200, Math.round(w * zoom));
  }
  function caoHeader() { return el.header ? el.header.getBoundingClientRect().height : 0; }
  function hopTrang(i) { return $('p-' + i); }

  /* ---------- Dựng khung các trang ---------- */
  function dungKhung() {
    var w = rongTrang(), html = '';
    for (var i = 1; i <= soTrang; i++) {
      html += '<div class="pdf-page" id="p-' + i + '" data-trang="' + i + '" style="width:' + w + 'px;height:' +
        Math.round(w * (tiLe[i] || tiLe[1] || 1.414)) + 'px"><span class="pdf-page-num">' + i + '</span></div>';
    }
    el.view.innerHTML = '<div class="pdf-pages" role="document" aria-label="' + esc(sach.ten) + '">' + html + '</div>';
    daVe = {}; dangVe = {};
    el.zoomVal.textContent = Math.round(zoom * 100) + '%';
    el.zoomOut.disabled = zoom <= MUC_ZOOM[0];
    el.zoomIn.disabled = zoom >= MUC_ZOOM[MUC_ZOOM.length - 1];
  }

  /* ---------- Vẽ / bỏ vẽ trang ---------- */
  function veTrang(i) {
    if (daVe[i] || dangVe[i]) return;
    var hop = hopTrang(i);
    if (!hop) return;
    dangVe[i] = true;
    pdf.getPage(i).then(function (trang) {
      if (!document.body.contains(hop)) { dangVe[i] = false; return; }
      var vp1 = trang.getViewport({ scale: 1 });
      tiLe[i] = vp1.height / vp1.width;
      var w = parseFloat(hop.style.width) || rongTrang();
      var caoCu = hop.offsetHeight, caoMoi = Math.round(w * tiLe[i]);
      if (caoCu !== caoMoi) {
        var phiaTren = hop.getBoundingClientRect().bottom < caoHeader();
        hop.style.height = caoMoi + 'px';
        if (phiaTren) window.scrollBy(0, caoMoi - caoCu); // giữ nguyên chỗ đang đọc
      }
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var vp = trang.getViewport({ scale: (w / vp1.width) * dpr });
      var c = document.createElement('canvas');
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      var ctx = c.getContext('2d');
      return trang.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        dangVe[i] = false;
        if (!document.body.contains(hop)) return;
        var cu = hop.querySelector('canvas');
        if (cu) hop.removeChild(cu);
        hop.appendChild(c);
        hop.classList.add('is-rendered');
        daVe[i] = true;
        try { trang.cleanup(); } catch (e) { /* bỏ qua */ }
      });
    }).catch(function () { dangVe[i] = false; });
  }
  function boVe(i) {
    var hop = hopTrang(i);
    if (!hop || !daVe[i]) return;
    var c = hop.querySelector('canvas');
    if (c) { c.width = 0; c.height = 0; hop.removeChild(c); }
    hop.classList.remove('is-rendered');
    daVe[i] = false;
  }

  /* Vẽ trang gần màn hình, bỏ vẽ trang ở xa để tiết kiệm bộ nhớ; tìm trang đang đọc */
  function kiemTra() {
    if (!pdf) return;
    var vh = window.innerHeight, moc = caoHeader() + (vh - caoHeader()) * 0.3;
    var hienTai = trangHienTai;
    for (var i = 1; i <= soTrang; i++) {
      var r = hopTrang(i).getBoundingClientRect();
      if (r.bottom > -vh && r.top < vh * 2) veTrang(i);
      else if (r.bottom < -vh * 5 || r.top > vh * 6) boVe(i);
      if (r.top <= moc && r.bottom > moc) hienTai = i;
    }
    // Đã cuộn tới cuối sách: trang cuối luôn là trang đang đọc (dù nó ngắn hơn màn hình)
    if ((window.pageYOffset || 0) >= document.documentElement.scrollHeight - vh - 2) hienTai = soTrang;
    if (hienTai !== trangHienTai) { trangHienTai = hienTai; hienSoTrang(); luuTrang(); }
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    el.bar.style.width = Math.round(Math.min(1, (window.pageYOffset || 0) / max) * 100) + '%';
  }

  var henPill = null;
  function hienSoTrang() {
    el.pill.textContent = 'Trang ' + trangHienTai + ' / ' + soTrang;
    el.pill.hidden = false;
    el.pill.classList.add('is-visible');
    clearTimeout(henPill);
    henPill = setTimeout(function () { el.pill.classList.remove('is-visible'); }, 1500);
    el.gotoInput.placeholder = String(trangHienTai);
  }

  var henLuu = null;
  function luuTrang() {
    if (choLuu) return;
    clearTimeout(henLuu);
    henLuu = setTimeout(function () { K.datTrang(sach.id, trangHienTai); }, 300);
  }

  function toiTrang(i, khongLuu) {
    i = Math.max(1, Math.min(soTrang, i | 0));
    var hop = hopTrang(i);
    if (!hop) return;
    var y = hop.getBoundingClientRect().top + (window.pageYOffset || 0) - caoHeader() - 8;
    window.scrollTo(0, Math.max(0, y));
    trangHienTai = i;
    hienSoTrang();
    if (!khongLuu) luuTrang();
    kiemTra();
  }

  /* ---------- Cuộn / đổi kích thước ---------- */
  var choKhung = false;
  window.addEventListener('scroll', function () {
    if (choKhung) return;
    choKhung = true;
    (window.requestAnimationFrame || setTimeout)(function () { choKhung = false; kiemTra(); });
  }, { passive: true });

  function doiZoom(moi) {
    var giu = trangHienTai;
    zoom = moi;
    dungKhung();
    toiTrang(giu, true);
  }
  var rongCu = document.documentElement.clientWidth, henResize = null;
  window.addEventListener('resize', function () {
    clearTimeout(henResize);
    henResize = setTimeout(function () {
      var r = document.documentElement.clientWidth;
      if (pdf && Math.abs(r - rongCu) > 30) { rongCu = r; doiZoom(zoom); }
    }, 250);
  });

  /* ---------- Thanh công cụ ---------- */
  el.btnTools.addEventListener('click', function () {
    var mo = el.tools.hidden;
    el.tools.hidden = !mo;
    el.btnTools.setAttribute('aria-expanded', String(mo));
  });
  el.zoomIn.addEventListener('click', function () {
    for (var i = 0; i < MUC_ZOOM.length; i++) if (MUC_ZOOM[i] > zoom + 0.01) return doiZoom(MUC_ZOOM[i]);
  });
  el.zoomOut.addEventListener('click', function () {
    for (var i = MUC_ZOOM.length - 1; i >= 0; i--) if (MUC_ZOOM[i] < zoom - 0.01) return doiZoom(MUC_ZOOM[i]);
  });
  el.zoomFit.addEventListener('click', function () { doiZoom(1); });
  el.gotoForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = parseInt(el.gotoInput.value, 10);
    if (n >= 1 && n <= soTrang) { toiTrang(n); el.gotoInput.value = ''; }
    else el.gotoInput.select();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.tools.hidden) { el.tools.hidden = true; el.btnTools.setAttribute('aria-expanded', 'false'); }
  });
  el.resumeBtn.addEventListener('click', function () { el.resume.hidden = true; toiTrang(1); });
  el.resumeClose.addEventListener('click', function () { el.resume.hidden = true; });

  /* ---------- Mở sách ---------- */
  PDF.moTaiLieu(url, function (loi, tl) {
    if (loi) {
      return thongBao('Không mở được sách', 'Không tải được file PDF này (có thể file lỗi, quá lớn, hoặc mất kết nối mạng).', nutMoFile);
    }
    pdf = tl;
    soTrang = pdf.numPages;
    el.gotoInput.max = String(soTrang);
    pdf.getPage(1).then(function (t1) {
      var vp = t1.getViewport({ scale: 1 });
      tiLe[1] = vp.height / vp.width;
      dungKhung();
      choLuu = true;
      var yeuCau = parseInt(thamSo('trang'), 10);
      var daLuu = K.layTrang(sach.id);
      var dich = yeuCau > 0 ? yeuCau : daLuu;
      if (dich > 1 && dich <= soTrang) {
        toiTrang(dich, true);
        if (!(yeuCau > 0)) {
          el.resumeText.textContent = 'Đang đọc tiếp từ trang ' + dich + '.';
          el.resume.hidden = false;
          setTimeout(function () { el.resume.hidden = true; }, 6000);
        }
      } else {
        trangHienTai = 1;
        kiemTra();
      }
      choLuu = false;
      hienSoTrang();
      if (!daLuu) K.datTrang(sach.id, trangHienTai);
    }, function () {
      thongBao('Không mở được sách', 'File PDF này không đọc được.', nutMoFile);
    });
  });
})();
