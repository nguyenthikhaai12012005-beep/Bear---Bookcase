/* =============================================================
 * BEAR BOOKCASE — "KỆ SÁCH CỦA TÔI" trên trang chủ
 * Chủ trang tự thêm file PDF vào thư mục sach/ (xem README). Bìa tự động:
 * khi trang mở qua web, bìa là ảnh trang đầu của file PDF; khi mở trực tiếp
 * trên máy, bìa được vẽ từ tên sách.
 *
 * LƯU Ý: mật khẩu kiểm tra trong trình duyệt chỉ chặn người xem thông thường.
 * Trên hosting tĩnh, ai biết đường dẫn trực tiếp tới file PDF vẫn tải được.
 * ============================================================= */
(function () {
  'use strict';

  var P = window.BearPopup, K = window.BearKeSach, PDF = window.BearPDF;
  var THE_LOAI = window.THE_LOAI || {};
  if (!P || !K) return;
  var esc = K.esc;

  function $(id) { return document.getElementById(id); }
  var el = { sec: $('ke-sach'), grid: $('ke-sach-grid'), note: $('ke-sach-note'), count: $('ke-sach-count') };
  var dsSach = K.ds;

  /* ---------- Bìa từ trang đầu PDF (chỉ khi mở qua web) ---------- */
  function apDungThongTin(s, info) {
    if (!info) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-ks-bia="' + cssEsc(s.id) + '"]'), function (o) {
      if (info.bia && !o.querySelector('.pdf-cover')) o.innerHTML = K.htmlBiaAnh(info.bia);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ks-sotrang="' + cssEsc(s.id) + '"]'), function (o) {
      if (info.soTrang) { o.textContent = info.soTrang + ' trang'; o.hidden = false; }
    });
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  var quanSat = null;
  function yeuCauBia(s) {
    if (!PDF || !PDF.coThe || !s.file) return;
    var biet = PDF.thongTinDaBiet(K.duongDan(s));
    if (biet && biet.bia) return apDungThongTin(s, biet);
    PDF.layThongTin(K.duongDan(s), 300, function (loi, info) { if (!loi) apDungThongTin(s, info); });
  }
  function theoDoiBia() {
    if (!PDF || !PDF.coThe) return;
    var the = el.grid.querySelectorAll('[data-ks-mo]');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(the, function (b) { yeuCauBia(K.timSach(b.getAttribute('data-ks-mo'))); });
      return;
    }
    if (quanSat) quanSat.disconnect();
    quanSat = new IntersectionObserver(function (muc) {
      muc.forEach(function (m) {
        if (!m.isIntersecting) return;
        quanSat.unobserve(m.target);
        var s = K.timSach(m.target.getAttribute('data-ks-mo'));
        if (s) yeuCauBia(s);
      });
    }, { rootMargin: '300px 0px' });
    Array.prototype.forEach.call(the, function (b) { quanSat.observe(b); });
  }

  /* ---------- Khóa ---------- */
  function veKhoa() {
    el.count.textContent = '';
    el.note.hidden = true;
    el.grid.innerHTML =
      '<form class="shelf-lock" id="ks-khoa" novalidate>' +
        '<p class="shelf-lock-title"><span aria-hidden="true">🔒</span> Kệ sách cần mật khẩu</p>' +
        '<label class="field"><span class="visually-hidden">Mật khẩu</span>' +
          '<input type="password" id="ks-matkhau" autocomplete="current-password" placeholder="Nhập mật khẩu"></label>' +
        '<button class="toggle-btn btn-primary" type="submit">Mở khóa</button>' +
        '<p class="ks-error" id="ks-khoa-loi" role="alert"></p>' +
      '</form>';
  }

  /* ---------- Vẽ kệ ---------- */
  function veKe() {
    if (!K.daMoKhoa()) return veKhoa();
    el.note.hidden = false;
    el.count.textContent = dsSach.length + ' cuốn';
    el.grid.innerHTML = dsSach.map(function (s) {
      var td = K.layDocToi(s.id);
      var info = PDF && s.file ? PDF.thongTinDaBiet(K.duongDan(s)) : null;
      return '<button class="shelf-book" type="button" data-ks-mo="' + esc(s.id) + '">' +
        '<span class="shelf-cover" data-ks-bia="' + esc(s.id) + '">' + (info && info.bia ? K.htmlBiaAnh(info.bia) : K.htmlBia(s, 120)) + '</span>' +
        '<span class="shelf-title">' + esc(s.ten) + '</span>' +
        (s.tacGia ? '<span class="shelf-author">' + esc(s.tacGia) + '</span>' : '') +
        '<span class="shelf-pages" data-ks-sotrang="' + esc(s.id) + '"' + (info && info.soTrang ? '>' + info.soTrang + ' trang' : ' hidden>') + '</span>' +
        (td ? '<span class="shelf-progress">Đang đọc tới: ' + esc(td) + '</span>' : '') +
      '</button>';
    }).join('');
    theoDoiBia();
  }

  /* ---------- Popup chi tiết ---------- */
  var dangXem = null;

  function dongGoiY(s, info) {
    var ten = s.coTen ? s.ten : ((info && info.tieuDe) || s.ten);
    var tg = s.coTacGia ? s.tacGia : ((info && info.tacGia) || s.tacGia);
    function q(v) { return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
    return '{ file: ' + q(s.file) + ', ten: ' + q(ten) + ', tacGia: ' + q(tg) + ', theLoai: "", moTa: "" },';
  }

  function htmlThongTin(s, info) {
    if (!s.file) return '<dl class="facts"><div class="fact"><dt>Nguồn</dt><dd>Đường link</dd></div></dl>';
    var dong = [['Tên file', s.file]];
    if (info && info.soTrang) dong.push(['Số trang', info.soTrang + ' trang']);
    if (info && info.kichThuoc) dong.push(['Dung lượng', K.soMB(info.kichThuoc)]);
    if (info && info.tieuDe) dong.push(['Tiêu đề trong file', info.tieuDe]);
    if (info && info.tacGia) dong.push(['Tác giả trong file', info.tacGia]);
    return '<dl class="facts">' + dong.map(function (d) {
      return '<div class="fact"><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>';
    }).join('') + '</dl>' +
      (!info && PDF && PDF.coThe ? '<p class="facts-note" id="ks-dang-doc-file">Đang đọc thông tin file…</p>' : '') +
      (!PDF || !PDF.coThe ? '<p class="facts-note">Số trang, dung lượng và ảnh bìa từ trang đầu sẽ hiện khi trang được mở qua web.</p>' : '');
  }

  function htmlGoiY(s, info) {
    if (!s.file || (s.coTen && s.coTacGia)) return '';
    return '<section class="detail-section ks-suggest"><h3>Gợi ý điền thông tin</h3>' +
      '<p class="ks-hint">Cuốn này chưa có đủ tên sách/tác giả trong <code>sach/danh-sach.js</code>. Sao chép dòng dưới, sửa lại cho đúng rồi dán thay cho dòng <code>"' + esc(s.file) + '",</code>:</p>' +
      '<pre class="ks-code" id="ks-code">' + esc(dongGoiY(s, info)) + '</pre>' +
      '<button class="toggle-btn" type="button" data-ks-chep>Sao chép dòng này</button></section>';
  }

  function moChiTiet(id) {
    var s = K.timSach(id);
    if (!s) return;
    var info = PDF && s.file ? PDF.thongTinDaBiet(K.duongDan(s)) : null;
    var tl = THE_LOAI[s.theLoai];
    var trangDoc = K.layTrang(s.id);
    var docTrongTrang = s.file && PDF && PDF.coThe;
    var nutDoc;
    if (!s.file) {
      nutDoc = '<a class="toggle-btn read-now" id="ks-doc" href="' + esc(s.link) + '" target="_blank" rel="noopener">📖 Mở link</a>';
    } else if (docTrongTrang) {
      nutDoc = '<a class="toggle-btn read-now" id="ks-doc" href="' + esc(K.linkDoc(s)) + '">📖 ' + (trangDoc > 1 ? 'Đọc tiếp trang ' + trangDoc : 'Đọc') + '</a>';
    } else {
      nutDoc = '<a class="toggle-btn read-now" id="ks-doc" href="' + esc(K.duongDan(s)) + '" target="_blank" rel="noopener">📖 Đọc (tab mới)</a>';
    }
    var html =
      '<div class="detail-head">' +
        '<div class="detail-cover" data-ks-bia="' + esc(s.id) + '">' + (info && info.bia ? K.htmlBiaAnh(info.bia) : K.htmlBia(s, 0)) + '</div>' +
        '<div class="detail-info">' +
          '<h2 id="detail-title">' + esc(s.ten) + '</h2>' +
          (s.tacGia ? '<p class="detail-author">' + esc(s.tacGia) + '</p>' : '') +
          '<div class="detail-meta"><span class="pill">' + esc(tl ? tl.tenNgan : 'Kệ sách của tôi') + '</span>' +
            '<span class="pill pill-year" data-ks-sotrang="' + esc(s.id) + '"' + (info && info.soTrang ? '>' + info.soTrang + ' trang' : ' hidden>') + '</span></div>' +
          '<div class="detail-links">' + nutDoc +
            (s.file ? '<a class="toggle-btn" id="ks-tai" href="' + esc(K.duongDan(s)) + '" download>⬇ Tải về</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="ks-thong-tin">' + htmlThongTin(s, info) + '</div>' +
      (s.moTa ? '<section class="detail-section"><h3>Giới thiệu</h3><p>' + esc(s.moTa) + '</p></section>' : '') +
      '<section class="detail-section reading-box"><h3>Đang đọc tới</h3>' +
        '<label class="field"><span class="visually-hidden">Đang đọc tới</span>' +
        '<input type="text" id="ks-docToi" data-ks-id="' + esc(s.id) + '" maxlength="80" placeholder="vd: trang 120" value="' + esc(K.layDocToi(s.id)) + '"></label>' +
        '<p class="saved-hint" id="ks-saved" aria-live="polite">' + (docTrongTrang ? 'Tự cập nhật khi bạn đọc trên trang này. ' : '') + 'Chỉ lưu trên thiết bị này.</p></section>' +
      '<div id="ks-goi-y">' + htmlGoiY(s, info) + '</div>';
    // P.mo gọi hàm đóng của nội dung cũ trước, nên phải gán dangXem SAU khi mở
    P.mo(html, function () { if (dangXem === s) dangXem = null; });
    dangXem = s;

    // Thông tin chưa có: đọc file rồi cập nhật popup
    if (s.file && !info && PDF && PDF.coThe) {
      PDF.layThongTin(K.duongDan(s), 300, function (loi, kq) {
        if (dangXem !== s) return;
        if (loi) {
          var n = $('ks-dang-doc-file'); if (n) n.textContent = 'Không đọc được thông tin file PDF này.';
          return;
        }
        apDungThongTin(s, kq);
        var t = $('ks-thong-tin'); if (t) t.innerHTML = htmlThongTin(s, kq);
        var g = $('ks-goi-y'); if (g) g.innerHTML = htmlGoiY(s, kq);
      });
    }
  }

  /* ---------- Sự kiện ---------- */
  el.grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ks-mo]');
    if (b) moChiTiet(b.getAttribute('data-ks-mo'));
  });

  el.grid.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'ks-khoa') return;
    e.preventDefault();
    var o = $('ks-matkhau');
    if (K.thuMoKhoa(o.value)) veKe();
    else { $('ks-khoa-loi').textContent = 'Mật khẩu chưa đúng.'; o.select(); }
  });

  P.noiDung.addEventListener('input', function (e) {
    // Lấy id sách ngay trên ô nhập, không phụ thuộc biến trạng thái của popup
    var id = e.target && e.target.id === 'ks-docToi' ? e.target.getAttribute('data-ks-id') : '';
    if (!id || !K.timSach(id)) return;
    K.datDocToi(id, e.target.value);
    var h = $('ks-saved'); if (h) h.textContent = '✓ Đã lưu trên thiết bị này';
    veKe();
  });

  P.noiDung.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ks-chep]');
    if (!b) return;
    var code = $('ks-code'); if (!code) return;
    var txt = code.textContent;
    function xong() { b.textContent = '✓ Đã sao chép'; setTimeout(function () { b.textContent = 'Sao chép dòng này'; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(xong, chonTay);
    else chonTay();
    function chonTay() {
      var r = document.createRange(); r.selectNodeContents(code);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try { if (document.execCommand('copy')) xong(); } catch (er) { /* người dùng tự sao chép */ }
    }
  });

  // Quay lại từ trang đọc (Back): cập nhật "đang đọc tới"
  window.addEventListener('pageshow', function (e) { if (e.persisted && dsSach.length) veKe(); });

  /* ---------- Khởi động ---------- */
  if (dsSach.length) {
    el.sec.hidden = false;
    veKe();
  }
  if (window.BearMenu) window.BearMenu.capNhat();
})();
