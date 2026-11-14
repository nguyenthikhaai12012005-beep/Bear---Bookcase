/* SHA-256 viết bằng JavaScript thuần (chạy được cả khi mở file trực tiếp, không cần crypto.subtle).
 * Dùng để so mật khẩu của "Kệ sách của tôi" với mã đã lưu trong sach/cau-hinh.json. */
(function () {
  'use strict';
  var K = [], H0 = [];
  (function () {
    function laSoNguyenTo(n) { for (var f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; }
    function phanLe(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
    for (var c = 2, n = 0; n < 64; c++) {
      if (laSoNguyenTo(c)) {
        if (n < 8) H0[n] = phanLe(Math.pow(c, 1 / 2));
        K[n] = phanLe(Math.pow(c, 1 / 3));
        n++;
      }
    }
  })();
  function xoay(x, n) { return (x >>> n) | (x << (32 - n)); }

  window.bearSha256 = function (chuoi) {
    var s = unescape(encodeURIComponent(String(chuoi))); // UTF-8
    var tu = [], l = s.length * 8, i, j;
    for (i = 0; i < s.length; i++) tu[i >> 2] |= s.charCodeAt(i) << ((3 - i % 4) * 8);
    tu[l >> 5] |= 0x80 << (24 - l % 32);
    tu[(((l + 64) >> 9) << 4) + 15] = l;
    var H = H0.slice();
    for (j = 0; j < tu.length; j += 16) {
      var W = [];
      for (i = 0; i < 16; i++) W[i] = tu[j + i] | 0;
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        if (i >= 16) {
          var w15 = W[i - 15], w2 = W[i - 2];
          W[i] = (W[i - 16] + (xoay(w15, 7) ^ xoay(w15, 18) ^ (w15 >>> 3)) + W[i - 7] +
            (xoay(w2, 17) ^ xoay(w2, 19) ^ (w2 >>> 10))) | 0;
        }
        var t1 = (h + (xoay(e, 6) ^ xoay(e, 11) ^ xoay(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        var t2 = ((xoay(a, 2) ^ xoay(a, 13) ^ xoay(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  };
})();
