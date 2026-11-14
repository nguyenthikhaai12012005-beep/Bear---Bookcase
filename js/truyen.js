/* =============================================================
 * BEAR BOOKCASE — PHẦN CHUNG CHO TRUYỆN ĐỌC TRÊN WEB
 * Dùng ở cả index.html (mục "Đọc truyện", "Đang đọc dở") và doc.html.
 *
 * Cấu trúc thư mục:
 *   truyen/danh-sach.json            ["ten-thu-muc-1", "ten-thu-muc-2"]
 *   truyen/<ten-thu-muc>/info.json   thông tin truyện + danh sách chương
 *   truyen/<ten-thu-muc>/chuong-1.md nội dung từng chương
 * ============================================================= */
(function () {
  'use strict';

  var KHOA_TIEN_DO = 'bearBookcase.docTruyen';
  var THU_MUC = 'truyen/';

  /* Tải file bằng XMLHttpRequest (hỗ trợ rộng hơn fetch, kể cả một số trường hợp mở file trực tiếp) */
  function taiText(url, xong) {
    var daXong = false;
    function ketThuc(loi, noiDung) { if (!daXong) { daXong = true; xong(loi, noiDung); } }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      if (xhr.overrideMimeType) xhr.overrideMimeType('text/plain; charset=utf-8');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        // Khi mở bằng file://, trình duyệt trả status 0 nếu đọc được
        if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) ketThuc(null, xhr.responseText);
        else ketThuc(new Error('HTTP ' + xhr.status));
      };
      xhr.onerror = function () { ketThuc(new Error('Không tải được ' + url)); };
      xhr.send();
    } catch (e) { ketThuc(e); }
  }

  function taiJSON(url, xong) {
    taiText(url, function (loi, txt) {
      if (loi) return xong(loi);
      try { xong(null, JSON.parse(txt.replace(/^﻿/, ''))); }
      catch (e) { xong(new Error('JSON không hợp lệ: ' + url)); }
    });
  }

  /* Tên thư mục chỉ gồm chữ thường không dấu, số và gạch ngang (chặn đường dẫn lạ) */
  function idHopLe(id) { return typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,80}$/.test(id); }

  /* Chuẩn hóa info.json: danh sách chương có thể là chuỗi hoặc { file, ten } */
  function chuanHoaInfo(id, info) {
    info = info && typeof info === 'object' ? info : {};
    var ds = Array.isArray(info.chuong) ? info.chuong : [];
    var chuong = ds.map(function (c, i) {
      if (typeof c === 'string') c = { ten: c };
      c = c || {};
      var file = typeof c.file === 'string' && /^[A-Za-z0-9._-]+\.md$/.test(c.file) ? c.file : 'chuong-' + (i + 1) + '.md';
      return { so: i + 1, ten: String(c.ten || ('Chương ' + (i + 1))), file: file };
    });
    return {
      id: id,
      ten: String(info.ten || id),
      tacGia: String(info.tacGia || ''),
      theLoai: String(info.theLoai || ''),
      moTa: String(info.moTa || ''),
      sachId: typeof info.sachId === 'string' ? info.sachId : '',
      chuong: chuong
    };
  }

  function taiInfo(id, xong) {
    if (!idHopLe(id)) return xong(new Error('Tên truyện không hợp lệ'));
    taiJSON(THU_MUC + id + '/info.json', function (loi, info) {
      if (loi) return xong(loi);
      xong(null, chuanHoaInfo(id, info));
    });
  }

  /* Tải danh sách tất cả truyện (bỏ qua truyện lỗi, không làm hỏng cả danh sách) */
  function taiDanhSach(xong) {
    taiJSON(THU_MUC + 'danh-sach.json', function (loi, ds) {
      if (loi) return xong(loi, []);
      ds = (Array.isArray(ds) ? ds : []).filter(idHopLe);
      if (!ds.length) return xong(null, []);
      var ketQua = new Array(ds.length), con = ds.length;
      ds.forEach(function (id, i) {
        taiInfo(id, function (l, info) {
          ketQua[i] = l ? null : info;
          if (--con === 0) xong(null, ketQua.filter(Boolean));
        });
      });
    });
  }

  function taiChuong(truyen, so, xong) {
    var c = truyen.chuong[so - 1];
    if (!c) return xong(new Error('Không có chương này'));
    taiText(THU_MUC + truyen.id + '/' + c.file, xong);
  }

  /* ---------- Tiến độ đọc (localStorage, có thể bị chặn) ---------- */
  function docTatCaTienDo() {
    try {
      var v = JSON.parse(window.localStorage.getItem(KHOA_TIEN_DO));
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) { return {}; }
  }
  var boNhoTam = null; // dùng khi localStorage bị chặn: vẫn nhớ trong phiên hiện tại
  function tatCa() {
    var v = docTatCaTienDo();
    if (boNhoTam) { for (var k in boNhoTam) if (!v[k]) v[k] = boNhoTam[k]; }
    return v;
  }
  function layTienDo(id) {
    var v = tatCa()[id];
    return v && typeof v.chuong === 'number' ? v : null;
  }
  function ghiTienDo(id, duLieu) {
    var all = tatCa();
    all[id] = duLieu;
    boNhoTam = boNhoTam || {};
    boNhoTam[id] = duLieu;
    try { window.localStorage.setItem(KHOA_TIEN_DO, JSON.stringify(all)); } catch (e) { /* bỏ qua */ }
  }
  /* Các truyện đang đọc dở (chưa xong), mới nhất lên trước */
  function dangDocDo() {
    var all = tatCa();
    return Object.keys(all).filter(function (id) {
      var v = all[id];
      return idHopLe(id) && v && typeof v.chuong === 'number' && !v.xong;
    }).map(function (id) {
      var v = all[id]; v.id = id; return v;
    }).sort(function (a, b) { return (b.luc || 0) - (a.luc || 0); });
  }

  function linkDoc(id, so, tiep) {
    return 'doc.html?truyen=' + encodeURIComponent(id) +
      (so ? '&chuong=' + so : '') + (tiep ? '&tiep=1' : '');
  }

  window.BearTruyen = {
    taiJSON: taiJSON,
    taiDanhSach: taiDanhSach,
    taiInfo: taiInfo,
    taiChuong: taiChuong,
    layTienDo: layTienDo,
    ghiTienDo: ghiTienDo,
    dangDocDo: dangDocDo,
    linkDoc: linkDoc,
    idHopLe: idHopLe,
    moFileTrucTiep: location.protocol === 'file:'
  };
})();
