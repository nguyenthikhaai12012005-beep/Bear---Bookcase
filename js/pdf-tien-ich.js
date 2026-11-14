/* =============================================================
 * BEAR BOOKCASE — TIỆN ÍCH PDF (dùng PDF.js)
 *  - Tạo ảnh bìa từ trang đầu file PDF, đếm số trang, đọc tiêu đề/tác giả trong file
 *  - Dùng chung cho trang chủ (Kệ sách) và trang đọc xem-sach.html
 * Chỉ chạy khi trang mở qua web (http/https). Khi mở trực tiếp file://,
 * trình duyệt chặn đọc file PDF nên các tính năng này tự tắt.
 * ============================================================= */
(function () {
  'use strict';

  var PHIEN_BAN = '3.11.174';
  var URL_THU_VIEN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PHIEN_BAN + '/pdf.min.js';
  var URL_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PHIEN_BAN + '/pdf.worker.min.js';
  var KHOA_INFO = 'bearBookcase.pdfInfo';
  var KHOA_BIA = 'bearBookcase.pdfBia.';
  var coThe = /^https?:$/.test(location.protocol);

  /* ---------- Nạp thư viện PDF.js khi cần ---------- */
  var dangNap = false, hangCho = [];
  function napThuVien(xong) {
    if (window.pdfjsLib) return xong(null, window.pdfjsLib);
    if (!coThe) return xong(new Error('Không đọc được PDF khi mở trực tiếp từ máy'));
    hangCho.push(xong);
    if (dangNap) return;
    dangNap = true;
    var s = document.createElement('script');
    s.src = URL_THU_VIEN;
    s.async = true;
    s.onload = function () {
      var lib = window.pdfjsLib;
      if (lib) lib.GlobalWorkerOptions.workerSrc = URL_WORKER;
      ketThuc(lib ? null : new Error('Thư viện PDF không hợp lệ'), lib);
    };
    s.onerror = function () { ketThuc(new Error('Không tải được thư viện đọc PDF (kiểm tra kết nối mạng)')); };
    document.head.appendChild(s);
    function ketThuc(loi, lib) {
      dangNap = false;
      if (loi && s.parentNode) s.parentNode.removeChild(s);
      var ds = hangCho; hangCho = [];
      ds.forEach(function (f) { f(loi, lib); });
    }
  }

  function moTaiLieu(url, xong) {
    napThuVien(function (loi, lib) {
      if (loi) return xong(loi);
      try {
        lib.getDocument({ url: url, isEvalSupported: false, disableAutoFetch: true }).promise
          .then(function (pdf) { xong(null, pdf); }, function (e) { xong(e || new Error('Không mở được PDF')); });
      } catch (e) { xong(e); }
    });
  }

  /* ---------- Bộ nhớ đệm: thông tin (lâu dài) + ảnh bìa (trong phiên) ---------- */
  var boNhoInfo = (function () { try { return JSON.parse(localStorage.getItem(KHOA_INFO) || '{}') || {}; } catch (e) { return {}; } })();
  function luuInfo(url, info) {
    boNhoInfo[url] = info;
    try { localStorage.setItem(KHOA_INFO, JSON.stringify(boNhoInfo)); } catch (e) { /* bỏ qua */ }
  }
  var boNhoBia = {};
  function layBiaDaLuu(url) {
    if (boNhoBia[url]) return boNhoBia[url];
    try { return sessionStorage.getItem(KHOA_BIA + url) || ''; } catch (e) { return ''; }
  }
  function luuBia(url, anh) {
    boNhoBia[url] = anh;
    try { sessionStorage.setItem(KHOA_BIA + url, anh); } catch (e) { /* bộ nhớ đầy: chỉ giữ trong trang */ }
  }

  /* Làm sạch tiêu đề/tác giả lấy từ file (nhiều file ghi "Microsoft Word - abc.docx"...) */
  function lamSach(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (!s || s.length > 200) return '';
    if (/^(microsoft word|untitled|unknown|document|tài liệu)\b/i.test(s) || /\.(docx?|pdf|indd|tmp)$/i.test(s)) return '';
    return s;
  }

  /* ---------- Hàng đợi: tối đa 2 file xử lý cùng lúc ---------- */
  var dangChay = 0, hang = [];
  function chayTiep() {
    while (dangChay < 2 && hang.length) {
      var viec = hang.shift();
      dangChay++;
      viec(function () { dangChay--; chayTiep(); });
    }
  }

  var dangLay = {}; // url -> danh sách callback đang chờ
  /* Lấy thông tin + ảnh bìa trang 1. xong(loi, { soTrang, kichThuoc, tieuDe, tacGia, bia }) */
  function layThongTin(url, rongBia, xong) {
    var info = boNhoInfo[url], bia = layBiaDaLuu(url);
    if (info && bia) return xong(null, gop(info, bia));
    if (!coThe) return xong(new Error('file://'));
    if (dangLay[url]) { dangLay[url].push(xong); return; }
    dangLay[url] = [xong];
    hang.push(function (xongViec) {
      moTaiLieu(url, function (loi, pdf) {
        if (loi) { traVe(loi); return xongViec(); }
        var kq = { soTrang: pdf.numPages, kichThuoc: 0, tieuDe: '', tacGia: '' };
        Promise.all([
          pdf.getMetadata().then(function (m) {
            var i = (m && m.info) || {};
            kq.tieuDe = lamSach(i.Title); kq.tacGia = lamSach(i.Author);
          }, function () { /* bỏ qua */ }),
          pdf.getDownloadInfo().then(function (d) { kq.kichThuoc = (d && d.length) || 0; }, function () { /* bỏ qua */ }),
          pdf.getPage(1).then(function (trang) {
            var vp1 = trang.getViewport({ scale: 1 });
            var vp = trang.getViewport({ scale: (rongBia || 300) / vp1.width });
            var c = document.createElement('canvas');
            c.width = Math.round(vp.width); c.height = Math.round(vp.height);
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
            return trang.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
              kq.bia = c.toDataURL('image/jpeg', 0.82);
            });
          })
        ]).then(function () {
          luuInfo(url, { soTrang: kq.soTrang, kichThuoc: kq.kichThuoc, tieuDe: kq.tieuDe, tacGia: kq.tacGia });
          if (kq.bia) luuBia(url, kq.bia);
          traVe(null, kq);
        }, function (e) { traVe(e || new Error('Không đọc được PDF')); })
          .then(function () { try { pdf.destroy(); } catch (e) { /* bỏ qua */ } xongViec(); });
      });
    });
    chayTiep();
    function traVe(loi, kq) {
      var ds = dangLay[url] || []; delete dangLay[url];
      ds.forEach(function (f) { f(loi, kq); });
    }
  }
  function gop(info, bia) {
    return { soTrang: info.soTrang, kichThuoc: info.kichThuoc, tieuDe: info.tieuDe, tacGia: info.tacGia, bia: bia };
  }
  /* Thông tin đã biết (không tải gì thêm) */
  function thongTinDaBiet(url) {
    var i = boNhoInfo[url];
    return i ? gop(i, layBiaDaLuu(url)) : null;
  }

  window.BearPDF = {
    coThe: coThe,
    napThuVien: napThuVien,
    moTaiLieu: moTaiLieu,
    layThongTin: layThongTin,
    thongTinDaBiet: thongTinDaBiet
  };
})();
