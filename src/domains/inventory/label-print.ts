import QRCode from 'qrcode';

type LabelItem = { code: string | null; name: string };

// Label size in mm; change here once the label paper is known.
const LABEL_W = 60;
const LABEL_H = 40;
const QR_SIZE = 26;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// The QR holds exactly items.code, which is what the USB scanner types into Barang Masuk.
export async function buildLabelsHtml(items: LabelItem[]): Promise<string> {
  const labels = await Promise.all(
    items
      .filter((it): it is { code: string; name: string } => !!it.code)
      .map(async (it) => {
        const svg = await QRCode.toString(it.code, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
        return `<div class="label"><div class="qr">${svg}</div><div class="txt"><b>${escapeHtml(it.name)}</b><span>${escapeHtml(it.code)}</span></div></div>`;
      }),
  );
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Label QR Barang</title>
<style>
  @page { margin: 8mm; }
  body { margin: 0; font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; gap: 2mm; }
  .label { width: ${LABEL_W}mm; height: ${LABEL_H}mm; box-sizing: border-box; border: 0.3mm dashed #999; padding: 3mm; display: flex; align-items: center; gap: 3mm; page-break-inside: avoid; }
  .qr { width: ${QR_SIZE}mm; height: ${QR_SIZE}mm; flex: none; }
  .qr svg { width: 100%; height: 100%; }
  .txt { display: flex; flex-direction: column; gap: 1mm; font-size: 9pt; overflow: hidden; }
  .txt span { font-family: monospace; font-size: 10pt; }
</style></head>
<body>${labels.join('')}</body></html>`;
}

// Returns an error message, or null when the print window opened.
export async function printItemLabels(items: LabelItem[]): Promise<string | null> {
  if (!items.some((it) => it.code)) return 'Tidak ada barang berkode untuk dicetak.';
  // Open the window before the async QR work so the browser does not treat it as a blocked pop-up.
  const win = window.open('', '_blank');
  if (!win) return 'Pop-up diblokir browser. Izinkan pop-up untuk mencetak label.';
  try {
    win.document.write(await buildLabelsHtml(items));
    win.document.close();
    win.onload = () => win.print();
    return null;
  } catch {
    win.close();
    return 'Gagal membuat label QR.';
  }
}
