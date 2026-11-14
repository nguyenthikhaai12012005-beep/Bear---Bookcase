/* =============================================================
 * BEAR BOOKCASE — LOGIC GIAO DIỆN
 * Dữ liệu lấy từ js/data.js (THE_LOAI, DANH_SACH_SACH).
 * ============================================================= */
(function () {
  'use strict';

  var THE_LOAI = window.THE_LOAI || {};
  var SACH = window.DANH_SACH_SACH || [];
  var BT = window.BearTruyen || null;      // phần truyện đọc trên web (js/truyen.js)
  var truyenTheoSach = {};                 // sachId -> thư mục truyện có bản đọc
  var DO_DAI = { 'Ngắn': 'ngan', 'Vừa': 'vua', 'Dài': 'dai' }; // nhãn -> tên class
  var KHOA_YEU_THICH = 'bearBookcase.yeuThich';
  var KHOA_DOC_SACH = 'bearBookcase.docSach';
  var KHOA_GIAO_DIEN = 'bearBookcase.giaoDien';

  var TRANG_THAI_DOC = {
    'muon-doc': { ten: 'Muốn đọc', icon: '🔖' },
    'dang-doc': { ten: 'Đang đọc', icon: '📖' },
    'da-doc':   { ten: 'Đã đọc xong', icon: '✓' }
  };

  /* ---------- Lưu trữ an toàn: localStorage hỏng/bị chặn thì vẫn chạy (chỉ không nhớ) ---------- */
  var luuTru = {
    doc: function (khoa) {
      try { return window.localStorage.getItem(khoa); } catch (e) { return null; }
    },
    ghi: function (khoa, giaTri) {
      try { window.localStorage.setItem(khoa, giaTri); } catch (e) { /* bỏ qua */ }
    },
    docJSON: function (khoa, macDinh) {
      try {
        var v = JSON.parse(this.doc(khoa));
        return v == null ? macDinh : v;
      } catch (e) { return macDinh; }
    }
  };

  /* ---------- Tiện ích ---------- */
  // Giữ lại mọi chữ cái/số của mọi ngôn ngữ (để tìm được cả tên gốc tiếng Nhật, Hàn, Trung).
  // Trình duyệt cũ không hỗ trợ \p{...} thì dùng biểu thức dự phòng thay vì làm hỏng cả trang.
  var RE_KY_TU_KHAC;
  try { RE_KY_TU_KHAC = new RegExp('[^\\p{L}\\p{M}\\p{N}\\s]', 'gu'); }
  catch (e) { RE_KY_TU_KHAC = /[^a-z0-9\sÀ-￿]/g; }

  function boDau(chuoi) {
    var s = String(chuoi || '');
    if (s.normalize) s = s.normalize('NFD');
    return s
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(RE_KY_TU_KHAC, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------- Năm xuất bản: số, chuỗi ("Thế kỷ 16") hoặc null ---------- */
  function coNam(s) {
    return typeof s.namXuatBan === 'number' ||
      (typeof s.namXuatBan === 'string' && s.namXuatBan.trim() !== '');
  }
  function hienThiNam(s) {
    return coNam(s) ? String(s.namXuatBan).trim() : '';
  }
  // Quy năm về một con số để sắp xếp; trả về null nếu không xác định được
  function namSapXep(s) {
    var n = s.namXuatBan;
    if (typeof n === 'number' && isFinite(n)) return n;
    if (typeof n !== 'string') return null;
    var chuoi = boDau(n);
    var m4 = chuoi.match(/\b(\d{3,4})\b/);
    if (m4) return Number(m4[1]);
    var mk = chuoi.match(/the ky (\d{1,2})/);
    if (mk) {
      var goc = (Number(mk[1]) - 1) * 100;
      if (/dau/.test(chuoi)) return goc + 10;
      if (/cuoi/.test(chuoi)) return goc + 90;
      return goc + 50;
    }
    return null;
  }

  function esc(chuoi) {
    return String(chuoi == null ? '' : chuoi).replace(/[&<>"']/g, function (k) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[k];
    });
  }

  function $(id) { return document.getElementById(id); }

  /* Chuẩn bị sẵn thể loại và chuỗi tìm kiếm cho từng cuốn */
  SACH.forEach(function (s) {
    var tl = Array.isArray(s.theLoai) ? s.theLoai : [s.theLoai];
    s._theLoai = tl.filter(function (k) { return THE_LOAI[k]; });
    s._timKiem = boDau([s.tenSach, s.tenGoc, s.tacGia].join(' '));
  });
  var THEO_ID = {};
  SACH.forEach(function (s, i) { THEO_ID[s.id] = s; s._thuTu = i; s._namSX = namSapXep(s); });

  /* ---------- Trạng thái bộ lọc ---------- */
  var trangThai = {
    theLoai: 'tat-ca',
    tuKhoa: '',
    chiHot: false,
    chiYeuThich: false,
    trangThaiDoc: '',
    sapXep: 'mac-dinh',
    tags: []
  };

  /* ---------- Yêu thích ---------- */
  var yeuThich = (function () {
    var mang = luuTru.docJSON(KHOA_YEU_THICH, []);
    return Array.isArray(mang) ? mang.filter(function (id) { return THEO_ID[id]; }) : [];
  })();

  function laYeuThich(id) { return yeuThich.indexOf(id) !== -1; }

  function doiYeuThich(id) {
    var i = yeuThich.indexOf(id);
    if (i === -1) yeuThich.push(id); else yeuThich.splice(i, 1);
    luuTru.ghi(KHOA_YEU_THICH, JSON.stringify(yeuThich));
    return i === -1;
  }

  /* ---------- Trạng thái đọc: { id: { s: 'dang-doc', viTri: '...', ghiChu: '...', luc: 123 } } ---------- */
  var docSach = (function () {
    var obj = luuTru.docJSON(KHOA_DOC_SACH, {});
    var sach = {};
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(function (id) {
        var v = obj[id];
        if (THEO_ID[id] && v && TRANG_THAI_DOC[v.s]) {
          sach[id] = {
            s: v.s,
            viTri: String(v.viTri || '').slice(0, 80),
            ghiChu: String(v.ghiChu || '').slice(0, 200),
            luc: Number(v.luc) || 0
          };
        }
      });
    }
    return sach;
  })();

  function layDoc(id) { return docSach[id] || null; }

  function luuDocSach() { luuTru.ghi(KHOA_DOC_SACH, JSON.stringify(docSach)); }

  function datTrangThaiDoc(id, s) {
    var cu = docSach[id];
    if (!s) {
      delete docSach[id];
    } else {
      docSach[id] = { s: s, viTri: cu ? cu.viTri : '', ghiChu: cu ? cu.ghiChu : '', luc: Date.now() };
    }
    luuDocSach();
  }

  function capNhatViTri(id, truong, giaTri) {
    if (!docSach[id]) return;
    docSach[id][truong] = giaTri;
    docSach[id].luc = Date.now();
    luuDocSach();
  }

  /* ---------- Phần tử DOM ---------- */
  var el = {
    grid: $('ket-qua'),
    search: $('search-input'),
    searchClear: $('search-clear'),
    catChips: $('category-chips'),
    statusChips: $('status-chips'),
    hotToggle: $('hot-toggle'),
    hotCount: $('hot-count'),
    favToggle: $('fav-toggle'),
    favCount: $('fav-count'),
    randomBtn: $('random-btn'),
    tagFilter: $('tag-filter'),
    tagChips: $('tag-chips'),
    tagActive: $('tag-active-count'),
    resultInfo: $('result-info'),
    resetBtn: $('reset-btn'),
    sortSelect: $('sort-select'),
    catNote: $('category-note'),
    empty: $('empty-state'),
    emptyTitle: $('empty-title'),
    emptyText: $('empty-text'),
    emptyReset: $('empty-reset'),
    stories: $('doc-truyen'),
    storyList: $('story-list'),
    storyNote: $('story-note'),
    reading: $('dang-doc-do'),
    readingList: $('reading-list'),
    readingCount: $('reading-count'),
    dialog: $('detail'),
    dialogContent: $('detail-content'),
    dialogClose: $('detail-close'),
    themeToggle: $('theme-toggle')
  };

  /* ---------- Biểu tượng ---------- */
  var ICON_TIM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.8 4.5c2.1 0 3.6 1.2 4.4 2.6.2.3.4.3.6 0 .8-1.4 2.3-2.6 4.4-2.6 3.5 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';

  /* ---------- Bìa sách ---------- */
  function styleMau(sach) {
    var a = THE_LOAI[sach._theLoai[0]] || { mau1: '#777', mau2: '#333' };
    var b = sach._theLoai[1] ? THE_LOAI[sach._theLoai[1]] : null;
    return '--c1:' + a.mau1 + ';--c2:' + (b ? b.mau2 : a.mau2);
  }

  function htmlRibbon(sach) {
    var d = layDoc(sach.id);
    if (!d) return '';
    return '<span class="ribbon ribbon-' + d.s + '" title="' + esc(TRANG_THAI_DOC[d.s].ten) + '">' +
      TRANG_THAI_DOC[d.s].icon + '</span>';
  }

  function htmlBia(sach) {
    var dai = sach.tenSach.length > 38 ? ' long' : '';
    var icons = sach._theLoai.map(function (k) { return THE_LOAI[k].bieuTuong; }).join('');
    return '<div class="cover" data-genre="' + esc(sach._theLoai[0]) + '" aria-hidden="true">' +
      htmlRibbon(sach) +
      '<span class="cover-icon">' + icons + '</span>' +
      '<span class="cover-title' + dai + '">' + esc(sach.tenSach) + '</span>' +
      '<span class="cover-rule"></span>' +
      '<span class="cover-author">' + esc(sach.tacGia) + '</span>' +
      '</div>';
  }

  function htmlPillTheLoai(sach, ngan) {
    return sach._theLoai.map(function (k) {
      var tl = THE_LOAI[k];
      return '<span class="pill pill-genre" style="--dot:' + tl.mau1 + '">' + esc(ngan ? tl.tenNgan : tl.ten) + '</span>';
    }).join('');
  }

  function htmlDoSo(muc) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<span' + (i > muc ? ' class="off"' : '') + '>👻</span>';
    return '<span class="scare"><span class="visually-hidden">Độ sợ ' + muc + ' trên 5</span>' +
      '<span aria-hidden="true">Độ sợ <span class="scare-ghosts">' + s + '</span></span></span>';
  }

  function htmlDongDoc(sach) {
    var d = layDoc(sach.id);
    if (!d) return '';
    var html = '<p class="card-status status-' + d.s + '"><span class="status-dot" aria-hidden="true"></span>' +
      esc(TRANG_THAI_DOC[d.s].ten) + '</p>';
    if (d.s === 'dang-doc' && d.viTri) {
      html += '<p class="card-progress">Đang đọc tới: <strong>' + esc(d.viTri) + '</strong></p>';
    }
    return html;
  }

  /* ---------- Thẻ sách ---------- */
  function htmlThe(sach) {
    var tim = laYeuThich(sach.id);
    var phu = '';
    if (sach.mucDoSo) phu += htmlDoSo(sach.mucDoSo);
    if (sach.tinhTrang) phu += '<span class="pill">' + esc(sach.tinhTrang) + '</span>';
    if (sach.tong) phu += '<span class="pill">' + esc(sach.tong) + '</span>';

    return '<article class="card" data-id="' + esc(sach.id) + '">' +
      '<div class="card-cover" style="' + styleMau(sach) + '">' +
        htmlBia(sach) +
        (sach.hot5Nam ? '<span class="badge-hot">🔥 Hot</span>' : '') +
      '</div>' +
      '<div class="card-body">' +
        '<h3 class="card-title"><button class="card-open" type="button" data-open="' + esc(sach.id) + '">' + esc(sach.tenSach) + '</button></h3>' +
        '<p class="card-author">' + esc(sach.tacGia) + '</p>' +
        htmlDongDoc(sach) +
        '<div class="card-meta">' + htmlPillTheLoai(sach, true) +
          (coNam(sach) ? '<span class="pill pill-year">' + esc(hienThiNam(sach)) + '</span>' : '') +
        '</div>' +
        '<p class="card-desc">' + esc(sach.moTaNgan) + '</p>' +
        (phu ? '<div class="card-meta">' + phu + '</div>' : '') +
      '</div>' +
      '<button class="fav-btn" type="button" data-fav="' + esc(sach.id) + '" aria-pressed="' + tim + '" ' +
        'aria-label="' + (tim ? 'Bỏ yêu thích: ' : 'Yêu thích: ') + esc(sach.tenSach) + '">' + ICON_TIM + '</button>' +
    '</article>';
  }

  /* ---------- Lọc ---------- */
  function khopTheLoai(s) {
    return trangThai.theLoai === 'tat-ca' || s._theLoai.indexOf(trangThai.theLoai) !== -1;
  }
  function khopTuKhoa(s) {
    var tu = boDau(trangThai.tuKhoa);
    if (!tu) return true;
    return tu.split(' ').every(function (t) { return s._timKiem.indexOf(t) !== -1; });
  }
  function khopTags(s) {
    return trangThai.tags.every(function (t) { return s.tags.indexOf(t) !== -1; });
  }
  function khopTrangThaiDoc(s) {
    if (!trangThai.trangThaiDoc) return true;
    var d = layDoc(s.id);
    return !!d && d.s === trangThai.trangThaiDoc;
  }
  function locSach() {
    var ds = SACH.filter(function (s) {
      return khopTheLoai(s) &&
        (!trangThai.chiHot || s.hot5Nam) &&
        (!trangThai.chiYeuThich || laYeuThich(s.id)) &&
        khopTrangThaiDoc(s) &&
        khopTags(s) &&
        khopTuKhoa(s);
    });
    return sapXep(ds);
  }

  /* Sắp xếp: sách không rõ năm (null) luôn nằm cuối; hòa thì giữ thứ tự gốc */
  function sapXep(ds) {
    var kieu = trangThai.sapXep;
    if (kieu === 'mac-dinh') return ds;
    return ds.slice().sort(function (a, b) {
      var kq = 0;
      if (kieu === 'ten') {
        kq = a.tenSach.localeCompare(b.tenSach, 'vi', { sensitivity: 'base' });
      } else {
        var na = a._namSX, nb = b._namSX;
        if (na === null && nb !== null) return 1;
        if (nb === null && na !== null) return -1;
        if (na !== null && nb !== null) kq = kieu === 'moi-nhat' ? nb - na : na - nb;
      }
      return kq || (a._thuTu - b._thuTu);
    });
  }

  /* ---------- Chip thể loại ---------- */
  function veChipTheLoai() {
    var html = '<button class="chip" type="button" data-cat="tat-ca" aria-pressed="' + (trangThai.theLoai === 'tat-ca') + '">' +
      'Tất cả <span class="count">' + SACH.length + '</span></button>';
    Object.keys(THE_LOAI).forEach(function (k) {
      var tl = THE_LOAI[k];
      var dem = SACH.filter(function (s) { return s._theLoai.indexOf(k) !== -1; }).length;
      html += '<button class="chip" type="button" data-cat="' + k + '" title="' + esc(tl.ten) + '" aria-pressed="' + (trangThai.theLoai === k) + '">' +
        '<span class="dot" style="--dot:' + tl.mau1 + '"></span>' + esc(tl.tenNgan) +
        ' <span class="count">' + dem + '</span></button>';
    });
    el.catChips.innerHTML = html;
  }

  /* ---------- Chip trạng thái đọc ---------- */
  function veChipTrangThai() {
    var dem = { 'muon-doc': 0, 'dang-doc': 0, 'da-doc': 0 };
    Object.keys(docSach).forEach(function (id) { dem[docSach[id].s]++; });
    el.statusChips.innerHTML = Object.keys(TRANG_THAI_DOC).map(function (k) {
      return '<button class="chip status-chip status-' + k + '" type="button" data-status="' + k + '" aria-pressed="' + (trangThai.trangThaiDoc === k) + '">' +
        '<span class="status-dot" aria-hidden="true"></span>' + TRANG_THAI_DOC[k].ten +
        ' <span class="count">' + dem[k] + '</span></button>';
    }).join('');
  }

  /* ---------- Chip tags (chỉ những tag có trong thể loại đang chọn) ---------- */
  function demTagTheoTheLoai() {
    var dem = {};
    SACH.forEach(function (s) {
      if (!khopTheLoai(s)) return;
      s.tags.forEach(function (t) { dem[t] = (dem[t] || 0) + 1; });
    });
    return dem;
  }

  // Bỏ các tag đã chọn nhưng không có trong thể loại hiện tại (phải chạy TRƯỚC khi lọc)
  function donTagKhongHopLe() {
    var dem = demTagTheoTheLoai();
    trangThai.tags = trangThai.tags.filter(function (t) { return dem[t]; });
  }

  function veChipTags() {
    var dem = demTagTheoTheLoai();

    var ds = Object.keys(dem).sort(function (a, b) {
      return (dem[b] - dem[a]) || a.localeCompare(b, 'vi');
    });
    el.tagChips.innerHTML = ds.map(function (t) {
      var bat = trangThai.tags.indexOf(t) !== -1;
      return '<button class="chip" type="button" data-tag="' + esc(t) + '" aria-pressed="' + bat + '">' +
        esc(t) + ' <span class="count">' + dem[t] + '</span></button>';
    }).join('');
    el.tagActive.hidden = trangThai.tags.length === 0;
    el.tagActive.textContent = trangThai.tags.length;
  }

  /* ---------- Khu "Đang đọc dở" ---------- */
  function htmlTruyenDangDoc(t) {
    var phanTram = Math.round(Math.max(0, Math.min(1, Number(t.viTri) || 0)) * 100);
    return '<a class="reading-item" href="' + esc(BT.linkDoc(t.id, t.chuong, true)) + '">' +
      '<span class="mini-cover mini-story" aria-hidden="true">📖</span>' +
      '<span class="reading-text">' +
        '<span class="reading-title">' + esc(t.ten || t.id) + '</span>' +
        (t.tacGia ? '<span class="reading-author">' + esc(t.tacGia) + '</span>' : '') +
        '<span class="reading-pos">Đang đọc tới: <strong>Chương ' + t.chuong +
          (t.tongChuong ? '/' + t.tongChuong : '') + ' · ' + phanTram + '%</strong></span>' +
        '<span class="reading-cta">Đọc tiếp →</span>' +
      '</span>' +
    '</a>';
  }

  function veDangDocDo() {
    var ds = Object.keys(docSach)
      .filter(function (id) { return docSach[id].s === 'dang-doc'; })
      .sort(function (a, b) { return docSach[b].luc - docSach[a].luc; });
    var truyenDoc = BT ? BT.dangDocDo() : [];
    var tong = ds.length + truyenDoc.length;
    el.reading.hidden = tong === 0;
    el.readingCount.textContent = tong ? tong + (truyenDoc.length ? ' mục' : ' cuốn') : '';
    el.readingList.innerHTML = truyenDoc.map(htmlTruyenDangDoc).join('') + ds.map(function (id) {
      var s = THEO_ID[id], d = docSach[id];
      return '<button class="reading-item" type="button" data-open="' + esc(id) + '">' +
        '<span class="mini-cover" style="' + styleMau(s) + '" aria-hidden="true">' +
          s._theLoai.map(function (k) { return THE_LOAI[k].bieuTuong; }).join('') + '</span>' +
        '<span class="reading-text">' +
          '<span class="reading-title">' + esc(s.tenSach) + '</span>' +
          '<span class="reading-author">' + esc(s.tacGia) + '</span>' +
          '<span class="reading-pos">' + (d.viTri ? 'Đang đọc tới: <strong>' + esc(d.viTri) + '</strong>' : 'Chưa ghi vị trí — bấm để thêm') + '</span>' +
          (d.ghiChu ? '<span class="reading-note">“' + esc(d.ghiChu) + '”</span>' : '') +
        '</span>' +
      '</button>';
    }).join('');
  }

  /* ---------- Vẽ lại toàn bộ ---------- */
  function veLai() {
    donTagKhongHopLe();
    var ketQua = locSach();
    el.grid.innerHTML = ketQua.map(htmlThe).join('');

    Array.prototype.forEach.call(el.catChips.querySelectorAll('[data-cat]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === trangThai.theLoai));
    });
    el.hotToggle.setAttribute('aria-pressed', String(trangThai.chiHot));
    el.favToggle.setAttribute('aria-pressed', String(trangThai.chiYeuThich));
    el.hotCount.textContent = SACH.filter(function (s) { return s.hot5Nam && khopTheLoai(s); }).length;
    capNhatDemYeuThich();
    veChipTrangThai();
    veChipTags();
    veDangDocDo();
    el.searchClear.hidden = !trangThai.tuKhoa;

    var coLoc = trangThai.theLoai !== 'tat-ca' || trangThai.tuKhoa || trangThai.chiHot ||
      trangThai.chiYeuThich || trangThai.trangThaiDoc || trangThai.tags.length;
    var moTa = [];
    if (trangThai.theLoai !== 'tat-ca') moTa.push(THE_LOAI[trangThai.theLoai].ten);
    if (trangThai.chiHot) moTa.push('hot 5 năm gần đây');
    if (trangThai.chiYeuThich) moTa.push('sách bạn thích');
    if (trangThai.trangThaiDoc) moTa.push(TRANG_THAI_DOC[trangThai.trangThaiDoc].ten.toLowerCase());
    if (trangThai.tags.length) moTa.push('chủ đề: ' + trangThai.tags.join(', '));
    if (trangThai.tuKhoa) moTa.push('từ khóa “' + trangThai.tuKhoa + '”');
    el.resultInfo.innerHTML = '<strong>' + ketQua.length + '</strong> cuốn' +
      (moTa.length ? ' · ' + esc(moTa.join(' · ')) : ' trong tủ sách');
    el.resetBtn.hidden = !coLoc;

    if (window.BearMenu) window.BearMenu.capNhat();

    // Chú thích riêng của thể loại (vd: tình trạng bách hợp)
    var tlChon = THE_LOAI[trangThai.theLoai];
    el.catNote.hidden = !(tlChon && tlChon.ghiChu);
    el.catNote.textContent = tlChon && tlChon.ghiChu ? tlChon.ghiChu : '';
    if (el.sortSelect.value !== trangThai.sapXep) el.sortSelect.value = trangThai.sapXep;

    el.empty.hidden = ketQua.length > 0;
    if (!ketQua.length) {
      if (trangThai.chiYeuThich && yeuThich.length === 0) {
        el.emptyTitle.textContent = 'Bạn chưa thả tim cuốn nào.';
        el.emptyText.textContent = 'Bấm vào biểu tượng ♥ trên thẻ sách để lưu lại những cuốn bạn muốn đọc.';
      } else if (trangThai.trangThaiDoc && !Object.keys(docSach).some(function (id) { return docSach[id].s === trangThai.trangThaiDoc; })) {
        el.emptyTitle.textContent = 'Chưa có cuốn nào ở trạng thái “' + TRANG_THAI_DOC[trangThai.trangThaiDoc].ten + '”.';
        el.emptyText.textContent = 'Mở một cuốn sách và chọn trạng thái đọc ở phần chi tiết.';
      } else {
        el.emptyTitle.textContent = 'Không tìm thấy cuốn nào phù hợp.';
        el.emptyText.textContent = 'Thử từ khóa khác hoặc bỏ bớt bộ lọc nhé.';
      }
    }
  }

  function capNhatDemYeuThich() {
    el.favCount.textContent = yeuThich.length;
  }

  function datLai() {
    trangThai.theLoai = 'tat-ca';
    trangThai.tuKhoa = '';
    trangThai.chiHot = false;
    trangThai.chiYeuThich = false;
    trangThai.trangThaiDoc = '';
    trangThai.tags = [];
    el.search.value = '';
    veLai();
  }

  /* ---------- Popup chi tiết ---------- */
  var sachDangMo = null;

  function htmlChonTrangThai(s) {
    var d = layDoc(s.id);
    var hienTai = d ? d.s : '';
    var nut = Object.keys(TRANG_THAI_DOC).map(function (k) {
      return '<button class="status-opt status-' + k + '" type="button" data-set-status="' + k + '" aria-pressed="' + (hienTai === k) + '">' +
        '<span class="status-dot" aria-hidden="true"></span>' + TRANG_THAI_DOC[k].ten + '</button>';
    }).join('') +
      '<button class="status-opt status-none" type="button" data-set-status="" aria-pressed="' + (hienTai === '') + '">Bỏ chọn</button>';

    return '<section class="detail-section reading-box">' +
      '<h3 id="status-label">Trạng thái đọc</h3>' +
      '<div class="status-picker" role="group" aria-labelledby="status-label">' + nut + '</div>' +
      '<div class="progress-fields" id="progress-fields"' + (hienTai === 'dang-doc' ? '' : ' hidden') + '>' +
        '<label class="field"><span>Đang đọc tới</span>' +
          '<input id="inp-vitri" type="text" maxlength="80" autocomplete="off" placeholder="vd: trang 120, chương 5…" value="' + esc(d ? d.viTri : '') + '"></label>' +
        '<label class="field"><span>Ghi chú ngắn</span>' +
          '<textarea id="inp-ghichu" maxlength="200" rows="2" placeholder="Điều bạn muốn nhớ về cuốn này…">' + esc(d ? d.ghiChu : '') + '</textarea></label>' +
        '<p class="saved-hint" id="saved-hint" aria-live="polite"></p>' +
      '</div>' +
    '</section>';
  }

  /* Thư mục truyện có bản đọc trên web của cuốn sách (nếu có) */
  function truyenCuaSach(s) {
    if (!BT) return '';
    if (s.docTruyen && BT.idHopLe(s.docTruyen)) return s.docTruyen;
    return truyenTheoSach[s.id] || '';
  }

  /* Link tìm kiếm Google: tên sách + tác giả + "sách" (không trỏ tới trang bán hàng cụ thể) */
  function linkTimSach(s) {
    return 'https://www.google.com/search?q=' + encodeURIComponent(s.tenSach + ' ' + s.tacGia + ' sách');
  }

  /* Các mục giới thiệu chi tiết; mục nào trống thì không hiện */
  function htmlGioiThieuThem(s) {
    var html = '';
    if (typeof s.tomTatDai === 'string' && s.tomTatDai.trim()) {
      html += '<section class="detail-section"><h3>Tóm tắt</h3><p class="detail-summary">' + esc(s.tomTatDai) + '</p></section>';
    }
    var chuDe = Array.isArray(s.chuDe) ? s.chuDe.filter(function (c) { return typeof c === 'string' && c.trim(); }) : [];
    if (chuDe.length) {
      html += '<section class="detail-section"><h3>Chủ đề chính</h3><ul class="theme-list">' +
        chuDe.map(function (c) { return '<li class="pill">' + esc(c) + '</li>'; }).join('') + '</ul></section>';
    }
    var hop = typeof s.hopVoi === 'string' ? s.hopVoi.trim() : '';
    var dai = DO_DAI.hasOwnProperty(s.doDai) ? s.doDai : '';
    if (hop || dai) {
      html += '<div class="detail-duo">' +
        (hop ? '<section class="detail-section"><h3>Hợp với ai</h3><p>' + esc(hop) + '</p></section>' : '') +
        (dai ? '<section class="detail-section"><h3>Độ dài</h3><p><span class="pill pill-length pill-' + DO_DAI[dai] + '">' +
          esc(dai) + '</span></p></section>' : '') +
      '</div>';
    }
    return html;
  }

  function htmlChiTiet(s) {
    var tim = laYeuThich(s.id);
    var facts = [];
    if (coNam(s)) facts.push(['Năm xuất bản', hienThiNam(s)]);
    facts.push(['Thể loại', s._theLoai.map(function (k) { return THE_LOAI[k].tenNgan; }).join(' · ')]);
    if (s.mucDoSo) facts.push(['Độ sợ', s.mucDoSo + '/5 ' + '👻'.repeat(s.mucDoSo)]);
    if (s.tinhTrang) facts.push(['Tình trạng', s.tinhTrang + (s.soTap ? ' · ' + s.soTap : '')]);
    if (s.tong) facts.push(['Tông truyện', s.tong]);
    var ghiChuTL = s._theLoai.map(function (k) { return THE_LOAI[k].ghiChu; }).filter(Boolean)[0];

    return '<div class="detail-head">' +
        '<div class="detail-cover" style="' + styleMau(s) + '">' + htmlBia(s) +
          (s.hot5Nam ? '<span class="badge-hot">🔥 Hot</span>' : '') + '</div>' +
        '<div class="detail-info">' +
          '<h2 id="detail-title">' + esc(s.tenSach) + '</h2>' +
          (s.tenGoc ? '<p class="detail-original">Tên gốc: ' + esc(s.tenGoc) + '</p>' : '') +
          '<p class="detail-author">' + esc(s.tacGia) + '</p>' +
          '<div class="detail-meta">' + htmlPillTheLoai(s, false) +
            (s.hot5Nam ? '<span class="pill pill-hot">🔥 Hot 5 năm gần đây</span>' : '') +
          '</div>' +
          '<div class="detail-links">' +
            '<button class="toggle-btn detail-fav" type="button" data-detail-fav="' + esc(s.id) + '" aria-pressed="' + tim + '">' +
              ICON_TIM + '<span class="lbl">' + (tim ? 'Đã yêu thích' : 'Yêu thích') + '</span></button>' +
            (truyenCuaSach(s) ? '<a class="toggle-btn read-now" href="' + esc(BT.linkDoc(truyenCuaSach(s))) + '">' +
              '<span aria-hidden="true">📖</span> Đọc ngay</a>' : '') +
            '<a class="toggle-btn find-official" href="' + esc(linkTimSach(s)) + '" target="_blank" rel="noopener">' +
              '<span aria-hidden="true">🔎</span> Tìm đọc bản chính thức<span class="visually-hidden"> (mở tab mới)</span></a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      htmlChonTrangThai(s) +
      '<dl class="facts">' + facts.map(function (f) {
        return '<div class="fact"><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>';
      }).join('') + '</dl>' +
      (s.tinhTrang && ghiChuTL ? '<p class="facts-note">' + esc(ghiChuTL) + '</p>' : '') +
      '<section class="detail-section"><h3>Giới thiệu</h3><p>' + esc(s.moTaNgan) + '</p></section>' +
      '<section class="detail-section"><h3>Vì sao nên đọc</h3><p class="detail-why">' + esc(s.viSaoNenDoc) + '</p></section>' +
      htmlGioiThieuThem(s) +
      '<section class="detail-section"><h3>Chủ đề</h3><div class="detail-tags">' +
        s.tags.map(function (t) {
          return '<button class="chip" type="button" data-detail-tag="' + esc(t) + '" title="Xem các sách cùng chủ đề">#' + esc(t) + '</button>';
        }).join('') +
      '</div></section>' +
      '<div class="detail-actions">' +
        '<button class="toggle-btn random-btn" type="button" data-detail-random>🎲 Gợi ý cuốn khác</button>' +
      '</div>';
  }

  // Trình duyệt có <dialog> thật (Safari 15.4+, Chrome, Firefox, Edge) hay không
  var CO_DIALOG = typeof el.dialog.showModal === 'function';
  if (!CO_DIALOG) document.documentElement.classList.add('no-dialog');
  var nenMo = null; // lớp nền tối giả lập khi không có <dialog>
  var nutDaMo = null; // phần tử đã mở popup, để trả focus khi đóng

  function dangMo() { return el.dialog.hasAttribute('open'); }

  /* Khóa cuộn trang phía sau popup.
   * overflow:hidden trên <html> không đủ với Safari iOS, nên cố định <body> tại vị trí đang cuộn
   * rồi trả lại vị trí cũ khi đóng. */
  var viTriCuon = 0, dangKhoa = false;
  function khoaCuon() {
    if (dangKhoa) return;
    dangKhoa = true;
    viTriCuon = window.pageYOffset || document.documentElement.scrollTop || 0;
    var b = document.body.style;
    b.position = 'fixed'; b.top = (-viTriCuon) + 'px'; b.left = '0'; b.right = '0'; b.width = '100%';
    document.documentElement.classList.add('modal-open');
  }
  function moKhoaCuon() {
    if (!dangKhoa) return;
    dangKhoa = false;
    var b = document.body.style;
    b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = '';
    document.documentElement.classList.remove('modal-open');
    window.scrollTo(0, viTriCuon);
  }

  function moChiTiet(id) {
    var s = THEO_ID[id];
    if (!s) return;
    goiKhiDongNoiDung();
    sachDangMo = s;
    el.dialogContent.innerHTML = htmlChiTiet(s);
    moDialog();
  }

  /* Popup dùng chung: các phần khác (vd "Kệ sách của tôi") mở nội dung riêng trong cùng popup */
  var khiDongNoiDung = null;
  function goiKhiDongNoiDung() {
    if (khiDongNoiDung) { var f = khiDongNoiDung; khiDongNoiDung = null; try { f(); } catch (e) { /* bỏ qua */ } }
  }
  function moNoiDungTuy(html, onClose) {
    goiKhiDongNoiDung();
    sachDangMo = null;
    el.dialogContent.innerHTML = html;
    khiDongNoiDung = typeof onClose === 'function' ? onClose : null;
    moDialog();
  }

  function moDialog() {
    if (!dangMo()) {
      nutDaMo = document.activeElement;
      khoaCuon();
      if (CO_DIALOG) {
        el.dialog.showModal();
      } else {
        el.dialog.setAttribute('open', '');
        if (!nenMo) {
          nenMo = document.createElement('div');
          nenMo.className = 'dialog-backdrop';
          nenMo.addEventListener('click', dongChiTiet);
          document.body.appendChild(nenMo);
        }
        nenMo.hidden = false;
      }
    }
    el.dialog.scrollTop = 0;
    try { el.dialogClose.focus({ preventScroll: true }); } catch (e) { el.dialogClose.focus(); }
  }

  function dongChiTiet() {
    if (!dangMo()) return;
    if (CO_DIALOG) el.dialog.close();
    else {
      el.dialog.removeAttribute('open');
      if (nenMo) nenMo.hidden = true;
    }
    khiDong();
  }

  // Gọi được nhiều lần (khi bấm đóng và khi sự kiện 'close' của <dialog> tới) mà không lỗi
  function khiDong() {
    moKhoaCuon();
    goiKhiDongNoiDung();
    // Trả focus về nút đã mở popup; nếu nút đó đã bị vẽ lại thì tìm thẻ sách tương ứng
    var nut = (nutDaMo && document.body.contains(nutDaMo)) ? nutDaMo :
      (sachDangMo ? el.grid.querySelector('[data-open="' + sachDangMo.id + '"]') : null);
    if (nut && nut.focus && (sachDangMo || nutDaMo)) { try { nut.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } }
    sachDangMo = null;
    nutDaMo = null;
  }

  window.BearPopup = {
    mo: moNoiDungTuy,          // mo(html, khiDong)
    dong: dongChiTiet,
    dangMo: dangMo,
    noiDung: el.dialogContent
  };

  /* Cập nhật phần trạng thái trong popup mà không vẽ lại cả popup */
  function capNhatPopupTrangThai(id) {
    var d = layDoc(id);
    var hienTai = d ? d.s : '';
    Array.prototype.forEach.call(el.dialogContent.querySelectorAll('[data-set-status]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-status') === hienTai));
    });
    var fields = $('progress-fields');
    if (fields) fields.hidden = hienTai !== 'dang-doc';
    // Ruy băng trên bìa trong popup
    var cover = el.dialogContent.querySelector('.detail-cover .cover');
    if (cover) {
      var cu = cover.querySelector('.ribbon');
      if (cu) cu.remove();
      cover.insertAdjacentHTML('afterbegin', htmlRibbon(THEO_ID[id]));
    }
  }

  /* ---------- Gợi ý ngẫu nhiên ---------- */
  function goiYNgauNhien() {
    var nguon = locSach();
    if (!nguon.length) nguon = SACH;
    if (nguon.length > 1 && sachDangMo) {
      nguon = nguon.filter(function (s) { return s !== sachDangMo; });
    }
    var s = nguon[Math.floor(Math.random() * nguon.length)];
    moChiTiet(s.id);
  }

  /* ---------- Cập nhật tim trên thẻ ---------- */
  function capNhatNutTim(id) {
    var tim = laYeuThich(id);
    var s = THEO_ID[id];
    var nut = el.grid.querySelector('[data-fav="' + id + '"]');
    if (nut) {
      nut.setAttribute('aria-pressed', String(tim));
      nut.setAttribute('aria-label', (tim ? 'Bỏ yêu thích: ' : 'Yêu thích: ') + s.tenSach);
    }
    capNhatDemYeuThich();
  }

  /* ---------- Giao diện sáng / tối ---------- */
  var mqToi = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function giaoDienHienTai() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mqToi && mqToi.matches ? 'dark' : 'light';
  }

  function capNhatNutGiaoDien() {
    var toi = giaoDienHienTai() === 'dark';
    el.themeToggle.setAttribute('aria-label', toi ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
    el.themeToggle.setAttribute('title', toi ? 'Giao diện sáng' : 'Giao diện tối');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', toi ? '#17130f' : '#fbf6ef');
  }

  function doiGiaoDien() {
    var moi = giaoDienHienTai() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', moi);
    luuTru.ghi(KHOA_GIAO_DIEN, moi);
    capNhatNutGiaoDien();
  }

  /* ---------- Sự kiện ---------- */
  var henGio;
  el.search.addEventListener('input', function () {
    clearTimeout(henGio);
    henGio = setTimeout(function () {
      trangThai.tuKhoa = el.search.value.trim();
      veLai();
    }, 120);
  });
  el.search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && el.search.value) {
      e.preventDefault();
      el.search.value = '';
      trangThai.tuKhoa = '';
      veLai();
    }
  });
  el.searchClear.addEventListener('click', function () {
    el.search.value = '';
    trangThai.tuKhoa = '';
    veLai();
    el.search.focus();
  });

  el.catChips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    trangThai.theLoai = b.getAttribute('data-cat');
    veLai();
  });

  el.statusChips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-status]');
    if (!b) return;
    var k = b.getAttribute('data-status');
    trangThai.trangThaiDoc = trangThai.trangThaiDoc === k ? '' : k;
    veLai();
  });

  el.tagChips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tag]');
    if (!b) return;
    var t = b.getAttribute('data-tag');
    var i = trangThai.tags.indexOf(t);
    if (i === -1) trangThai.tags.push(t); else trangThai.tags.splice(i, 1);
    veLai();
  });

  el.sortSelect.addEventListener('change', function () {
    trangThai.sapXep = el.sortSelect.value;
    veLai();
  });

  el.hotToggle.addEventListener('click', function () {
    trangThai.chiHot = !trangThai.chiHot;
    veLai();
  });
  el.favToggle.addEventListener('click', function () {
    trangThai.chiYeuThich = !trangThai.chiYeuThich;
    veLai();
  });
  el.randomBtn.addEventListener('click', goiYNgauNhien);
  el.resetBtn.addEventListener('click', datLai);
  el.emptyReset.addEventListener('click', datLai);

  el.grid.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-fav]');
    if (fav) {
      var id = fav.getAttribute('data-fav');
      doiYeuThich(id);
      capNhatNutTim(id);
      fav.classList.remove('pop'); void fav.offsetWidth; fav.classList.add('pop');
      if (trangThai.chiYeuThich) veLai();
      return;
    }
    var mo = e.target.closest('[data-open]');
    if (mo) moChiTiet(mo.getAttribute('data-open'));
  });

  el.readingList.addEventListener('click', function (e) {
    var mo = e.target.closest('[data-open]');
    if (mo) moChiTiet(mo.getAttribute('data-open'));
  });

  el.dialogContent.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-detail-fav]');
    if (fav) {
      var id = fav.getAttribute('data-detail-fav');
      var tim = doiYeuThich(id);
      fav.setAttribute('aria-pressed', String(tim));
      fav.querySelector('.lbl').textContent = tim ? 'Đã yêu thích' : 'Yêu thích';
      capNhatNutTim(id);
      if (trangThai.chiYeuThich) veLai();
      return;
    }
    var st = e.target.closest('[data-set-status]');
    if (st && sachDangMo) {
      var idS = sachDangMo.id;
      datTrangThaiDoc(idS, st.getAttribute('data-set-status'));
      capNhatPopupTrangThai(idS);
      veLai();
      if (st.getAttribute('data-set-status') === 'dang-doc') {
        var o = $('inp-vitri');
        if (o && !o.value) o.focus();
      }
      return;
    }
    var tag = e.target.closest('[data-detail-tag]');
    if (tag) {
      trangThai.theLoai = 'tat-ca';
      trangThai.chiYeuThich = false;
      trangThai.chiHot = false;
      trangThai.trangThaiDoc = '';
      trangThai.tuKhoa = '';
      el.search.value = '';
      trangThai.tags = [tag.getAttribute('data-detail-tag')];
      sachDangMo = null;
      dongChiTiet();
      el.tagFilter.open = true;
      veLai();
      el.grid.focus({ preventScroll: true });
      el.resultInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (e.target.closest('[data-detail-random]')) goiYNgauNhien();
  });

  // Lưu ngay khi nhập vị trí / ghi chú
  var henGioHint;
  el.dialogContent.addEventListener('input', function (e) {
    if (!sachDangMo) return;
    var truong = e.target.id === 'inp-vitri' ? 'viTri' : e.target.id === 'inp-ghichu' ? 'ghiChu' : null;
    if (!truong) return;
    capNhatViTri(sachDangMo.id, truong, e.target.value);
    veLai();
    var hint = $('saved-hint');
    if (hint) {
      hint.textContent = '✓ Đã lưu';
      clearTimeout(henGioHint);
      henGioHint = setTimeout(function () { hint.textContent = ''; }, 1500);
    }
  });

  el.dialogClose.addEventListener('click', dongChiTiet);
  el.dialog.addEventListener('close', khiDong);
  el.dialog.addEventListener('click', function (e) {
    if (e.target === el.dialog) {
      var r = el.dialog.getBoundingClientRect();
      var ngoai = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (ngoai) dongChiTiet();
    }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && dangMo()) {
      e.preventDefault();
      dongChiTiet();
    }
  });

  el.themeToggle.addEventListener('click', doiGiaoDien);
  if (mqToi) {
    var nghe = function () { capNhatNutGiaoDien(); };
    if (mqToi.addEventListener) mqToi.addEventListener('change', nghe);
    else if (mqToi.addListener) mqToi.addListener(nghe);
  }

  /* ---------- Mục "Đọc truyện" ---------- */
  function veDanhSachTruyen(loi, ds) {
    if (loi || !ds.length) {
      // Mở trực tiếp file trên máy: trình duyệt thường chặn đọc file .json/.md -> giải thích thay vì im lặng
      if (loi && BT.moFileTrucTiep) {
        el.stories.hidden = false;
        el.storyList.innerHTML = '';
        el.storyNote.hidden = false;
        el.storyNote.textContent = 'Mục Đọc truyện cần mở trang qua web (GitHub Pages, Netlify) hoặc máy chủ cục bộ; trình duyệt không cho đọc file truyện khi mở trực tiếp index.html. Xem README.';
      } else {
        el.stories.hidden = true;
      }
      if (window.BearMenu) window.BearMenu.capNhat();
      return;
    }
    truyenTheoSach = {};
    ds.forEach(function (t) { if (t.sachId && THEO_ID[t.sachId]) truyenTheoSach[t.sachId] = t.id; });
    el.stories.hidden = false;
    el.storyNote.hidden = true;
    el.storyList.innerHTML = ds.map(function (t) {
      var td = BT.layTienDo(t.id);
      var trangThaiDoc = td ? (td.xong ? '✓ Đã đọc xong' : 'Đang đọc chương ' + td.chuong) : '';
      return '<a class="story-card" href="' + esc(BT.linkDoc(t.id, td && !td.xong ? td.chuong : 0, !!(td && !td.xong))) + '">' +
        '<span class="mini-cover mini-story" aria-hidden="true">📖</span>' +
        '<span class="reading-text">' +
          '<span class="reading-title">' + esc(t.ten) + '</span>' +
          (t.tacGia ? '<span class="reading-author">' + esc(t.tacGia) + '</span>' : '') +
          (t.moTa ? '<span class="story-desc">' + esc(t.moTa) + '</span>' : '') +
          '<span class="story-meta">' + (t.theLoai ? esc(t.theLoai) + ' · ' : '') + t.chuong.length + ' chương' +
            (trangThaiDoc ? ' · <strong>' + esc(trangThaiDoc) + '</strong>' : '') + '</span>' +
        '</span>' +
      '</a>';
    }).join('');
    if (window.BearMenu) window.BearMenu.capNhat();
  }

  // Quay lại từ trang đọc bằng nút Back (trang được lấy từ bộ nhớ đệm): cập nhật tiến độ
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { veLai(); if (BT) BT.taiDanhSach(veDanhSachTruyen); }
  });

  /* ---------- Thanh menu ---------- */
  var nav = $('site-nav'), navBtn = $('nav-toggle');
  function dongMenu() {
    nav.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
    navBtn.setAttribute('aria-label', 'Mở menu');
  }
  function capNhatMenu() {
    // Ẩn mục menu dẫn tới phần đang bị ẩn (vd chưa có sách đang đọc dở)
    Array.prototype.forEach.call(nav.querySelectorAll('[data-nav-muc]'), function (a) {
      var muc = $(a.getAttribute('data-nav-muc'));
      a.hidden = !muc || muc.hidden;
    });
  }
  window.BearMenu = { capNhat: capNhatMenu };
  navBtn.addEventListener('click', function () {
    var mo = !nav.classList.contains('is-open');
    if (mo) {
      capNhatMenu();
      nav.classList.add('is-open');
      navBtn.setAttribute('aria-expanded', 'true');
      navBtn.setAttribute('aria-label', 'Đóng menu');
    } else dongMenu();
  });
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    dongMenu();
    if (a.hasAttribute('data-nav-yeu-thich')) {
      trangThai.chiYeuThich = true;
      veLai();
    }
    var dich = $(a.getAttribute('href').slice(1));
    if (dich) {
      try { dich.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (er) { dich.scrollIntoView(true); }
      if (window.history && history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
    }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !e.target.closest('.header-inner')) dongMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { dongMenu(); navBtn.focus(); }
  });

  /* ---------- Khởi động ---------- */
  if (BT) BT.taiDanhSach(veDanhSachTruyen);
  veChipTheLoai();
  capNhatNutGiaoDien();
  veLai();
})();
