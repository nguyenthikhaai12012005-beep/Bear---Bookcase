# Bear Bookcase 🐱📚

Website tĩnh giới thiệu sách và truyện hay bằng tiếng Việt: sách đời sống – chữa lành, kinh điển, tiểu thuyết hot TikTok, truyện ma – kinh dị và bách hợp.

Chỉ dùng HTML, CSS, JavaScript thuần. Không framework, không cần build, không cần máy chủ. Mở `index.html` là chạy được.

## Cấu trúc thư mục

```
index.html            Trang chính
doc.html              Trang đọc truyện
css/style.css         Giao diện chung (sáng/tối, điện thoại → máy tính)
css/doc.css           Giao diện riêng của trang đọc truyện
js/data.js            TOÀN BỘ dữ liệu sách (chỉ cần sửa file này để thêm sách)
js/app.js             Tìm kiếm, bộ lọc, popup, yêu thích, đánh dấu đang đọc
js/truyen.js          Phần dùng chung để tải truyện và lưu tiến độ đọc
js/doc.js             Logic trang đọc truyện
js/ke-sach.js         "Kệ sách của tôi" trên trang chủ
js/ke-sach-chung.js   Phần dùng chung của kệ sách (danh sách, bìa, mật khẩu, trang đang đọc)
js/pdf-tien-ich.js    Đọc file PDF bằng PDF.js: bìa từ trang đầu, số trang, thông tin file
js/xem-sach.js        Trang đọc PDF ngay trên website
xem-sach.html         Trang đọc sách PDF
js/sha256.js          Tính mã mật khẩu
tao-mat-khau.html     Trang tạo mã mật khẩu cho kệ sách
sach/                 File PDF và danh sách cho "Kệ sách của tôi"
img/logo-meo-cam.svg  Logo mèo cam (dùng cả làm favicon)
truyen/               Các truyện đọc trên web (xem mục "Thêm truyện để đọc trên web")
```

## Tính năng

- Tìm theo tên sách / tác giả, không phân biệt hoa thường và dấu (gõ `nha gia kim` vẫn ra *Nhà giả kim*).
- Lọc theo 5 thể loại, theo chủ đề (tags), "Hot 5 năm gần đây", "Sách tôi thích" và trạng thái đọc. Sắp xếp theo năm (mới/cũ) hoặc tên A→Z; sách chưa rõ năm luôn nằm cuối.
- Chạy trên Safari (iOS/macOS), Chrome, Firefox, Edge, Samsung Internet và trình duyệt trong Zalo/Messenger/Facebook.
- Bấm thẻ sách để mở popup chi tiết; đóng bằng nút ✕, phím Esc hoặc bấm ra ngoài.
- Nút tim ♥ để lưu sách yêu thích.
- Đánh dấu **Muốn đọc / Đang đọc / Đã đọc xong**. Khi chọn "Đang đọc", bạn ghi được vị trí đang đọc và một ghi chú ngắn; khu **Đang đọc dở** ở đầu trang sẽ liệt kê các cuốn này.
- Thanh menu: trên máy tính nằm ngang ở đầu trang; trên điện thoại bấm nút ☰ để mở. Dẫn nhanh tới Đang đọc dở, Kệ sách, Đọc truyện, Tủ sách, Sách tôi thích.
- Gợi ý ngẫu nhiên, giao diện sáng/tối (tự theo máy, có nút chuyển).
- Popup có phần giới thiệu chi tiết (tóm tắt, chủ đề chính, hợp với ai, độ dài) và nút **Tìm đọc bản chính thức** (mở trang tìm kiếm Google trong tab mới).
- Trang **Đọc truyện**: cột chữ dễ đọc, tăng/giảm cỡ chữ, nền sáng/sepia/tối, mục lục, chương trước/sau (hoặc phím ← →), tự lưu chương và vị trí đang đọc, nút **Đọc tiếp**.

> Yêu thích và đánh dấu đọc được lưu trong `localStorage` của trình duyệt, nên chỉ có trên máy và trình duyệt bạn đang dùng. Nếu trình duyệt chặn lưu trữ (ví dụ chế độ ẩn danh nghiêm ngặt), trang vẫn chạy bình thường nhưng sẽ không nhớ sau khi tải lại.

---

## Cách thêm sách mới

1. Mở `js/data.js` bằng một trình soạn thảo bất kỳ (VS Code, Notepad++…). Lưu ý: lưu file ở dạng **UTF-8**.
2. Tìm mảng `DANH_SACH_SACH = [ ... ]`, rồi chép một khối `{ ... }` có sẵn và dán vào cuối mảng (trước dấu `];`). Nhớ thêm dấu phẩy `,` giữa hai khối.
3. Sửa lại thông tin. Ví dụ:

```js
{
  id: "ten-sach-khong-dau",          // chữ thường, không dấu, nối bằng gạch ngang, KHÔNG được trùng
  tenSach: "Tên sách",
  tenGoc: "Original Title",          // (tùy chọn) tên gốc với sách nước ngoài
  tacGia: "Tên tác giả",
  theLoai: "doi-song",               // một trong: doi-song, kinh-dien, booktok, kinh-di, bach-hop
  namXuatBan: 2020,                  // số; tác phẩm cổ có thể ghi chữ, vd "Thế kỷ 16"; không chắc thì để null (trang sẽ ẩn dòng năm)
  moTaNgan: "2–3 câu giới thiệu, tự viết, không tiết lộ kết truyện.",
  viSaoNenDoc: "1–2 câu lý do nên đọc.",
  tomTatDai: "5–7 câu tóm tắt, tự viết, không lộ kết truyện.",   // chưa có thì để ""
  chuDe: ["chủ đề 1", "chủ đề 2", "chủ đề 3"],                    // 3–5 chủ đề; chưa có thì []
  hopVoi: "Một câu: cuốn này hợp với ai.",                        // chưa có thì ""
  doDai: "Vừa",                                                   // "Ngắn" | "Vừa" | "Dài" | ""
  tags: ["chữa lành", "Hàn Quốc"],
  hot5Nam: true                      // true nếu nổi trong 5 năm gần đây
}
```

Các trường `tomTatDai`, `chuDe`, `hopVoi`, `doDai` để trống thì mục tương ứng trong popup tự ẩn. Quy ước độ dài: **Ngắn** khoảng dưới 250 trang (hoặc vài tập truyện tranh), **Vừa** khoảng 250–400 trang, **Dài** trên 400 trang hoặc bộ nhiều tập.

Trường bắt buộc thêm theo thể loại:

| Thể loại | Trường thêm |
|---|---|
| `kinh-di` | `mucDoSo: 3` (từ 1 đến 5) |
| `bach-hop` | `tinhTrang: "Hoàn"` hoặc `"Đang ra"`, và `tong: "Ngọt"` (hoặc "Ngược", "Chữa lành"…). Tùy chọn: `soTap: "14 tập"` |

Sách thuộc **hai** thể loại: dùng mảng và chỉ tạo **một** bản ghi, ví dụ `theLoai: ["kinh-di", "bach-hop"]` (rồi điền đủ trường thêm của cả hai).

4. Lưu file và tải lại trang. Bìa sách được vẽ tự động theo màu thể loại, không cần ảnh.

Muốn thêm thể loại mới: thêm một mục vào `THE_LOAI` ở đầu `data.js` (tên, tên ngắn, biểu tượng, hai màu bìa). Trường `ghiChu` (tùy chọn) là dòng chú thích nhỏ hiện khi lọc theo thể loại đó, ví dụ ghi chú về tình trạng truyện bách hợp.

Sách có tên tiếng Việt chính thức nhưng muốn hiện kèm tên gốc (như *Atomic Habits*): ghi cả hai vào `tenSach`, ví dụ `"Atomic Habits (Thay đổi tí hon, hiệu quả bất ngờ)"`. Ô tìm kiếm tìm theo `tenSach`, `tenGoc` và `tacGia`, nên gõ tên nào cũng ra.

---

## "Kệ sách của tôi": tự thêm sách PDF

Mục này nằm ở trang chủ và hiện các file PDF bạn tự thêm. Kệ sách chạy được cả khi **mở `index.html` trực tiếp trên máy** lẫn khi đã đăng lên web. Trên web, ai mở trang (và biết mật khẩu, nếu bạn đặt) đều xem và đọc được.

| | Mở qua web (GitHub Pages, Netlify, máy chủ cục bộ) | Mở trực tiếp file trên máy |
|---|---|---|
| Bìa | Ảnh **trang đầu của file PDF** | Bìa tự vẽ từ tên sách |
| Số trang, dung lượng, tiêu đề/tác giả trong file | Có | Không |
| Nút **Đọc** | Mở trang `xem-sach.html`: đọc ngay trên website (cả trên điện thoại), phóng to/thu nhỏ, tới trang, tự nhớ trang đang đọc | Mở file PDF ở tab mới |

Phần đọc PDF dùng thư viện [PDF.js](https://mozilla.github.io/pdf.js/) tải từ cdnjs, nên lần đầu mở cần có mạng. Nếu cuốn nào chưa ghi đủ tên/tác giả, popup có mục **Gợi ý điền thông tin** (lấy từ thông tin trong file PDF) kèm nút sao chép để dán vào `danh-sach.js`.

```
sach/
  danh-sach.js             danh sách sách trên kệ
  cau-hinh.js              mã mật khẩu (để "" = không cần mật khẩu)
  cap-nhat-danh-sach.bat   bấm đúp để tự thêm file PDF mới vào danh sách
  sach-mau.pdf             file mẫu, xóa khi đã thêm sách của bạn
```

### Thêm sách trên máy tính (cách nhanh nhất)

1. Chép các file PDF vào thư mục `sach/`.
2. Bấm đúp **`cap-nhat-danh-sach.bat`**. Cửa sổ đen hiện ra, báo đã thêm những file nào. Bấm phím bất kỳ để đóng.
3. Mở (hoặc tải lại) `index.html`. Sách mới đã nằm trên kệ, tên sách lấy từ tên file.

Muốn bìa đẹp hơn (đúng tên sách, có tác giả, màu theo thể loại), mở `sach/danh-sach.js` bằng Notepad và đổi dòng của cuốn đó:

```js
window.KE_SACH = [
  "cuon-sach.pdf",
  { file: "cuon-khac.pdf", ten: "Tên sách hiển thị", tacGia: "Tác giả", theLoai: "doi-song", moTa: "Vài dòng giới thiệu." },
  { link: "https://...", ten: "Sách đọc qua đường link" },
];
```

- `theLoai` (không bắt buộc) quyết định màu bìa: `doi-song`, `kinh-dien`, `booktok`, `kinh-di`, `bach-hop`. Bỏ trống thì bìa có màu riêng theo tên sách.
- Mỗi dòng kết thúc bằng dấu phẩy. Lưu file ở dạng UTF-8 (Notepad: *Save as* → Encoding *UTF-8*).
- Xóa sách: xóa dòng của nó trong `danh-sach.js` và xóa file PDF.

### Đưa sách mới lên web (GitHub)

Sau khi thêm sách trên máy như trên, tải lên GitHub **file PDF mới** và **file `sach/danh-sach.js`**: vào thư mục `sach` trên GitHub → **Add file → Upload files** → kéo các file vào → **Commit changes**. Khoảng 1 phút sau, trang web cập nhật. Mỗi file trên GitHub tối đa 100 MB (giao diện web chỉ nhận file dưới 25 MB).

Kệ sách tự ẩn khi danh sách trống.

### Đặt mật khẩu cho kệ sách

1. Mở trang `tao-mat-khau.html` (trên máy hoặc trên web đều được).
2. Gõ mật khẩu, bấm **Sao chép dòng mã**.
3. Mở `sach/cau-hinh.js`, thay dòng `window.KE_SACH_MAT_KHAU = "";` bằng dòng vừa sao chép, lưu lại. Nếu dùng web, tải file này lên GitHub.

File chỉ lưu **mã** của mật khẩu, không lưu mật khẩu thật. Người xem nhập đúng một lần thì trình duyệt của họ nhớ, lần sau không phải nhập lại. Đổi mật khẩu thì mọi người phải nhập lại.

> **Giới hạn cần biết:** mật khẩu này chỉ chặn người xem thông thường trên trang. GitHub Pages không có cách bảo vệ file thật sự: ai biết đường dẫn trực tiếp tới file PDF (ví dụ `.../sach/ten-file.pdf`) vẫn tải được, và repository công khai thì ai cũng xem được thư mục `sach/`. Muốn bảo vệ thật, cần dịch vụ có đăng nhập phía máy chủ (ví dụ Cloudflare Pages + Cloudflare Access).
>
> Chỉ đăng những file bạn có quyền chia sẻ: tự viết, được tác giả/nhà xuất bản cho phép, hoặc đã hết bản quyền.

---

## Thêm truyện để đọc trên web

> Chỉ đăng những tác phẩm bạn có quyền đăng: tự viết, được tác giả/nhà xuất bản cho phép bằng văn bản, hoặc đã hết bản quyền. Website tĩnh là công khai: mọi file trong thư mục `truyen/` đều có thể bị tải về bằng đường link, kể cả khi trang có "mật khẩu" viết bằng JavaScript.

Mỗi truyện là một thư mục con trong `truyen/`. Không cần sửa code, chỉ tạo và sửa file văn bản.

```
truyen/
  danh-sach.json                 danh sách thư mục truyện
  meo-cam-giu-tiem-sach/         truyện mẫu
    info.json
    chuong-1.md
    chuong-2.md
```

### Thêm một truyện mới

1. Tạo thư mục mới trong `truyen/`. Tên thư mục viết **chữ thường, không dấu, nối bằng gạch ngang**, ví dụ `truyen/chuyen-nha-ben-song/`.
2. Trong thư mục đó, tạo file `info.json`:

   ```json
   {
     "ten": "Chuyện nhà bên sông",
     "tacGia": "Tên tác giả",
     "theLoai": "Truyện ngắn",
     "moTa": "Vài câu giới thiệu truyện.",
     "sachId": "",
     "chuong": [
       { "file": "chuong-1.md", "ten": "Tên chương 1" },
       { "file": "chuong-2.md", "ten": "Tên chương 2" }
     ]
   }
   ```

   - `sachId` (không bắt buộc): nếu truyện này là bản đọc của một cuốn trong `js/data.js`, ghi `id` của cuốn đó (ví dụ `"nha-gia-kim"`). Popup của cuốn sách sẽ tự hiện nút **Đọc ngay**.
3. Tạo các file `chuong-1.md`, `chuong-2.md`… (cách viết ở dưới).
4. Mở `truyen/danh-sach.json` và thêm tên thư mục vào danh sách:

   ```json
   [
     "meo-cam-giu-tiem-sach",
     "chuyen-nha-ben-song"
   ]
   ```

   Bước này cần thiết vì trang web tĩnh không tự "nhìn" được trong thư mục có những gì.

### Thêm chương mới cho truyện đã có

1. Tạo file `chuong-3.md` trong thư mục truyện.
2. Thêm một dòng vào mảng `chuong` trong `info.json` của truyện đó: `{ "file": "chuong-3.md", "ten": "Tên chương 3" }` (nhớ thêm dấu phẩy sau dòng phía trên).

### Cách viết file chương (.md)

- Dòng đầu `# Tiêu đề chương` (không bắt buộc; nếu không có sẽ lấy tên trong `info.json`).
- **Mỗi dòng là một đoạn văn.** Dòng trống chỉ để dễ nhìn.
- Lời thoại bắt đầu bằng `— ` hoặc `- ` đều được giữ nguyên (không bị biến thành danh sách).
- `**chữ đậm**`, `*chữ nghiêng*`, `> đoạn trích dẫn hoặc thư`.
- Dòng chỉ có `***` hoặc `---` để ngắt cảnh.
- Danh sách gạch đầu dòng dùng `* ` hoặc `+ `; danh sách số dùng `1. `.
- Lưu file ở dạng **UTF-8** để hiển thị đúng dấu tiếng Việt.

### Lưu ý khi thử trên máy tính

Trình duyệt **không cho đọc file truyện khi mở trực tiếp** `index.html` hoặc `doc.html` từ ổ đĩa (đường dẫn bắt đầu bằng `file://`). Phần danh sách sách vẫn chạy bình thường, nhưng mục Đọc truyện sẽ hiện lời giải thích. Để thử trên máy, hãy chạy một máy chủ nhỏ, ví dụ:

- VS Code: cài tiện ích **Live Server**, bấm chuột phải vào `index.html` → *Open with Live Server*.
- Hoặc nếu có Python: mở cửa sổ lệnh trong thư mục dự án, chạy `python -m http.server 8000` rồi mở <http://localhost:8000>.

Khi đã đăng lên GitHub Pages hoặc Netlify thì không cần làm gì thêm.

---

## Đăng lên GitHub Pages (mở được bằng điện thoại)

### Cách 1: làm hoàn toàn trên trình duyệt (không cần cài gì)

1. Đăng ký / đăng nhập tại <https://github.com>.
2. Bấm dấu **+** ở góc trên bên phải → **New repository**.
3. Đặt tên, ví dụ `bear-bookcase`, chọn **Public**, rồi bấm **Create repository**.
4. Ở trang repository mới, bấm dòng **uploading an existing file**.
5. Kéo thả **toàn bộ nội dung** thư mục dự án vào: `index.html`, `doc.html`, `xem-sach.html`, `tao-mat-khau.html`, `README.md` và năm thư mục `css`, `js`, `img`, `truyen`, `sach`.
   - Phải kéo cả thư mục để giữ đúng cấu trúc. `index.html` phải nằm ở **ngoài cùng**, không nằm trong một thư mục con.
6. Bấm **Commit changes**.
7. Vào **Settings** → **Pages** (menu bên trái).
8. Ở mục **Build and deployment** → **Source**, chọn **Deploy from a branch**. Ở **Branch**, chọn `main` và thư mục `/ (root)`, rồi bấm **Save**.
9. Chờ 1–2 phút rồi tải lại trang Settings → Pages. Bạn sẽ thấy địa chỉ dạng:
   `https://<tên-tài-khoản>.github.io/bear-bookcase/`
10. Mở địa chỉ đó trên điện thoại. Mẹo: trong trình duyệt điện thoại, chọn **Thêm vào màn hình chính** để có biểu tượng như một ứng dụng.

### Cách 2: dùng Git (nếu đã quen dòng lệnh)

```bash
cd "đường/dẫn/tới/thư/mục/dự/án"
git init
git add .
git commit -m "Bear Bookcase"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/bear-bookcase.git
git push -u origin main
```

Sau đó bật Pages như bước 7–9 ở trên.

### Cập nhật sau này

Sửa `js/data.js` (hoặc file khác) → tải lên lại đúng file đó trong repository (**Add file → Upload files**, hoặc `git add . && git commit -m "..." && git push`). GitHub Pages tự cập nhật sau khoảng 1 phút. Nếu điện thoại vẫn hiện bản cũ, hãy tải lại trang hoặc xóa bộ nhớ đệm.

### Netlify (cách thay thế)

Vào <https://app.netlify.com/drop> và kéo thả cả thư mục dự án vào. Netlify sẽ cho bạn ngay một đường link. Không cần sửa gì trong code.
