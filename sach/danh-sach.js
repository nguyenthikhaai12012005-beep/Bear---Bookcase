/* =============================================================
 * KỆ SÁCH CỦA TÔI — danh sách sách trên kệ
 *
 * Cách nhanh nhất: chép file PDF vào thư mục sach/ rồi bấm đúp
 * "cap-nhat-danh-sach.bat" — file mới sẽ tự được thêm vào danh sách dưới đây.
 *
 * Mỗi dòng có thể là:
 *   "ten-file.pdf",                         (tên sách tự lấy từ tên file)
 * hoặc đầy đủ thông tin:
 *   { file: "ten-file.pdf", ten: "Tên sách", tacGia: "Tác giả",
 *     theLoai: "doi-song", moTa: "Vài dòng giới thiệu." },
 * hoặc một đường link thay cho file:
 *   { link: "https://...", ten: "Tên sách" },
 *
 * theLoai (quyết định màu bìa): doi-song, kinh-dien, booktok, kinh-di, bach-hop
 * Mỗi dòng kết thúc bằng dấu phẩy.
 * ============================================================= */
window.KE_SACH = [
  { file: "sach-mau.pdf", ten: "Sách mẫu của Bear Bookcase", tacGia: "Bear Bookcase", moTa: "File PDF mẫu để xem kệ sách hoạt động thế nào. Khi đã thêm sách của bạn, hãy xóa dòng này và file sach-mau.pdf." },
];
