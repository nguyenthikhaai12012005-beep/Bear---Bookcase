/* =============================================================
 * BEAR BOOKCASE — PHẦN CHUNG CỦA "KỆ SÁCH CỦA TÔI"
 * Dùng ở trang chủ (js/ke-sach.js) và trang đọc (js/xem-sach.js).
 * Dữ liệu: sach/danh-sach.js (window.KE_SACH), sach/cau-hinh.js (window.KE_SACH_MAT_KHAU)
 * ============================================================= */
(function () {
  'use strict';

  var THE_LOAI = window.THE_LOAI || {};
  var THU_MUC = 'sach/';
  var KHOA_MO = 'bearBookcase.keSachMoKhoa';
  var KHOA_DOC_TOI = 'bearBookcase.keSachDocToi';
  var KHOA_TRANG = 'bearBookcase.keSachTrang';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (k) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[k];
    });
  }
  function docLS(k, md) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? md : v; } catch (e) { return md; } }
  function ghiLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }

  /* ---------- Danh sách ---------- */
  function fileHopLe(f) { return typeof f === 'string' && /^[^\/\\]+\.pdf$/i.test(f) && f.indexOf('..') === -1; }
  function linkHopLe(s) { return /^https?:\/\/[^\s"'<>]+$/i.test(String(s || '').trim()); }

  /* "NHA_GIA-KIM.pdf" -> "Nha gia kim"; "NHÀ GIẢ KIM.pdf" -> "Nhà giả kim" */
  function tenTuFile(f) {
    var t = String(f || '').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (t && t === t.toUpperCase() && /[A-ZÀ-Ỹ]/.test(t)) {
      t = t.toLocaleLowerCase('vi');
      t = t.charAt(0).toLocaleUpperCase('vi') + t.slice(1);
    }
    return t;
  }

  function chuanHoa(ds) {
    var daCo = {};
    return (Array.isArray(ds) ? ds : []).map(function (m) {
      if (typeof m === 'string') m = { file: m };
      if (!m || typeof m !== 'object') return null;
      var file = fileHopLe(m.file) ? m.file : '';
      var link = linkHopLe(m.link) ? String(m.link).trim() : '';
      if (!file && !link) return null;
      var id = file || link;
      if (daCo[id]) return null;
      daCo[id] = 1;
      return {
        id: id,
        file: file,
        link: link,
        coTen: !!m.ten,
        coTacGia: !!m.tacGia,
        ten: String(m.ten || tenTuFile(file) || 'Chưa đặt tên').slice(0, 150),
        tacGia: String(m.tacGia || '').slice(0, 120),
        theLoai: THE_LOAI[m.theLoai] ? m.theLoai : '',
        moTa: String(m.moTa || '').slice(0, 800)
      };
    }).filter(Boolean);
  }

  var DS = chuanHoa(window.KE_SACH);
  function timSach(id) { return DS.filter(function (s) { return s.id === id; })[0] || null; }
  function duongDan(s) { return s.file ? THU_MUC + encodeURIComponent(s.file) : s.link; }
  function linkDoc(s) { return 'xem-sach.html?file=' + encodeURIComponent(s.file); }

  /* ---------- Bìa tự vẽ ---------- */
  var BANG_MAU = [
    ['#d97706', '#7c2d12'], ['#0f766e', '#134e4a'], ['#2563eb', '#1e3a8a'], ['#9333ea', '#4c1d95'],
    ['#db2777', '#831843'], ['#65a30d', '#365314'], ['#475569', '#0f172a'], ['#b45309', '#451a03']
  ];
  function bam(s) {
    var h = 0; s = String(s || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function htmlBia(s, w) {
    var tl = THE_LOAI[s.theLoai];
    var m = tl ? [tl.mau1, tl.mau2] : BANG_MAU[bam(s.ten) % BANG_MAU.length];
    return '<span class="cover my-cover" data-genre="' + esc(s.theLoai || 'khac') + '" aria-hidden="true" style="--c1:' + m[0] + ';--c2:' + m[1] + (w ? ';--cw:' + w + 'px' : '') + '">' +
      '<span class="cover-icon">' + (tl ? tl.bieuTuong : (s.file ? '📕' : '🔗')) + '</span>' +
      '<span class="cover-title' + (s.ten.length > 38 ? ' long' : '') + '">' + esc(s.ten) + '</span>' +
      '<span class="cover-rule"></span>' +
      '<span class="cover-author">' + esc(s.tacGia) + '</span>' +
    '</span>';
  }
  /* Bìa bằng ảnh trang đầu của PDF */
  function htmlBiaAnh(anh) {
    return '<span class="cover pdf-cover" aria-hidden="true"><img src="' + esc(anh) + '" alt="" loading="lazy"></span>';
  }

  /* ---------- Mật khẩu ---------- */
  var ma = typeof window.KE_SACH_MAT_KHAU === 'string' ? window.KE_SACH_MAT_KHAU.trim().toLowerCase() : '';
  var MA_MAT_KHAU = /^[0-9a-f]{64}$/.test(ma) ? ma : '';
  var boNhoMoKhoa = '';
  function daMoKhoa() {
    if (!MA_MAT_KHAU) return true;
    return docLS(KHOA_MO, '') === MA_MAT_KHAU || boNhoMoKhoa === MA_MAT_KHAU;
  }
  function thuMoKhoa(matKhau) {
    var h = window.bearSha256 ? window.bearSha256(matKhau) : '';
    if (h && h === MA_MAT_KHAU) { ghiLS(KHOA_MO, h); boNhoMoKhoa = h; return true; }
    return false;
  }

  /* ---------- Tiến độ đọc (lưu trên thiết bị) ---------- */
  var docToi = docLS(KHOA_DOC_TOI, {}); if (!docToi || typeof docToi !== 'object') docToi = {};
  var trang = docLS(KHOA_TRANG, {}); if (!trang || typeof trang !== 'object') trang = {};
  function layDocToi(id) { return docToi[id] || ''; }
  function datDocToi(id, v) {
    v = String(v || '').trim().slice(0, 80);
    if (v) docToi[id] = v; else delete docToi[id];
    ghiLS(KHOA_DOC_TOI, docToi);
  }
  function layTrang(id) { var t = Number(trang[id]); return t > 0 ? Math.floor(t) : 0; }
  function datTrang(id, so) {
    trang[id] = so; ghiLS(KHOA_TRANG, trang);
    datDocToi(id, 'trang ' + so);
  }

  /* Dung lượng dễ đọc: dưới 1 MB thì ghi KB */
  function soMB(byte) {
    if (!byte) return '';
    if (byte < 1048576) return Math.max(1, Math.round(byte / 1024)) + ' KB';
    return (Math.round(byte / 1048576 * 10) / 10).toString().replace('.', ',') + ' MB';
  }

  window.BearKeSach = {
    ds: DS,
    timSach: timSach,
    duongDan: duongDan,
    linkDoc: linkDoc,
    htmlBia: htmlBia,
    htmlBiaAnh: htmlBiaAnh,
    coMatKhau: !!MA_MAT_KHAU,
    daMoKhoa: daMoKhoa,
    thuMoKhoa: thuMoKhoa,
    layDocToi: layDocToi,
    datDocToi: datDocToi,
    layTrang: layTrang,
    datTrang: datTrang,
    soMB: soMB,
    esc: esc
  };
})();
