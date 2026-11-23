// Chạy Python cho app Mini Project (Máy tính Góc học). Cùng khuôn với studio-lesson.worker.js:
// runtime Pyodide nạp CÙNG ORIGIN một lần, mỗi lượt chạy dùng namespace mới; trang cha terminate worker nếu quá 5 giây.
// Worker CLASSIC (importScripts) vì dùng Pyodide 0.27.7; bản 314 chỉ có .mjs.
const PYODIDE_DIR = '/pyodide/v0.27.7/';
importScripts(PYODIDE_DIR + 'pyodide.js');
// Mã học viên gọi được JS qua pyodide.ffi: bỏ Worker để không đẻ worker con thoát khỏi giới hạn (xem studio-lesson.worker.js).
delete self.Worker;

const ready = loadPyodide({ indexURL: PYODIDE_DIR })
  .then((py) => { postMessage({ ready: true }); return py; })
  .catch((err) => { postMessage({ fatal: String((err && err.message) || err) }); throw err; });

const HARNESS = `
import json
_res = []
for _expr, _exp in TESTS:
    try:
        _got = repr(eval(_expr))
        _res.append([_expr, _exp, _got, _got == _exp])
    except Exception as _e:
        _res.append([_expr, _exp, type(_e).__name__ + ": " + str(_e), False])
json.dumps(_res)
`;

onmessage = async (e) => {
  const { id, code, tests } = e.data;
  let py;
  try { py = await ready; } catch { return; }
  let out = '';
  py.setStdout({ batched: (s) => { out += s + '\n'; } });
  py.setStderr({ batched: (s) => { out += s + '\n'; } });
  const ns = py.toPy({});
  let error = null, results = null;
  try {
    await py.runPythonAsync(code, { globals: ns });
    if (tests) { ns.set('TESTS', py.toPy(tests)); results = JSON.parse(py.runPython(HARNESS, { globals: ns })); }
  } catch (err) {
    // chỉ giữ dòng cuối của traceback; phần đầu là khung nội bộ của Pyodide
    const msg = String(err.message || err).trim(), lines = msg.split('\n');
    const at = [...msg.matchAll(/File "<exec>", line (\d+)/g)].pop();
    error = (at ? 'Dòng ' + at[1] + ': ' : '') + lines.slice(-1)[0];
  } finally { ns.destroy(); }
  postMessage({ id, out, error, results });
};
