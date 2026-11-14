# Bear Bookcase — tự thêm các file PDF mới trong thư mục sach/ vào danh-sach.js
# Chạy bằng cách bấm đúp "cap-nhat-danh-sach.bat".
$ErrorActionPreference = 'Stop'
$thuMuc = Split-Path -Parent $MyInvocation.MyCommand.Path
$fileDs = Join-Path $thuMuc 'danh-sach.js'
$utf8 = New-Object System.Text.UTF8Encoding $false

if (-not (Test-Path $fileDs)) {
  [IO.File]::WriteAllText($fileDs, "window.KE_SACH = [`r`n];`r`n", $utf8)
}
$noiDung = [IO.File]::ReadAllText($fileDs, $utf8)
# Bỏ phần ghi chú (/* ... */ và // ...) để ví dụ trong ghi chú không bị tính là sách
function BoGhiChu($s) { return ([regex]::Replace($s, '(?s)/\*.*?\*/', '') -replace '(?m)^\s*//.*$', '') }

$pdf = @(Get-ChildItem -LiteralPath $thuMuc -Filter '*.pdf' -File | Sort-Object Name)
$phanDuLieu = BoGhiChu $noiDung
$moi = @($pdf | Where-Object { $phanDuLieu -notmatch [regex]::Escape('"' + $_.Name + '"') })

if ($moi.Count -gt 0) {
  $viTri = $noiDung.LastIndexOf('];')
  if ($viTri -lt 0) { throw 'Không tìm thấy dấu "];" cuối danh sách trong danh-sach.js.' }
  $truoc = $noiDung.Substring(0, $viTri).TrimEnd()
  if (-not ($truoc.EndsWith(',') -or $truoc.EndsWith('['))) { $truoc += ',' }
  $dongMoi = ($moi | ForEach-Object { '  "' + ($_.Name -replace '\\', '\\' -replace '"', '\"') + '",' }) -join "`r`n"
  $noiDung = $truoc + "`r`n" + $dongMoi + "`r`n" + $noiDung.Substring($viTri)
  [IO.File]::WriteAllText($fileDs, $noiDung, $utf8)
}

Write-Host ''
Write-Host '=== Bear Bookcase: cập nhật Kệ sách ===' -ForegroundColor Yellow
Write-Host ("Có {0} file PDF trong thư mục sach/." -f $pdf.Count)
if ($moi.Count -gt 0) {
  Write-Host ("Đã thêm {0} sách mới vào danh-sach.js:" -f $moi.Count) -ForegroundColor Green
  $moi | ForEach-Object { Write-Host ('  + ' + $_.Name) }
} else {
  Write-Host 'Không có file mới, danh sách đã đầy đủ.' -ForegroundColor Green
}

# Cảnh báo: sách ghi trong danh sách nhưng không còn file
$daGhi = [regex]::Matches((BoGhiChu $noiDung), '"([^"\\]+\.pdf)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$thieu = @($daGhi | Where-Object { -not (Test-Path -LiteralPath (Join-Path $thuMuc $_)) })
if ($thieu.Count -gt 0) {
  Write-Host 'Lưu ý: các file sau có trong danh sách nhưng không thấy trong thư mục:' -ForegroundColor Red
  $thieu | ForEach-Object { Write-Host ('  ! ' + $_) }
}
Write-Host ''
Write-Host 'Mở lại (hoặc tải lại) index.html để xem kệ sách.'
