/* =============================================================
 * BEAR BOOKCASE — TRANG ĐỌC TRUYỆN (doc.html)
 *   doc.html?truyen=<thư-mục>              trang giới thiệu + mục lục
 *   doc.html?truyen=<thư-mục>&chuong=2     đọc chương 2
 *   ...&tiep=1                             cuộn tới vị trí đã lưu
 * ============================================================= */
(function () {
  'use strict';

  var BT = window.BearTruyen;
  var KHOA_CAI_DAT = 'bearBookcase.caiDatDoc';
  var CO_MIN = 14, CO_MAX = 30, CO_MAC_DINH = 18;
  var root = document.documentElement;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (k) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[k];
    });
  }

  var el = {
    view: $('view'),
    main: $('noi-dung'),
    title: $('reader-title'),
    progress: $('read-progress-bar'),
    btnToc: $('btn-toc'),
    btnSettings: $('btn-settings'),
    settings: $('settings-panel'),
    fontDown: $('font-down'),
    fontUp: $('font-up'),
    fontValue: $('font-value'),
    toc: $('toc-panel'),
    tocList: $('toc-list'),
    tocClose: $('toc-close'),
    tocBackdrop: $('toc-backdrop'),
    resume: $('resume-toast'),
    resumeText: $('resume-text'),
    resumeBtn: $('resume-btn'),
    resumeClose: $('resume-close')
  };

  /* ---------- Cài đặt đọc: cỡ chữ + màu nền (localStorage có thể bị chặn) ---------- */
  var caiDat = (function () {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(KHOA_CAI_DAT) || '{}') || {}; } catch (e) { c = {}; }
    var co = typeof c.co === 'number' && c.co >= CO_MIN && c.co <= CO_MAX ? c.co : CO_MAC_DINH;
    var nen = c.nen === 'sang' || c.nen === 'sepia' || c.nen === 'toi' ? c.nen : '';
    return { co: co, nen: nen };
  })();

  function luuCaiDat() {
    try { localStorage.setItem(KHOA_CAI_DAT, JSON.stringify(caiDat)); } catch (e) { /* bỏ qua */ }
  }

  // Nếu chưa chọn nền riêng: theo giao diện sáng/tối chung của trang
  function nenHienTai() {
    if (caiDat.nen) return caiDat.nen;
    var t = root.getAttribute('data-theme');
    if (t === 'dark') return 'toi';
    if (t === 'light') return 'sang';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'toi' : 'sang';
  }

  function apDungCaiDat() {
    var giuViTri = tiLeCuon();
    root.style.setProperty('--co', caiDat.co + 'px');
    el.fontValue.textContent = caiDat.co + 'px';
    el.fontDown.disabled = caiDat.co <= CO_MIN;
    el.fontUp.disabled = caiDat.co >= CO_MAX;
    var nen = nenHienTai();
    if (caiDat.nen) {
      root.setAttribute('data-theme', nen === 'toi' ? 'dark' : 'light');
      root.setAttribute('data-reader', nen);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-nen]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-nen') === nen));
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', nen === 'toi' ? '#15120f' : nen === 'sepia' ? '#f4ecd8' : '#fbf6ef');
    // Đổi cỡ chữ làm chiều dài trang thay đổi: giữ nguyên tỉ lệ vị trí đang đọc
    if (dangDocChuong) cuonToiTiLe(giuViTri);
  }

  /* ---------- Markdown đơn giản, an toàn (escape HTML trước) ----------
   * Hỗ trợ: # tiêu đề, mỗi dòng là một đoạn, **đậm**, *nghiêng*, > trích dẫn,
   * "* " hoặc "+ " danh sách, 1. danh sách số, *** hoặc --- để ngắt cảnh, [chữ](https://link).
   * Dòng "- ..." là lời thoại, giữ nguyên làm đoạn văn. */
  function dongChu(s) {
    var giu = [];
    s = esc(s).replace(/\\([\\*_\[\]()#>-])/g, function (m, k) { giu.push(k); return '\u0001' + (giu.length - 1) + '\u0001'; });
    s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
         .replace(/__([^_]+?)__/g, '<strong>$1</strong>')
         .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
         .replace(/(^|[\s(])_([^_]+?)_(?=[\s).,!?;:]|$)/g, '$1<em>$2</em>')
         .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s.replace(/\u0001(\d+)\u0001/g, function (m, i) { return esc(giu[Number(i)]); });
  }

  function markdownSangHtml(md) {
    var dong = String(md || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
    var html = [], i = 0;
    var RE_NGAT = /^\s*((\\?\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/;
    while (i < dong.length) {
      var d = dong[i];
      if (!d.trim()) { i++; continue; }
      var m;
      if ((m = d.match(/^\s*(#{1,6})\s+(.*)$/))) {
        var cap = m[1].length <= 2 ? 2 : 3;
        html.push('<h' + cap + '>' + dongChu(m[2]) + '</h' + cap + '>'); i++; continue;
      }
      if (RE_NGAT.test(d)) { html.push('<hr class="scene-break">'); i++; continue; }
      if (/^\s*>/.test(d)) {
        var q = [];
        while (i < dong.length && /^\s*>/.test(dong[i])) {
          var noiDung = dong[i].replace(/^\s*>\s?/, '');
          if (noiDung.trim()) q.push('<p>' + dongChu(noiDung) + '</p>');
          i++;
        }
        html.push('<blockquote>' + q.join('') + '</blockquote>'); continue;
      }
      // Danh sách chỉ dùng "* " hoặc "+ ". Dòng bắt đầu bằng "- " được giữ nguyên làm đoạn văn,
      // vì truyện tiếng Việt hay dùng "- " cho lời thoại.
      if (/^\s*[*+]\s+\S/.test(d) && !RE_NGAT.test(d)) {
        var ul = [];
        while (i < dong.length && /^\s*[*+]\s+\S/.test(dong[i]) && !RE_NGAT.test(dong[i])) {
          ul.push('<li>' + dongChu(dong[i].replace(/^\s*[*+]\s+/, '')) + '</li>'); i++;
        }
        html.push('<ul>' + ul.join('') + '</ul>'); continue;
      }
      if (/^\s*\d+[.)]\s+/.test(d)) {
        var ol = [];
        while (i < dong.length && /^\s*\d+[.)]\s+/.test(dong[i])) {
          ol.push('<li>' + dongChu(dong[i].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); i++;
        }
        html.push('<ol>' + ol.join('') + '</ol>'); continue;
      }
      html.push('<p>' + dongChu(d.trim()) + '</p>'); i++;
    }
    return html.join('\n');
  }

  /* Lấy tiêu đề "# ..." ở đầu file .md (nếu có) và phần thân còn lại */
  function tachTieuDe(md) {
    var s = String(md || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/^\s+/, '');
    var m = s.match(/^#\s+(.+)\n?/);
    return m ? { tieuDe: m[1].trim(), than: s.slice(m[0].length) } : { tieuDe: '', than: s };
  }

  /* ---------- Đọc tham số trên URL (không cần URLSearchParams cho trình duyệt cũ) ---------- */
  function thamSo() {
    var kq = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (cap) {
      if (!cap) return;
      var p = cap.split('=');
      try { kq[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (e) { /* bỏ qua */ }
    });
    return kq;
  }

  /* ---------- Cuộn + tiến độ ---------- */
  var dangDocChuong = null;   // { truyen, so } khi đang ở trang chương
  var boQuaCuonDen = 0;       // bỏ qua sự kiện cuộn do chính code gây ra
  var choXacNhan = false;     // đang hỏi "Đọc tiếp?" thì chưa ghi đè tiến độ

  function chieuCaoCuonDuoc() {
    var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    return Math.max(0, h - window.innerHeight);
  }
  function tiLeCuon() {
    var max = chieuCaoCuonDuoc();
    if (max <= 2) return dangDocChuong ? 1 : 0;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    return Math.max(0, Math.min(1, y / max));
  }
  function cuonToiTiLe(t) {
    boQuaCuonDen = Date.now() + 400;
    window.scrollTo(0, Math.round(chieuCaoCuonDuoc() * Math.max(0, Math.min(1, t))));
    capNhatThanhTienDo();
  }
  function capNhatThanhTienDo() {
    el.progress.style.width = (dangDocChuong ? Math.round(tiLeCuon() * 100) : 0) + '%';
  }

  function luuTienDo() {
    if (!dangDocChuong || choXacNhan) return;
    var t = dangDocChuong.truyen, so = dangDocChuong.so, tl = tiLeCuon();
    BT.ghiTienDo(t.id, {
      chuong: so,
      viTri: Math.round(tl * 1000) / 1000,
      tongChuong: t.chuong.length,
      ten: t.ten,
      tacGia: t.tacGia,
      xong: so === t.chuong.length && tl >= 0.98,
      luc: Date.now()
    });
  }

  var henGioLuu = null;
  window.addEventListener('scroll', function () {
    capNhatThanhTienDo();
    // Cuộn do chính trang gây ra (mở chương, đổi cỡ chữ) không được tính là người đọc tự cuộn
    // để bỏ qua thanh "Đọc tiếp"; còn vị trí hiện tại thì luôn được lưu.
    if (choXacNhan && Date.now() >= boQuaCuonDen && tiLeCuon() > 0.02) { choXacNhan = false; anResume(); }
    if (henGioLuu) return;
    henGioLuu = setTimeout(function () { henGioLuu = null; luuTienDo(); }, 250);
  }, { passive: true });
  window.addEventListener('pagehide', luuTienDo);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') luuTienDo(); });

  /* ---------- Thanh "Đọc tiếp" ---------- */
  var tiLeChoTiep = 0;
  function hienResume(tl) {
    tiLeChoTiep = tl;
    choXacNhan = true;
    el.resumeText.textContent = 'Lần trước bạn dừng ở ' + Math.round(tl * 100) + '% chương này.';
    el.resume.hidden = false;
  }
  function anResume() { el.resume.hidden = true; }
  el.resumeBtn.addEventListener('click', function () {
    choXacNhan = false; anResume(); cuonToiTiLe(tiLeChoTiep); luuTienDo();
  });
  el.resumeClose.addEventListener('click', function () { choXacNhan = false; anResume(); luuTienDo(); });

  /* ---------- Hiển thị ---------- */
  var boNhoInfo = {};

  function thongBaoLoi(thongDiep) {
    var mucFile = BT.moFileTrucTiep ?
      '<p>Bạn đang mở trang trực tiếp từ máy (file://). Trình duyệt thường chặn đọc file truyện trong trường hợp này. ' +
      'Hãy mở qua web (GitHub Pages, Netlify) hoặc chạy máy chủ cục bộ như hướng dẫn trong README.</p>' : '';
    el.view.innerHTML = '<div class="reader-col reader-error"><h1>Không mở được truyện</h1><p>' + esc(thongDiep) + '</p>' + mucFile +
      '<p><a class="toggle-btn" href="./">← Về trang chủ</a></p></div>';
    el.btnToc.hidden = true;
    el.title.textContent = '';
  }

  function linkNoiBo(href, noiDung, cls, attrs) {
    return '<a class="' + (cls || '') + '" href="' + esc(href) + '" data-nav' + (attrs || '') + '>' + noiDung + '</a>';
  }

  function veMucLuc(t, so) {
    el.tocList.innerHTML = t.chuong.map(function (c) {
      var hienTai = c.so === so;
      return '<li>' + linkNoiBo(BT.linkDoc(t.id, c.so), '<span class="toc-num">Chương ' + c.so + '</span><span class="toc-name">' + esc(c.ten) + '</span>',
        'toc-link' + (hienTai ? ' is-current' : ''), hienTai ? ' aria-current="page"' : '') + '</li>';
    }).join('');
    el.btnToc.hidden = !t.chuong.length;
  }

  function veTongQuan(t) {
    dangDocChuong = null;
    anResume();
    var td = BT.layTienDo(t.id);
    var nut = '';
    if (td && !td.xong && td.chuong <= t.chuong.length) {
      nut += linkNoiBo(BT.linkDoc(t.id, td.chuong, true), '▶ Đọc tiếp: Chương ' + td.chuong + ' · ' + Math.round((td.viTri || 0) * 100) + '%', 'toggle-btn btn-primary', ' id="btn-doc-tiep"');
      nut += linkNoiBo(BT.linkDoc(t.id, 1), 'Đọc từ đầu', 'toggle-btn');
    } else if (td && td.xong) {
      nut += '<p class="done-note">✓ Bạn đã đọc xong truyện này.</p>';
      nut += linkNoiBo(BT.linkDoc(t.id, 1), 'Đọc lại từ đầu', 'toggle-btn btn-primary');
    } else if (t.chuong.length) {
      nut += linkNoiBo(BT.linkDoc(t.id, 1), '▶ Bắt đầu đọc', 'toggle-btn btn-primary', ' id="btn-bat-dau"');
    }
    el.view.innerHTML =
      '<div class="reader-col story-intro">' +
        '<p class="story-kicker">' + esc(t.theLoai || 'Truyện') + ' · ' + t.chuong.length + ' chương</p>' +
        '<h1>' + esc(t.ten) + '</h1>' +
        (t.tacGia ? '<p class="story-author">' + esc(t.tacGia) + '</p>' : '') +
        (t.moTa ? '<p class="story-summary">' + esc(t.moTa) + '</p>' : '') +
        '<div class="story-actions">' + nut + '</div>' +
        '<h2 class="toc-inline-title">Mục lục</h2>' +
        '<ol class="toc-list toc-inline">' + t.chuong.map(function (c) {
          var dangO = td && !td.xong && td.chuong === c.so;
          return '<li>' + linkNoiBo(BT.linkDoc(t.id, c.so), '<span class="toc-num">Chương ' + c.so + '</span><span class="toc-name">' + esc(c.ten) + '</span>' +
            (dangO ? '<span class="toc-badge">Đang đọc</span>' : ''), 'toc-link') + '</li>';
        }).join('') + '</ol>' +
      '</div>';
    el.title.textContent = t.ten;
    document.title = t.ten + ' · Bear Bookcase';
    veMucLuc(t, 0);
    capNhatThanhTienDo();
  }

  function veChuong(t, so, tiep) {
    var c = t.chuong[so - 1];
    if (!c) return thongBaoLoi('Truyện này không có chương ' + so + '.');
    dangDocChuong = null;
    anResume();
    el.view.innerHTML = '<p class="reader-loading reader-col">Đang tải chương ' + so + '…</p>';
    el.title.textContent = t.ten;
    veMucLuc(t, so);
    BT.taiChuong(t, so, function (loi, md) {
      if (loi) return thongBaoLoi('Không tải được chương ' + so + ' (' + c.file + ').');
      var tach = tachTieuDe(md);
      var tieuDe = tach.tieuDe || c.ten;
      var truoc = so > 1 ? linkNoiBo(BT.linkDoc(t.id, so - 1), '← Chương trước', 'toggle-btn nav-prev', ' rel="prev"')
        : '<span class="toggle-btn nav-prev is-disabled" aria-disabled="true">← Chương trước</span>';
      var sau = so < t.chuong.length ? linkNoiBo(BT.linkDoc(t.id, so + 1), 'Chương sau →', 'toggle-btn btn-primary nav-next', ' rel="next"')
        : linkNoiBo(BT.linkDoc(t.id), 'Hết truyện ✓', 'toggle-btn nav-next');
      el.view.innerHTML =
        '<article class="reader-col chapter" id="chapter">' +
          '<p class="chapter-kicker">' + linkNoiBo(BT.linkDoc(t.id), esc(t.ten)) + ' · Chương ' + so + '/' + t.chuong.length + '</p>' +
          '<h1 class="chapter-title">' + esc(tieuDe) + '</h1>' +
          '<div class="chapter-body">' + markdownSangHtml(tach.than) + '</div>' +
        '</article>' +
        '<nav class="reader-col chapter-nav" aria-label="Chuyển chương">' + truoc +
          '<button class="toggle-btn nav-toc" type="button" data-open-toc>Mục lục</button>' + sau +
        '</nav>';
      document.title = tieuDe + ' · ' + t.ten + ' · Bear Bookcase';
      dangDocChuong = { truyen: t, so: so };

      var td = BT.layTienDo(t.id);
      var daLuu = td && td.chuong === so ? (Number(td.viTri) || 0) : 0;
      if (tiep && daLuu > 0) {
        cuonToiTiLe(daLuu);
        // Phông chữ tải xong có thể làm trang dài ra: cuộn lại lần nữa
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (dangDocChuong && dangDocChuong.so === so) cuonToiTiLe(daLuu); });
        luuTienDo();
      } else {
        cuonToiTiLe(0);
        if (daLuu > 0.03 && daLuu < 0.98) hienResume(daLuu);
        else luuTienDo();
      }
      try { el.main.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
    });
  }

  function veDanhSachTatCa() {
    dangDocChuong = null;
    el.title.textContent = '';
    el.btnToc.hidden = true;
    BT.taiDanhSach(function (loi, ds) {
      if (loi) return thongBaoLoi('Không tải được danh sách truyện.');
      el.view.innerHTML = '<div class="reader-col story-intro"><h1>Đọc truyện</h1>' +
        (ds.length ? '<ol class="toc-list toc-inline">' + ds.map(function (t) {
          return '<li>' + linkNoiBo(BT.linkDoc(t.id), '<span class="toc-name">' + esc(t.ten) + '</span><span class="toc-num">' +
            esc(t.tacGia) + ' · ' + t.chuong.length + ' chương</span>', 'toc-link') + '</li>';
        }).join('') + '</ol>' : '<p>Chưa có truyện nào.</p>') + '</div>';
    });
  }

  /* ---------- Điều hướng không tải lại trang ---------- */
  function dieuHuong() {
    dongMucLuc();
    var p = thamSo();
    if (!p.truyen) return veDanhSachTatCa();
    if (!BT.idHopLe(p.truyen)) return thongBaoLoi('Tên truyện không hợp lệ.');
    var so = p.chuong ? parseInt(p.chuong, 10) : 0;
    function tiepTuc(t) {
      if (so) veChuong(t, so, p.tiep === '1'); else veTongQuan(t);
    }
    if (boNhoInfo[p.truyen]) return tiepTuc(boNhoInfo[p.truyen]);
    BT.taiInfo(p.truyen, function (loi, t) {
      if (loi) return thongBaoLoi('Không tìm thấy truyện “' + p.truyen + '”.');
      boNhoInfo[p.truyen] = t;
      tiepTuc(t);
    });
  }

  function diToi(href) {
    luuTienDo();
    if (window.history && history.pushState) {
      history.pushState(null, '', href);
      dieuHuong();
    } else {
      location.href = href;
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-nav]') : null;
    if (a && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      diToi(a.getAttribute('href'));
      return;
    }
    if (e.target.closest && e.target.closest('[data-open-toc]')) moMucLuc();
  });
  window.addEventListener('popstate', dieuHuong);

  /* Phím mũi tên trái/phải để chuyển chương (trừ khi đang gõ chữ) */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { dongMucLuc(); el.settings.hidden = true; el.btnSettings.setAttribute('aria-expanded', 'false'); return; }
    if (!dangDocChuong || e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    var a = null;
    if (e.key === 'ArrowLeft') a = document.querySelector('.chapter-nav a.nav-prev');
    if (e.key === 'ArrowRight') a = document.querySelector('.chapter-nav a.nav-next');
    if (a) { e.preventDefault(); diToi(a.getAttribute('href')); }
  });

  /* ---------- Mục lục dạng ngăn kéo ---------- */
  var viTriTruocKhiKhoa = 0, dangKhoa = false;
  function khoaCuon() {
    if (dangKhoa) return;
    dangKhoa = true;
    viTriTruocKhiKhoa = window.pageYOffset || 0;
    var b = document.body.style;
    b.position = 'fixed'; b.top = (-viTriTruocKhiKhoa) + 'px'; b.left = '0'; b.right = '0'; b.width = '100%';
  }
  function moKhoaCuon() {
    if (!dangKhoa) return;
    dangKhoa = false;
    var b = document.body.style;
    b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = '';
    boQuaCuonDen = Date.now() + 300;
    window.scrollTo(0, viTriTruocKhiKhoa);
  }
  function moMucLuc() {
    khoaCuon();
    el.toc.hidden = false; el.tocBackdrop.hidden = false;
    el.btnToc.setAttribute('aria-expanded', 'true');
    var hienTai = el.toc.querySelector('.is-current') || el.toc.querySelector('a');
    if (hienTai) { try { hienTai.focus({ preventScroll: false }); } catch (e) { hienTai.focus(); } }
  }
  function dongMucLuc() {
    if (el.toc.hidden) return;
    el.toc.hidden = true; el.tocBackdrop.hidden = true;
    el.btnToc.setAttribute('aria-expanded', 'false');
    moKhoaCuon();
  }
  el.btnToc.addEventListener('click', function () { if (el.toc.hidden) moMucLuc(); else dongMucLuc(); });
  el.tocClose.addEventListener('click', function () { dongMucLuc(); el.btnToc.focus(); });
  el.tocBackdrop.addEventListener('click', dongMucLuc);

  /* ---------- Bảng cài đặt ---------- */
  el.btnSettings.addEventListener('click', function () {
    var mo = el.settings.hidden;
    el.settings.hidden = !mo;
    el.btnSettings.setAttribute('aria-expanded', String(mo));
  });
  el.fontDown.addEventListener('click', function () {
    caiDat.co = Math.max(CO_MIN, caiDat.co - 2); luuCaiDat(); apDungCaiDat();
  });
  el.fontUp.addEventListener('click', function () {
    caiDat.co = Math.min(CO_MAX, caiDat.co + 2); luuCaiDat(); apDungCaiDat();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-nen]'), function (b) {
    b.addEventListener('click', function () {
      caiDat.nen = b.getAttribute('data-nen'); luuCaiDat(); apDungCaiDat();
    });
  });

  /* ---------- Khởi động ---------- */
  apDungCaiDat();
  dieuHuong();
})();
