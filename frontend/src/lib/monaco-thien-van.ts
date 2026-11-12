/**
 * Theme Monaco cho giao diện "Đài thiên văn" — ô soạn mã của /ide.
 *
 * Vì sao có tệp này: Monaco KHÔNG đọc CSS của trang. `theme={dark ? 'vs-dark' :
 * 'light'}` cho nền trắng tinh (ngày) và xám trung tính #1e1e1e (đêm) cạnh khung
 * kết quả mang màu giấy kem / nâu của theme — hai mặt phẳng cạnh nhau, hai bảng màu.
 * Đo trên /ide với theme bật (12/11/2026): ô mã trắng `#FFFFFF` trên thẻ vellum
 * `#FBF5E3`; ban đêm `#1E1E1E` cạnh `#2A2416`.
 *
 * NỀN LÀ MỘT BẢN CHÉP của `--ds-card` trong theme-thien-van.css (Monaco nhận mã
 * màu, không nhận `var()`), nên nó TRÔI ĐƯỢC. `giao-dien-monaco.test.mjs` đọc
 * CSS và đòi hai bên bằng nhau — đổi một bên là đỏ.
 *
 * Không import gì: test nạp thẳng tệp .ts bằng `--experimental-strip-types`.
 */

export const MONACO_THIEN_VAN_NGAY = 'thien-van-ngay';
export const MONACO_THIEN_VAN_DEM = 'thien-van-dem';

/** Màu của một theme Monaco. Mã `#rrggbb`; `rules` của Monaco cần bỏ dấu `#`, hàm dưới lo. */
export type MauMonaco = {
  nen: string;
  dongDangDung: string;
  vungChon: string;
  chu: string;
  tuKhoa: string;
  chuoi: string;
  so: string;
  chuThich: string;
  soDong: string;
  conTro: string;
};

export const MAU_NGAY: MauMonaco = {
  nen: '#FBF5E3',
  dongDangDung: '#F3EAD0',
  vungChon: '#E3D2AC',
  chu: '#241B10',
  tuKhoa: '#9B2C3A',
  chuoi: '#046A4E',
  so: '#1F4FA8',
  chuThich: '#6B5B36',
  soDong: '#6B5B36',
  conTro: '#8A6D1E',
};

export const MAU_DEM: MauMonaco = {
  nen: '#2A2416',
  dongDangDung: '#332B1B',
  vungChon: '#4A3B20',
  chu: '#E8EEF7',
  tuKhoa: '#FF8798',
  chuoi: '#4FD0A0',
  so: '#9DBCFF',
  chuThich: '#A8B5CA',
  soDong: '#A8B5CA',
  conTro: '#C9A646',
};

const bo = (hex: string) => hex.replace('#', '');

/** Dạng đối số của `monaco.editor.defineTheme`. Khai kiểu tối thiểu để không kéo `monaco-editor` vào tệp thuần. */
export function dungTheme(m: MauMonaco, toi: boolean) {
  return {
    base: toi ? ('vs-dark' as const) : ('vs' as const),
    inherit: true,
    rules: [
      { token: '', foreground: bo(m.chu) },
      { token: 'keyword', foreground: bo(m.tuKhoa) },
      { token: 'string', foreground: bo(m.chuoi) },
      { token: 'number', foreground: bo(m.so) },
      { token: 'comment', foreground: bo(m.chuThich), fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': m.nen,
      'editor.foreground': m.chu,
      'editor.lineHighlightBackground': m.dongDangDung,
      'editor.selectionBackground': m.vungChon,
      'editorLineNumber.foreground': m.soDong,
      'editorLineNumber.activeForeground': m.chu,
      'editorCursor.foreground': m.conTro,
      'editorGutter.background': m.nen,
    },
  };
}

/** Gọi trong `beforeMount`: định nghĩa cả hai theme một lần. */
export function dinhNghiaThemeThienVan(monaco: {
  editor: { defineTheme: (ten: string, theme: ReturnType<typeof dungTheme>) => void };
}) {
  monaco.editor.defineTheme(MONACO_THIEN_VAN_NGAY, dungTheme(MAU_NGAY, false));
  monaco.editor.defineTheme(MONACO_THIEN_VAN_DEM, dungTheme(MAU_DEM, true));
}
