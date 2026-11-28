"use strict";
const $=s=>document.querySelector(s);
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MODS=[["M1","Python nền tảng",18,"#ffc97a"],["M2","NumPy từ dãy số đến bảng",23,"#9ad8ff"],["M3","pandas: từ bảng đầu tiên đến quy trình phân tích",32,"#8be3a8"],["M4","Trực quan hóa dữ liệu",30,"#ff9db8"],["M5","Python ứng dụng, OOP và dữ liệu lưu trữ",28,"#c9b3ff"],["M6","Hệ điều hành, tiến trình và đa luồng",13,"#ffb08a"],["M7","Multiprocessing và shell thực hành",3,"#9ad8ff"],["M8","Tkinter: từ form nhỏ đến màn hình nhận đơn",12,"#8be3a8"],["M9","Ôn tập và thực hành các chi tiết trong slide",8,"#ff9db8"],["M10","Ôn API trực quan hóa, mở rộng NumPy",5,"#c9b3ff"],["M11","Thực hành trên số liệu thật của một quán khác",7,"#ffc97a"]];
const KEY="pe-laptop-v3";
let S={seen:false,best:0};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
function toastS(m){const t=$("#toastS");t.textContent=m;t.hidden=false;clearTimeout(toastS.h);toastS.h=setTimeout(()=>t.hidden=true,2200)}
const os=$("#os"),screen=$("#screen");let K=1;
const fit=()=>{K=screen.clientWidth/1280;os.style.transform=`scale(${K})`};
new ResizeObserver(fit).observe(screen);fit();
// ── hình nền ──
$("#stars").innerHTML=Array.from({length:44},(_,i)=>{const r=k=>((Math.sin(i*k)*9301)%1+1)%1;return `<span class="st" style="left:${(r(12.9)*100).toFixed(1)}%;top:${(r(78.2)*48).toFixed(1)}%;opacity:${(.25+r(3.3)*.6).toFixed(2)}"></span>`}).join("");
(function(){const c=$("#city"),g=c.getContext("2d");let x=0,i=0;const rnd=()=>((Math.sin(++i*12.9898)*43758.5453)%1+1)%1;
  while(x<320){const w=14+Math.floor(rnd()*22),h=24+Math.floor(rnd()*60);g.fillStyle=rnd()>.5?"#1a1230":"#221838";g.fillRect(x,90-h,w,h);
    for(let yy=90-h+4;yy<86;yy+=6)for(let xx=x+3;xx<x+w-3;xx+=5)if(rnd()>.62){g.fillStyle=rnd()>.3?"#ffc97a":"#ff9db8";g.globalAlpha=.55+rnd()*.45;g.fillRect(xx,yy,2,2);g.globalAlpha=1}
    x+=w+1}})();
const tick=()=>{const d=new Date();$("#clock").textContent=["CN","T2","T3","T4","T5","T6","T7"][d.getDay()]+" "+d.getDate()+" thg "+(d.getMonth()+1)+"  "+d.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})};tick();setInterval(tick,15000);
$("#apple").onclick=e=>{e.stopPropagation();const m=$("#appmenu");m.hidden=!m.hidden;$("#apple").classList.toggle("open",!m.hidden)};
$("#appmenu").onclick=e=>{const b=e.target.closest("[data-m]");if(!b)return;$("#appmenu").hidden=true;$("#apple").classList.remove("open");const m=b.dataset.m;
  if(m==="off")return shutdown();if(m==="about")notify("learn","Máy tính Góc học","3 ứng dụng chạy trên laptop trong phòng của bạn.");else openApp(m)};
os.addEventListener("click",e=>{if(!e.target.closest("#appmenu,#apple")){$("#appmenu").hidden=true;$("#apple").classList.remove("open")}});

// ── biểu tượng ──
const ICON={
 learn:`<svg viewBox="0 0 48 48"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd99c"/><stop offset="1" stop-color="#e8a24a"/></linearGradient></defs><rect width="48" height="48" rx="11" fill="url(#g1)"/><path d="M12 14h11a3 3 0 0 1 3 3v19a3 3 0 0 0-3-3H12z M36 14H27a3 3 0 0 0-1 .2V36a3 3 0 0 1 3-3h7z" fill="#2a1a0e" opacity=".85"/></svg>`,
 tapes:`<svg viewBox="0 0 48 48"><defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc6d6"/><stop offset="1" stop-color="#e2729a"/></linearGradient></defs><rect width="48" height="48" rx="11" fill="url(#g2)"/><rect x="9" y="14" width="30" height="20" rx="3" fill="#2a1a0e" opacity=".85"/><circle cx="18" cy="24" r="4" fill="#ffc6d6"/><circle cx="30" cy="24" r="4" fill="#ffc6d6"/><rect x="18" y="22.5" width="12" height="3" fill="#ffc6d6" opacity=".5"/></svg>`,
 arcade:`<svg viewBox="0 0 48 48" shape-rendering="crispEdges"><defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dccdff"/><stop offset="1" stop-color="#8a6be0"/></linearGradient></defs><rect width="48" height="48" rx="11" fill="url(#g3)"/><path d="M10 18h28v14H10z" fill="#2a1a0e" opacity=".85"/><path d="M14 23h2v-2h2v2h2v2h-2v2h-2v-2h-2z" fill="#dccdff"/><rect x="29" y="21" width="3" height="3" fill="#ff9db8"/><rect x="33" y="25" width="3" height="3" fill="#ffc97a"/></svg>`,
 project:`<svg viewBox="0 0 48 48"><defs><linearGradient id="g5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8f5cf"/><stop offset="1" stop-color="#3fae73"/></linearGradient></defs><rect width="48" height="48" rx="11" fill="url(#g5)"/><rect x="9" y="12" width="30" height="24" rx="4" fill="#12231a" opacity=".9"/><path d="M15 21l4 3-4 3M22 28h9" stroke="#b8f5cf" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 trash:`<svg viewBox="0 0 48 48"><rect x="11" y="10" width="26" height="4" rx="2" fill="#d9d4e6"/><path d="M13 16h22l-2 24a3 3 0 0 1-3 2H18a3 3 0 0 1-3-2z" fill="#bdb5d3" opacity=".9"/><path d="M19 20v18M24 20v18M29 20v18" stroke="#8a82a3" stroke-width="1.5"/></svg>`};
const APPS={learn:"Sổ Học",project:"Bàn thí nghiệm",arcade:"Pixel Quán"};
function renderIcons(){
  const unseen=0;
  $("#icons").innerHTML=Object.keys(APPS).map(k=>`<button class="ic" data-app="${k}"><span class="badge">${ICON[k]}${k==="tapes"&&unseen?`<span class="dot-new">${unseen}</span>`:""}</span>${APPS[k]}</button>`).join("");
  $("#dock").innerHTML=Object.keys(APPS).map(k=>`<button data-app="${k}" data-dock="${k}" class="${wins[k]?"run":""}" aria-label="${APPS[k]}"><span class="badge">${ICON[k]}${k==="tapes"&&unseen?`<span class="dot-new">${unseen}</span>`:""}</span><span class="tip">${APPS[k]}</span></button>`).join("")+`<span class="sep"></span><button aria-label="Thùng rác" data-trash>${ICON.trash}<span class="tip">Thùng rác</span></button>`;
}
os.addEventListener("click",e=>{const b=e.target.closest("[data-app]");if(b)openApp(b.dataset.app);if(e.target.closest("[data-trash]"))notify("learn","Thùng rác trống","Không có gì để dọn.")});
// Dock phóng to khi rê chuột, như macOS
const dock=$("#dock");
let dockX=[],dockRaf=0;
dock.addEventListener("mouseenter",()=>{dockX=[...dock.querySelectorAll("button")].map(b=>{const r=b.getBoundingClientRect();return r.left+r.width/2})});
dock.addEventListener("mousemove",e=>{if(RM||dockRaf)return;const cx=e.clientX;dockRaf=requestAnimationFrame(()=>{dockRaf=0;dock.querySelectorAll("button").forEach((b,i)=>{const d=Math.abs(cx-dockX[i])/K;const s=1+.6*Math.max(0,1-d/120);b.style.transform=`translateY(${-(s-1)*22}px) scale(${s})`})})});
dock.addEventListener("mouseleave",()=>dock.querySelectorAll("button").forEach(b=>b.style.transform=""));

// ── cửa sổ macOS ──
const wins={};let zTop=10;
const RECTS={learn:[40,40,1090,650],project:[30,34,1150,660],arcade:[170,70,900,600]};
const osXY=el=>{const o=os.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:(r.left-o.left)/K,y:(r.top-o.top)/K,w:r.width/K,h:r.height/K}};
const dockIcon=k=>{const b=dock.querySelector(`[data-dock="${k}"]`);return b?osXY(b):{x:640,y:740,w:54,h:54}};
function bounce(k){if(RM)return;const b=dock.querySelector(`[data-dock="${k}"] .badge`);if(b)b.animate([{transform:"none"},{transform:"translateY(-20px)",offset:.25},{transform:"none",offset:.5},{transform:"translateY(-12px)",offset:.72},{transform:"none"}],{duration:900,easing:"ease-in-out"})}
function openApp(k){
  const w0=wins[k];
  if(w0){if(w0.min)restore(k);else focusWin(k);return w0}
  const [x,y,w,h]=RECTS[k];
  const el=document.createElement("section");el.className="win";el.setAttribute("aria-label",APPS[k]);
  el.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  el.innerHTML=`<div class="tb"><div class="lights"><button class="c" aria-label="Đóng"><svg viewBox="0 0 8 8"><path d="M1.5 1.5l5 5m0-5l-5 5" stroke="#4d0000" stroke-width="1.2"/></svg></button><button class="m" aria-label="Thu nhỏ vào Dock"><svg viewBox="0 0 8 8"><path d="M1 4h6" stroke="#5a3d00" stroke-width="1.3"/></svg></button><button class="z" aria-label="Phóng to"><svg viewBox="0 0 8 8"><path d="M1.5 5V1.5H5zM6.5 3v3.5H3z" fill="#004d00"/></svg></button></div><div class="t">${APPS[k]}</div></div><div class="wb"></div>`;
  $("#wins").appendChild(el);wins[k]={el,body:el.querySelector(".wb"),min:false};
  el.addEventListener("pointerdown",()=>focusWin(k));
  el.querySelector(".c").onclick=e=>{e.stopPropagation();closeWin(k)};
  el.querySelector(".m").onclick=e=>{e.stopPropagation();minimize(k)};
  el.querySelector(".z").onclick=e=>{e.stopPropagation();zoom(k)};
  el.querySelector(".tb").ondblclick=e=>{if(!e.target.closest(".lights"))zoom(k)};
  drag(el,el.querySelector(".tb"));
  ({learn:mountDict,project:mountProject,arcade:mountArcade})[k](wins[k].body);
  renderIcons();focusWin(k);bounce(k);
  // mở: cửa sổ phóng ra từ biểu tượng trên Dock
  if(!RM){const d=dockIcon(k);el.animate([{transform:`translate(${d.x+d.w/2-(x+w/2)}px,${d.y+d.h/2-(y+h/2)}px) scale(.06)`,opacity:0},{opacity:1,offset:.35},{transform:"none",opacity:1}],{duration:480,easing:"cubic-bezier(.2,.9,.25,1)"})}
  return wins[k];
}

// Thu nhỏ vào Dock: bản gốc chụp cửa sổ bằng html2canvas (~200 KB từ CDN, chụp lúc rê chuột) rồi vẽ canvas từng dải 2px.
// Bản này chỉ dùng clip-path + transform trên GPU: không tải thêm gì, không chụp, không chặn luồng chính.
function genieFrames(k){const w=wins[k],r=osXY(w.el),d=dockIcon(k),c=d.x+d.w/2-r.x;
  const L=Math.max(-50,(c-d.w/2)/r.w*100),R=Math.min(150,(c+d.w/2)/r.w*100);
  return[{clipPath:"polygon(0% 0%,100% 0%,100% 100%,0% 100%)",transform:"none",opacity:1},
    {clipPath:`polygon(0% 0%,100% 0%,${R}% 100%,${L}% 100%)`,transform:`translateY(${(d.y-r.y)*.12}px)`,opacity:1,offset:.42},
    {clipPath:`polygon(${L}% 0%,${R}% 0%,${R}% 100%,${L}% 100%)`,transform:`translateY(${d.y-r.y}px) scaleY(.06)`,opacity:.2}]}
async function minimize(k){const w=wins[k];if(!w||w.min||w.busy)return;w.busy=true;w.el.querySelector("video")?.pause();if(k==="arcade")pauseGame();
  w.min=true;
  if(!RM){w.el.style.transformOrigin="50% 0";w.el.style.willChange="transform,clip-path";await w.el.animate(genieFrames(k),{duration:560,easing:"cubic-bezier(.55,.05,.6,.9)"}).finished;w.el.style.transformOrigin="";w.el.style.willChange=""}
  w.el.hidden=true;w.busy=false;topName()}
async function restore(k){const w=wins[k];if(w.busy)return;w.busy=true;w.min=false;
  w.el.hidden=false;focusWin(k);
  if(!RM){w.el.style.transformOrigin="50% 0";w.el.style.willChange="transform,clip-path";await w.el.animate(genieFrames(k).reverse(),{duration:480,easing:"cubic-bezier(.25,.6,.35,1)"}).finished;w.el.style.transformOrigin="";w.el.style.willChange=""}
  w.busy=false}

function closeWin(k,now){const w=wins[k];if(!w)return;w.el.querySelector("video")?.pause();if(k==="arcade")stopGame();delete wins[k];renderIcons();topName();
  if(RM||now||w.min){w.el.remove();return}
  w.el.style.pointerEvents="none";w.el.animate([{transform:"none",opacity:1},{transform:"scale(.9)",opacity:0}],{duration:200,easing:"ease-in",fill:"forwards"}).finished.then(()=>w.el.remove())}
function zoom(k){const el=wins[k].el,a=osXY(el);el.classList.toggle("zoomed");const b=osXY(el);
  if(!RM)el.animate([{transform:`translate(${a.x-b.x}px,${a.y-b.y}px) scale(${a.w/b.w},${a.h/b.h})`,transformOrigin:"0 0"},{transform:"none",transformOrigin:"0 0"}],{duration:340,easing:"cubic-bezier(.2,.9,.25,1)"})}
function topWin(){const v=Object.entries(wins).filter(([,w])=>!w.min).sort((a,b)=>b[1].el.style.zIndex-a[1].el.style.zIndex);return v.length?v[0][0]:null}
function focusWin(k){Object.entries(wins).forEach(([n,w])=>w.el.classList.toggle("dim",n!==k));wins[k].el.style.zIndex=++zTop;$("#appName").textContent=APPS[k]}
function topName(){const t=topWin();if(t)focusWin(t);else $("#appName").textContent="Finder"}
// drag: bản gốc ghi left/top (ép layout) trên MỖI pointermove. Nay gom theo khung hình, dùng transform, chốt left/top khi nhả.
function drag(el,h){h.addEventListener("pointerdown",e=>{if(e.target.closest(".lights")||el.classList.contains("zoomed"))return;
  const sx=e.clientX,sy=e.clientY,ox=parseFloat(el.style.left),oy=parseFloat(el.style.top);let dx=0,dy=0,raf=0;h.setPointerCapture(e.pointerId);
  el.classList.add("dragging");el.style.willChange="transform";
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const paint=()=>{raf=0;el.style.transform=`translate(${dx}px,${dy}px)`};
  const mv=ev=>{dx=clamp(ox+(ev.clientX-sx)/K,-el.offsetWidth+120,1200)-ox;dy=clamp(oy+(ev.clientY-sy)/K,26,740)-oy;if(!raf)raf=requestAnimationFrame(paint)};
  const up=()=>{h.removeEventListener("pointermove",mv);cancelAnimationFrame(raf);el.style.left=ox+dx+"px";el.style.top=oy+dy+"px";el.style.transform="";el.style.willChange="";el.classList.remove("dragging")};
  h.addEventListener("pointermove",mv);h.addEventListener("pointerup",up,{once:true});h.addEventListener("pointercancel",up,{once:true})})}
function notify(app,title,body,act){const n=document.createElement("button");n.className="note";n.innerHTML=`${ICON[app]}<span><b>${esc(title)}</b>${esc(body)}</span><small>bây giờ</small>`;
  n.onclick=()=>{n.remove();if(act)act()};$("#notes").appendChild(n);setTimeout(()=>{if(!n.isConnected)return;n.animate([{transform:"none",opacity:1},{transform:"translateX(380px)",opacity:0}],{duration:350,easing:"ease-in"}).finished.then(()=>n.remove())},7000)}
// ── Sổ Học: từ điển tra hàm theo môn ──
// Mỗi mục: nhóm (học phần), tên, chữ ký, giải thích, ví dụ, kết quả in ra (null = không in gì cố định), bài dùng tới.
const DICT={python:[
 ["M1 · Python nền tảng","print()","print(*values, sep=' ', end='\\n')","In một hay nhiều giá trị ra màn hình, cách nhau bằng sep và kết thúc bằng end.",'print("Doanh thu:", 12 + 9)\nprint("latte", "mocha", sep=" | ")',"Doanh thu: 21\nlatte | mocha","PY01 · Chạy một phép tính và đọc kết quả"],
 ["M1 · Python nền tảng","type()","type(object)","Cho biết kiểu dữ liệu của một giá trị. Dùng khi không chắc một biến đang là số hay chuỗi.",'print(type(12), type("12"))',"<class 'int'> <class 'str'>","PY04 · Biến, tên hợp lệ và kiểu dữ liệu"],
 ["M1 · Python nền tảng","int() / str()","int(x)   str(x)","Đổi kiểu: chuỗi chữ số thành số nguyên, số thành chuỗi. Không đổi thì cộng chuỗi với số sẽ lỗi.",'so_coc = int("12") + 3\nprint(str(so_coc) + " cốc")',"15 cốc","PY04 · Biến, tên hợp lệ và kiểu dữ liệu"],
 ["M1 · Python nền tảng","round()","round(number, ndigits=None)","Làm tròn tới ndigits chữ số sau dấu phẩy.","print(round(15000 / 7, 1))","2142.9","PY05 · Phép toán và thứ tự tính"],
 ["M1 · Python nền tảng","len()","len(s)","Đếm số phần tử: số ký tự của chuỗi, số món trong list, số khoá trong dict.",'print(len("cà phê"), len(["latte", "mocha"]))',"6 2","PY06 · Chuỗi, dấu nháy và ký tự xuống dòng"],
 ["M1 · Python nền tảng","s[a:b]","chuoi[bat_dau:ket_thuc]","Cắt một đoạn chuỗi từ vị trí a tới trước vị trí b. Vị trí đếm từ 0.",'ten = "Americano"\nprint(ten[0:4], ten[-4:])',"Amer cano","PY07 · Lấy ký tự và một đoạn chuỗi"],
 ["M1 · Python nền tảng","str.strip()","s.strip(chars=None)","Bỏ khoảng trắng (hoặc ký tự chỉ định) ở hai đầu chuỗi. Hay đi kèm .lower(), .title().",'mon = "  latte  "\nprint(mon.strip().title())',"Latte","PY08 · Chuẩn hóa và định dạng văn bản"],
 ["M1 · Python nền tảng","f-string",'f"...{bieu_thuc:dinh_dang}..."',"Chèn giá trị vào chuỗi. Sau dấu hai chấm là định dạng, ví dụ :, để thêm dấu phân cách hàng nghìn.",'gia = 45000\nprint(f"Latte: {gia:,} đ")',"Latte: 45,000 đ","PY08 · Chuẩn hóa và định dạng văn bản"],
 ["M1 · Python nền tảng","str.split()","s.split(sep=None)","Tách chuỗi thành list theo ký tự phân cách. Ngược lại là sep.join(list).",'mon = "latte,mocha".split(",")\nprint(mon)\nprint(" + ".join(mon))',"['latte', 'mocha']\nlatte + mocha","PY08 · Chuẩn hóa và định dạng văn bản"],
 ["M1 · Python nền tảng","if / elif / else","if dieu_kien: ... elif ...: ... else: ...","Chạy khối lệnh đầu tiên có điều kiện đúng.",'coc = 12\nif coc > 20:\n    print("Rất đông")\nelif coc > 10:\n    print("Đông khách")\nelse:\n    print("Vắng")',"Đông khách","PY09 · Điều kiện, so sánh và khối lệnh"],
 ["M1 · Python nền tảng","list.append() / pop()","lst.append(x)   lst.pop(i=-1)","append thêm vào cuối list; pop lấy ra và xoá phần tử ở vị trí i (mặc định phần tử cuối).",'don = ["latte"]\ndon.append("mocha")\nprint(don.pop(0), don)',"latte ['mocha']","PY10 · List: lấy, thêm và xóa phần tử"],
 ["M1 · Python nền tảng","tuple","(a, b, ...)","Dãy không sửa được. Hay dùng để trả nhiều giá trị và gỡ ra nhiều biến.","diem = (10, 20)\nx, y = diem\nprint(x + y)","30","PY11 · Tuple, bytes và lựa chọn collection"],
 ["M1 · Python nền tảng","dict.get()","d.get(key, default=None)","Lấy giá trị theo khoá; khoá không có thì trả default thay vì báo KeyError.",'gia = {"latte": 45}\nprint(gia.get("latte"), gia.get("mocha", 0))',"45 0","PY12 · Dictionary và tra cứu theo khóa"],
 ["M1 · Python nền tảng","dict.items()","d.items()","Duyệt cả khoá và giá trị cùng lúc.",'gia = {"latte": 45, "mocha": 50}\nfor mon, tien in gia.items():\n    print(mon, tien)',"latte 45\nmocha 50","PY12 · Dictionary và tra cứu theo khóa"],
 ["M1 · Python nền tảng","set &  |  -","a & b   a | b   a - b","Phép giao, hợp, hiệu của hai tập hợp. Phần tử trong set không trùng nhau.",'sang = {"latte", "mocha"}\nchieu = {"mocha", "tra"}\nprint(sang & chieu)',"{'mocha'}","PY13 · Set và so sánh hai nhóm"],
 ["M1 · Python nền tảng","range()","range(start, stop, step=1)","Dãy số nguyên từ start tới trước stop, nhảy step.","print(list(range(1, 10, 3)))","[1, 4, 7]","PY14 · For, range và biến tích lũy"],
 ["M1 · Python nền tảng","enumerate()","enumerate(iterable, start=0)","Duyệt list mà vẫn có số thứ tự.",'for i, mon in enumerate(["latte", "mocha"], start=1):\n    print(i, mon)',"1 latte\n2 mocha","PY14 · For, range và biến tích lũy"],
 ["M1 · Python nền tảng","while / break","while dieu_kien: ...  break","Lặp khi điều kiện còn đúng; break thoát vòng lặp ngay.","n = 0\nwhile True:\n    n += 1\n    if n == 3:\n        break\nprint(n)","3","PY15 · While, break và continue"],
 ["M1 · Python nền tảng","def / return","def ten(tham_so=mac_dinh): return ...","Định nghĩa hàm. Tham số có giá trị mặc định thì có thể bỏ khi gọi.","def tong(a, b=0):\n    return a + b\n\nprint(tong(2), tong(2, 3))","2 5","PY16 · Hàm, giá trị trả về và docstring"],
 ["M1 · Python nền tảng","lambda / sorted(key=)","sorted(iterable, key=lambda x: ...)","Hàm ngắn một dòng, hay dùng làm khoá sắp xếp.",'mon = [("latte", 45), ("mocha", 50), ("tra", 30)]\nprint(sorted(mon, key=lambda m: m[1]))',"[('tra', 30), ('latte', 45), ('mocha', 50)]","PY17 · Scope, tham chiếu hàm và callback"],
 ["M1 · Python nền tảng","try / except","try: ... except LoaiLoi as e: ...","Bắt lỗi để chương trình không dừng giữa chừng, rồi xử lý dữ liệu không hợp lệ.",'try:\n    int("abc")\nexcept ValueError as e:\n    print("Không phải số:", e)',"Không phải số: invalid literal for int() with base 10: 'abc'","PY18 · Ngoại lệ và dữ liệu không hợp lệ"],
 ["M2 · NumPy","np.array()","np.array(object, dtype=None)","Tạo array từ list. Phép tính trên array áp lên từng phần tử.","import numpy as np\na = np.array([12, 9, 15])\nprint(a * 2)","[24 18 30]","NP01 · Array là gì?"],
 ["M2 · NumPy","np.arange()","np.arange(start, stop, step)","Như range() nhưng trả về array.","import numpy as np\nprint(np.arange(0, 10, 3))","[0 3 6 9]","NP05 · Tạo dãy bằng arange"],
 ["M2 · NumPy","reshape() / shape","a.reshape(hang, cot)   a.shape","Xếp lại array thành bảng; shape cho biết số hàng, số cột.","import numpy as np\nb = np.arange(6).reshape(2, 3)\nprint(b.shape)\nprint(b)","(2, 3)\n[[0 1 2]\n [3 4 5]]","NP08 · Xếp lại bằng reshape"],
 ["M2 · NumPy","sum(axis=)","a.sum(axis=None)","axis=0 cộng dồn theo cột, axis=1 cộng theo hàng, không ghi axis thì cộng cả bảng.","import numpy as np\nb = np.array([[1, 2], [3, 4]])\nprint(b.sum(axis=0), b.sum(axis=1), b.sum())","[4 6] [3 7] 10","NP11 · Tổng từng cột: axis=0"],
 ["M2 · NumPy","mask: a[a > x]","a[dieu_kien]","So sánh tạo dãy True/False, dùng nó để lọc phần tử.","import numpy as np\na = np.array([12, 9, 15])\nprint(a > 10)\nprint(a[a > 10])","[ True False  True]\n[12 15]","NP14 · Lọc dữ liệu bằng mask"],
 ["M2 · NumPy","np.nanmean()","np.nanmean(a)","Trung bình bỏ qua ô NaN (dữ liệu thiếu). np.mean thường sẽ ra nan.","import numpy as np\na = np.array([1.0, np.nan, 3.0])\nprint(np.mean(a), np.nanmean(a))","nan 2.0","NP17 · Dữ liệu thiếu: NaN"],
 ["M3 · pandas","pd.DataFrame()","pd.DataFrame(data)","Tạo bảng từ dict: mỗi khoá là một cột.",'import pandas as pd\ndf = pd.DataFrame({"mon": ["latte", "mocha"], "coc": [12, 9]})\nprint(df)',"     mon  coc\n0  latte   12\n1  mocha    9","PD02 · DataFrame: đọc một bảng nhỏ"],
 ["M3 · pandas","df.loc[]","df.loc[hang, cot]","Chọn theo nhãn hoặc điều kiện. iloc chọn theo vị trí số.",'import pandas as pd\ndf = pd.DataFrame({"mon": ["latte", "mocha"], "coc": [12, 9]})\nprint(df.loc[df["coc"] > 10, "mon"])',"0    latte\nName: mon, dtype: object","PD03 · Chọn hàng và cột bằng loc, iloc"],
 ["M3 · pandas","isna().sum()","df[cot].isna().sum()","Đếm ô thiếu trong một cột, nên làm trước khi điền hay bỏ.",'import pandas as pd\ndf = pd.DataFrame({"coc": [12, None, 9]})\nprint(df["coc"].isna().sum())',"1","PD08 · Ô thiếu: phát hiện trước khi điền"],
 ["M3 · pandas","value_counts()","s.value_counts()","Đếm số lần mỗi giá trị xuất hiện, xếp từ nhiều tới ít.",'import pandas as pd\nprint(pd.Series(["latte", "mocha", "latte"]).value_counts())',"latte    2\nmocha    1\nName: count, dtype: int64","PD11 · Sắp xếp và nhìn nhanh phân bố"],
 ["M3 · pandas","pd.read_csv()","pd.read_csv(duong_dan, parse_dates=[...])","Đọc file CSV thành DataFrame; parse_dates đọc cột ngày thành kiểu ngày.",'import pandas as pd\ndon = pd.read_csv("don.csv", parse_dates=["ngay"])\nprint(don.dtypes)',null,"PD12 · Đọc CSV và giữ đúng ý nghĩa cột"],
 ["M3 · pandas","groupby()","df.groupby(cot)[cot_tinh].sum()","Gom các hàng cùng giá trị rồi tính tổng, trung bình… cho từng nhóm.",'import pandas as pd\ndf = pd.DataFrame({"mon": ["latte", "latte", "mocha"], "coc": [3, 4, 9]})\nprint(df.groupby("mon")["coc"].sum())',"mon\nlatte    7\nmocha    9\nName: coc, dtype: int64","PD14 · Groupby: tổng hợp theo nhóm"],
 ["M3 · pandas","pd.merge()","pd.merge(trai, phai, on=khoa, how='left')","Nối hai bảng theo cột khoá. Kiểm số dòng trước và sau khi nối để bắt khoá trùng.",'import pandas as pd\nbang = pd.merge(don, mon, on="ma_mon", how="left")\nprint(len(don), len(bang))',null,"PD16 · Merge: nối đơn hàng với bảng món"],
 ["M4 · Trực quan hóa","plt.subplots()","fig, ax = plt.subplots(figsize=(rong, cao))","Tạo khung hình (Figure) và vùng vẽ (Axes); mọi lệnh vẽ gọi trên ax.",'import matplotlib.pyplot as plt\nfig, ax = plt.subplots(figsize=(6, 3))\nax.plot([1, 2, 3], [12, 9, 15])\nax.set_title("Cốc bán theo ngày")',null,"VZ02 · Figure, Axes và biểu đồ đầu tiên"],
 ["M4 · Trực quan hóa","ax.bar()","ax.bar(nhan, gia_tri)","Biểu đồ cột để so sánh các nhóm. Nên sắp thứ tự trước khi vẽ.",'import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\nax.bar(["latte", "mocha", "tra"], [12, 9, 15])\nax.set_ylabel("Số cốc")',null,"VZ04 · Bar chart: so sánh nhóm và sắp thứ tự"],
 ["M4 · Trực quan hóa","fig.savefig()","fig.savefig(ten_file, dpi=150, bbox_inches='tight')","Lưu biểu đồ ra PNG/SVG. bbox_inches='tight' cắt bỏ lề thừa.",'fig.savefig("bieu-do.png", dpi=150, bbox_inches="tight")',null,"VZ14 · Xuất PNG/SVG, độ phân giải và vòng đời Figure"],
 ["M5 · Python ứng dụng","date - date","(ngay2 - ngay1).days","Trừ hai ngày ra một khoảng thời gian; .days là số ngày.","from datetime import date\nprint((date(2026, 11, 23) - date(2026, 11, 1)).days)","22","SY01 · Đọc ngày tháng và tính khoảng thời gian"],
 ["M5 · Python ứng dụng","re.findall()","re.findall(mau, chuoi)","Tìm mọi đoạn khớp mẫu regex, trả về list.",'import re\nprint(re.findall(r"\\d+", "Bàn 3 gọi 2 ly"))',"['3', '2']","SY03 · Tìm và sửa mẫu văn bản bằng regex"],
 ["M5 · Python ứng dụng","class / __init__","class Ten: def __init__(self, ...): ...","Khuôn tạo object; __init__ gán dữ liệu riêng cho từng object.",'class Mon:\n    def __init__(self, ten, gia):\n        self.ten = ten\n        self.gia = gia\n\nlatte = Mon("latte", 45)\nprint(latte.ten, latte.gia)',"latte 45","SY05 · Class và object: mỗi món có dữ liệu riêng"],
 ["M5 · Python ứng dụng","with open()","with open(duong_dan, mode, encoding='utf-8') as f:","Mở file và tự đóng khi ra khỏi khối with. 'w' ghi đè, 'a' ghi nối, 'r' đọc.",'with open("don.txt", "w", encoding="utf-8") as f:\n    f.write("latte\\n")',null,"SY15 · Mở file: đọc, ghi đè, nối và tạo mới"],
 ["M6 · Tiến trình và luồng","subprocess.run()","subprocess.run(lenh, capture_output=True, text=True)","Chạy một chương trình khác rồi chờ nó xong; lấy output và mã thoát.",'import subprocess\nkq = subprocess.run(["python", "--version"], capture_output=True, text=True)\nprint(kq.returncode, kq.stdout)',null,"CT07 · Chạy lệnh, tách output và mã thoát"],
 ["M6 · Tiến trình và luồng","threading.Thread","Thread(target=ham, args=(...))","Chạy một hàm ở luồng riêng; start() để chạy, join() để chờ xong.",'from threading import Thread\n\ndef pha(mon):\n    print("pha", mon)\n\nt = Thread(target=pha, args=("latte",))\nt.start()\nt.join()',"pha latte","CT10 · Tạo thread bằng target, start và join"],
 ["M6 · Tiến trình và luồng","Lock","with lock: ...","Chỉ cho một luồng vào đoạn sửa dữ liệu chung tại một thời điểm, tránh race condition.","from threading import Lock\nlock = Lock()\nso_coc = 0\nwith lock:\n    so_coc += 1\nprint(so_coc)","1","CT12 · Race condition, Lock và tránh deadlock"],
 ["M6 · Tiến trình và luồng","queue.Queue","q.put(x)   q.get()","Hàng đợi an toàn giữa các luồng: một bên put, bên kia get theo thứ tự vào trước ra trước.",'from queue import Queue\nq = Queue()\nq.put("latte")\nq.put("mocha")\nprint(q.get(), q.qsize())',"latte 1","CT13 · Queue và lưu pickle có nén ở nền"]
]};
const SUBJECTS=[["python","Python"],["sql","SQL"],["js","JavaScript"]];
const fold=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const hlPy=src=>src.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])).replace(/(#.*$)|(f?"[^"\n]*"|f?'[^'\n]*')|\b(def|return|if|elif|else|for|in|while|break|continue|try|except|as|import|from|with|class|lambda|True|False|None|and|or|not|raise)\b|\b(\d+(?:\.\d+)?)\b/gm,
  (m,c,s,k,num)=>c?`<span class="c">${c}</span>`:s?`<span class="s">${s}</span>`:k?`<span class="k">${k}</span>`:`<span class="n">${num}</span>`);
let dSub="python",dSel=0,dQ="";
function mountDict(body){
  body.innerHTML=`<div class="dict"><div class="dtool">
    <label class="dsearch"><svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/></svg><input id="dq" type="search" placeholder="Tìm hàm, ví dụ: groupby, cat chuoi" aria-label="Tìm trong từ điển"></label>
    <div class="dsub" role="group" aria-label="Môn">${SUBJECTS.map(([id,t])=>`<button data-sub="${id}" class="${DICT[id]?"":"soon"}" aria-pressed="${id===dSub}">${t}${DICT[id]?"":" · sắp có"}</button>`).join("")}</div>
    <span class="dcount" id="dcount"></span></div>
    <div class="dbody"><nav class="dlist" id="dlist" aria-label="Danh sách mục"></nav><article class="dview" id="dview"></article></div></div>`;
  const q=body.querySelector("#dq");q.value=dQ;q.oninput=()=>{dQ=q.value;renderDict()};
  body.querySelector(".dsub").onclick=e=>{const b=e.target.closest("[data-sub]");if(!b)return;dSub=b.dataset.sub;body.querySelectorAll(".dsub button").forEach(x=>x.setAttribute("aria-pressed",x===b));renderDict()};
  body.querySelector("#dlist").onclick=e=>{const b=e.target.closest("[data-i]");if(b){dSel=+b.dataset.i;renderDict()}};
  body.querySelector("#dview").onclick=e=>{
    if(e.target.closest("[data-copy]")){const code=DICT.python[dSel][4],btn=e.target.closest("[data-copy]");
      Promise.resolve().then(()=>navigator.clipboard.writeText(code)).then(()=>{btn.textContent="✓ Đã chép"},()=>{btn.textContent="Chọn code rồi Ctrl C"});setTimeout(()=>btn.textContent="Chép code",1800)}
    const l=e.target.closest("[data-lesson]");if(l)toastS("Bài "+l.dataset.lesson+" nằm ở trang Học tiếp")};
  renderDict();setTimeout(()=>q.focus({preventScroll:true}),60);
}
function renderDict(){
  const list=$("#dlist"),view=$("#dview");if(!list)return;
  const data=DICT[dSub];
  if(!data){list.innerHTML="";$("#dcount").textContent="";
    view.innerHTML=`<div class="dempty"><div><b>Từ điển ${SUBJECTS.find(s=>s[0]===dSub)[1]} chưa có</b>Mục này tự mở khi Góc học có khoá ${SUBJECTS.find(s=>s[0]===dSub)[1]}. Hiện tại tra được Python.</div></div>`;return}
  const k=fold(dQ.trim());
  const toks=k.split(/\s+/).filter(Boolean);const hits=data.map((e,i)=>[e,i]).filter(([e])=>{const hay=fold(e[1]+" "+e[2]+" "+e[3]+" "+e[0]+" "+e[6]);return toks.every(t=>hay.includes(t))});
  $("#dcount").textContent=hits.length+" mục";
  if(!hits.some(([,i])=>i===dSel)&&hits.length)dSel=hits[0][1];
  let g="";list.innerHTML=hits.map(([e,i])=>{const head=e[0]!==g?`<h5>${esc(e[0])}</h5>`:"";g=e[0];return head+`<button data-i="${i}" class="${i===dSel?"on":""}">${esc(e[1])}<small>${esc(e[6].split(" · ")[0])}</small></button>`}).join("");
  if(!hits.length){view.innerHTML=`<div class="dempty"><div><b>Không thấy "${esc(dQ)}"</b>Thử tên hàm khác, hoặc gõ không dấu.</div></div>`;return}
  const e=data[dSel];
  view.innerHTML=`<div class="grp">${esc(e[0])}</div><h2>${esc(e[1])}</h2><div><code class="dsig">${esc(e[2])}</code></div><p>${esc(e[3])}</p>
    <div class="dlab">VÍ DỤ<button class="btn ghost" data-copy style="height:24px;font-size:11.5px">Chép code</button></div><pre class="dcode">${hlPy(e[4])}</pre>
    ${e[5]!=null?`<div class="dlab">KẾT QUẢ IN RA</div><pre class="dout">${esc(e[5])}</pre>`:""}
    <div class="dfoot"><span style="font-size:12.5px;color:rgba(255,255,255,.55)">Dùng trong bài</span><button class="btn blue" data-lesson="${esc(e[6])}">${esc(e[6])} →</button></div>`;
  view.scrollTop=0;list.querySelector(".on")?.scrollIntoView({block:"nearest"});
}

// ── Băng Ôn ──
// ── Pixel Quán: "Mèo Bắt Bug" ──
let G=null;
function mountArcade(body){
  body.innerHTML=`<div class="arc"><div class="gl">
    <button class="gcard sel"><b>Mèo Bắt Bug</b><span>Hứng hạt cà phê, né con bug. Chơi được.</span></button>
    <div class="gcard soon"><b>Xếp Hàng Queue</b><span>Sắp có</span></div>
    <div class="gcard soon"><b>Ghép Kiểu Dữ Liệu</b><span>Sắp có</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:6px">← → hoặc A D để di chuyển. Rê chuột trên màn chơi cũng được.</div></div>
    <div class="gv"><div class="gbar"><span id="gScore">ĐIỂM 0</span><span id="gLives">♥♥♥</span><span id="gBest">KỶ LỤC ${S.best||0}</span></div>
    <canvas id="gc" width="256" height="144" tabindex="0" aria-label="Màn chơi Mèo Bắt Bug"></canvas>
    <div class="pad"><button data-k="-1" aria-label="Sang trái">◀</button><button id="gStart">BẮT ĐẦU</button><button data-k="1" aria-label="Sang phải">▶</button></div></div></div>`;
  G={c:body.querySelector("#gc"),run:false,over:false,raf:0,keys:0,hold:0};G.g=G.c.getContext("2d");G.g.imageSmoothingEnabled=false;resetGame();drawGame();
  body.querySelector("#gStart").onclick=()=>{if(G.over)resetGame();G.run=!G.run;body.querySelector("#gStart").textContent=G.run?"TẠM DỪNG":"TIẾP TỤC";if(G.run){G.last=performance.now();loop()};G.c.focus({preventScroll:true})};
  body.querySelectorAll(".pad [data-k]").forEach(b=>{b.onpointerdown=()=>G.hold=+b.dataset.k;b.onpointerup=b.onpointerleave=()=>G.hold=0});
  G.c.addEventListener("pointermove",e=>{const r=G.c.getBoundingClientRect();G.tx=(e.clientX-r.left)/r.width*256});
  G.c.addEventListener("pointerleave",()=>G.tx=null);
}
const CAT=["..o......o..",".ooo....ooo.",".oooooooooo.","oowoooooowoo","oobooooooboo","ooooopoooooo","oooooooooooo",".oooooooooo.",".oo......oo."];
const PAL={o:"#c9b3ff",w:"#fff6ee",b:"#2a1a0e",p:"#ff9db8"};
function resetGame(){Object.assign(G,{x:122,items:[],score:0,lives:3,t:0,spawn:0,speed:28,over:false,tx:null});hud()}
function hud(){const b=document.querySelector("#gScore");if(!b)return;b.textContent="ĐIỂM "+G.score;document.querySelector("#gLives").textContent="♥".repeat(G.lives)+"♡".repeat(3-G.lives);document.querySelector("#gBest").textContent="KỶ LỤC "+(S.best||0)}
function loop(){if(!G||!G.run)return;const now=performance.now(),dt=Math.min(.05,(now-G.last)/1000);G.last=now;step(dt);drawGame();G.raf=requestAnimationFrame(loop)}
function step(dt){
  const dir=G.keys||G.hold;if(dir)G.x+=dir*110*dt;else if(G.tx!=null)G.x+=Math.max(-110*dt,Math.min(110*dt,G.tx-6-G.x));
  G.x=Math.max(2,Math.min(242,G.x));G.t+=dt;G.speed=28+G.t*1.6;G.spawn-=dt;
  if(G.spawn<=0){const r=Math.random();G.items.push({x:6+Math.random()*240,y:-6,k:r<.62?"bean":r<.93?"bug":"star"});G.spawn=Math.max(.32,1-G.t*.012)}
  for(const it of G.items){it.y+=G.speed*dt*(it.k==="bug"?1.15:1);
    if(it.y>116&&it.y<130&&it.x>G.x-4&&it.x<G.x+14){it.dead=1;if(it.k==="bean")G.score+=1;else if(it.k==="star")G.score+=5;else{G.lives--;G.flash=.3}}
    if(it.y>150)it.dead=1}
  G.items=G.items.filter(i=>!i.dead);G.flash=Math.max(0,(G.flash||0)-dt);
  if(G.lives<=0){G.run=false;G.over=true;if(G.score>(S.best||0)){S.best=G.score;save()}const b=document.querySelector("#gStart");if(b)b.textContent="CHƠI LẠI"}
  hud();
}
function drawGame(){
  const g=G.g;g.fillStyle="#120c24";g.fillRect(0,0,256,144);
  g.fillStyle="#1d1533";for(let i=0;i<256;i+=24)g.fillRect(i,100+((i/24)%3)*4,20,44);
  g.fillStyle="#3b2d66";g.fillRect(0,132,256,12);g.fillStyle="#5a4690";g.fillRect(0,132,256,1);
  for(let i=0;i<14;i++){g.fillStyle=i%3?"#ffc97a":"#ff9db8";g.globalAlpha=.4+(Math.sin(G.t*2+i)+1)*.25;g.fillRect(8+i*18,6+(i%2)*3,2,2)}g.globalAlpha=1;
  for(const it of G.items){const x=Math.round(it.x),y=Math.round(it.y);
    if(it.k==="bean"){g.fillStyle="#8a5a3c";g.fillRect(x,y,4,5);g.fillStyle="#5a3a22";g.fillRect(x+2,y,1,5)}
    else if(it.k==="star"){g.fillStyle="#ffc97a";g.fillRect(x+2,y,1,5);g.fillRect(x,y+2,5,1);g.fillRect(x+1,y+1,3,3)}
    else{g.fillStyle="#ff5a6e";g.fillRect(x,y+1,5,3);g.fillStyle="#2a1a0e";g.fillRect(x-1,y+1,1,1);g.fillRect(x+5,y+1,1,1);g.fillRect(x-1,y+3,1,1);g.fillRect(x+5,y+3,1,1);g.fillRect(x+1,y,1,1);g.fillRect(x+3,y,1,1)}}
  const cx=Math.round(G.x),cy=122;CAT.forEach((row,j)=>[...row].forEach((ch,i)=>{if(PAL[ch]){g.fillStyle=G.flash>0&&ch==="o"?"#ff5a6e":PAL[ch];g.fillRect(cx+i,cy+j,1,1)}}));
  g.font="8px monospace";g.textAlign="center";
  if(!G.run){g.fillStyle="rgba(13,11,19,.6)";g.fillRect(0,0,256,144);g.fillStyle="#fff6ee";g.fillText(G.over?"HẾT LƯỢT · "+G.score+" ĐIỂM":"MÈO BẮT BUG",128,62);g.fillStyle="#ffc97a";g.fillText(G.over?"bấm CHƠI LẠI":"hạt cà phê +1 · sao +5 · bug -1 mạng",128,78)}
}
function pauseGame(){if(G&&G.run){G.run=false;const b=document.querySelector("#gStart");if(b)b.textContent="TIẾP TỤC";drawGame()}}
function stopGame(){if(G){G.run=false;cancelAnimationFrame(G.raf);G=null}}
document.addEventListener("keydown",e=>{if(!G||!wins.arcade||wins.arcade.min||topWin()!=="arcade")return;
  if(["ArrowLeft","a","A"].includes(e.key)){G.keys=-1;e.preventDefault()}if(["ArrowRight","d","D"].includes(e.key)){G.keys=1;e.preventDefault()}});
document.addEventListener("keyup",e=>{if(G&&["ArrowLeft","ArrowRight","a","A","d","D"].includes(e.key))G.keys=0});
document.addEventListener("visibilitychange",()=>{if(document.hidden){pauseGame();document.querySelectorAll("video").forEach(v=>v.pause())}});
// ── Mini Project: chạy Python thật bằng Pyodide trong worker ──
const SANDBOX_CODE='# Gõ code Python rồi bấm Chạy (Ctrl + Enter)\nprint("Xin chào Góc học!")\n';
const PROJECTS=[
  {m:0,sandbox:true,title:"Chạy thử mã",from:"bàn thí nghiệm",mins:0,xp:0,runnable:true,
   brief:["Gõ hoặc dán code Python rồi bấm <b>Chạy</b>. Nút chạy thử trong bài học sẽ đưa code sang đây."],steps:[],tests:[],starter:SANDBOX_CODE,solution:""},
 {m:0,title:"Hoá đơn quán cà phê",from:"PY10–PY18",mins:30,xp:60,runnable:true,
  brief:["Quán cần một đoạn code tính tiền cho mỗi đơn. Giá trong bảng tính bằng <b>nghìn đồng</b>.","Món không có trong bảng giá (ví dụ <code>banh mi</code>) thì bỏ qua, không được làm chương trình dừng."],
  steps:[["Viết <code>tinh_hoa_don(don, bang_gia)</code> trả tổng tiền các món trong <code>don</code>. Gợi ý: <code>dict.get(mon, 0)</code>.",[0,1,2]],["Viết <code>dinh_dang(tien)</code> nhận số nghìn đồng, trả chuỗi như <code>\"95,000 đ\"</code>. Gợi ý: f-string với <code>:,</code>.",[3,4]],["Bấm <b>Chạy</b> để in tổng tiền của đơn mẫu.",null]],
  starter:'BANG_GIA = {"latte": 45, "mocha": 50, "tra dao": 35}\n\ndef tinh_hoa_don(don, bang_gia):\n    tong = 0\n    # TODO: cộng giá từng món, món lạ thì bỏ qua\n    return tong\n\ndef dinh_dang(tien):\n    # TODO: 95 -> "95,000 đ"\n    return ""\n\ndon = ["latte", "tra dao", "banh mi"]\nprint("Tổng:", dinh_dang(tinh_hoa_don(don, BANG_GIA)))\n',
  solution:'BANG_GIA = {"latte": 45, "mocha": 50, "tra dao": 35}\n\ndef tinh_hoa_don(don, bang_gia):\n    tong = 0\n    for mon in don:\n        tong += bang_gia.get(mon, 0)\n    return tong\n\ndef dinh_dang(tien):\n    return f"{tien * 1000:,} đ"\n\ndon = ["latte", "tra dao", "banh mi"]\nprint("Tổng:", dinh_dang(tinh_hoa_don(don, BANG_GIA)))\n',
  tests:[['tinh_hoa_don(["latte", "mocha"], {"latte": 45, "mocha": 50})',"95"],['tinh_hoa_don([], {"latte": 45})',"0"],['tinh_hoa_don(["latte", "tra sua", "latte"], {"latte": 45})',"90"],["dinh_dang(95)","'95,000 đ'"],["dinh_dang(1250)","'1,250,000 đ'"]]},
 {m:1,title:"Bảng số cốc của quán",from:"NP23",mins:40,xp:80},
 {m:2,title:"Báo cáo đơn hàng có thể đối chiếu",from:"PD32",mins:60,xp:120},
 {m:4,title:"Đổi persistence sang pickle có nén",from:"SY28 · PW6",mins:45,xp:90},
 {m:7,title:"Màn hình nhận đơn tại quầy bằng Tkinter",from:"GU12 · PW9",mins:60,xp:120},
 {m:10,title:"Một trang báo cáo về bảng số liệu thật",from:"TH07 · dự án cuối khoá",mins:90,xp:200}];
let pSel=0,PY={w:null,ready:false,fatal:null,seq:0,wait:{}};
const PKEY="pe-laptop-proj-v1";
let PS={};try{PS=JSON.parse(localStorage.getItem(PKEY)||"{}")}catch{}
const psave=()=>{try{localStorage.setItem(PKEY,JSON.stringify(PS))}catch{}};
function pyStart(){
  if(PY.w)return;PY.ready=false;PY.fatal=null;
  // runtime Pyodide cùng origin (/pyodide/v314.0.7/), cùng cách nạp với bài học: worker tự khởi động, nạp một lần
  try{PY.w=new Worker("py-worker.js",{type:"module"})}catch{PY.fatal="Trình duyệt không cho chạy Web Worker.";pyPill();return}
  PY.w.onmessage=e=>{const d=e.data;if(d.ready){PY.ready=true;pyPill()}else if(d.fatal){PY.fatal=d.fatal;pyPill()}else if(PY.wait[d.id]){PY.wait[d.id](d);delete PY.wait[d.id]}};
  PY.w.onerror=()=>{PY.fatal="Không nạp được Python.";pyPill()};
  pyPill();
}
// giới hạn 5 giây như bài học: worker treo (vòng lặp vô hạn) thì terminate rồi dựng worker mới ở nền
function pyRun(code,tests){return new Promise(res=>{const id=++PY.seq;PY.wait[id]=res;PY.w.postMessage({id,code,tests});
  setTimeout(()=>{if(PY.wait[id]){delete PY.wait[id];PY.w.terminate();PY.w=null;pyStart();res({timeout:true})}},PY.ready?5000:60000)})}
function pyPill(){const p=$("#pypill");if(!p)return;p.className="pill2 "+(PY.fatal?"bad":PY.ready?"ok":"warn");p.textContent=PY.fatal?"Python không chạy được ở đây":PY.ready?"● Python sẵn sàng":"Python đang khởi động…";p.title=PY.fatal||""}
const pOpen=()=>true;
function mountProject(body){body.innerHTML=`<div class="prj"><div class="plist" id="plist"></div><div class="pmain" id="pmain"></div></div>`;
  $("#plist").onclick=e=>{const b=e.target.closest("[data-p]");if(b){pSel=+b.dataset.p;renderProject()}};renderProject();pyStart()}
function renderProject(){
  const list=$("#plist"),main=$("#pmain");if(!list)return;
  list.innerHTML=`<h4>Mini project theo học phần</h4>`+PROJECTS.map((p,i)=>`<button class="pitem ${i===pSel?"sel":""} ${pOpen(i)?"":"lock"}" data-p="${i}"><b>${pOpen(i)?"":"🔒 "}${esc(p.title)}</b><span>${p.sandbox?"Python thật, không chấm điểm":`${MODS[p.m][0]} · ${p.mins} phút${PS[i]&&PS[i].done?" · ✓ xong":""}`}</span></button>`).join("");
  const p=PROJECTS[pSel],st=PS[pSel]||(PS[pSel]={});
  const hd=`<div class="phd"><div style="flex:1;min-width:0"><small>${p.sandbox?"BÀN THÍ NGHIỆM":`${MODS[p.m][0]} · DỰA TRÊN ${esc(p.from)}`}</small><b>${esc(p.title)}</b></div>${p.runnable?'<span id="pypill" class="pill2 warn"></span>':""}${p.sandbox?"":`<span class="pill2">${p.mins} phút</span>`}</div>`;
  if(!p.runnable){main.innerHTML=hd+`<div class="dempty"><div><b>Đề bài đang soạn</b>Dự án này chưa mở.</div></div>`;return}
  const code=st.code??p.starter;
  main.innerHTML=hd+`<div class="pgrid"><div class="pbrief">${p.brief.map(x=>`<p>${x}</p>`).join("")}
      <ol class="psteps" id="psteps">${p.steps.map(([t],i)=>`<li class="${(st.steps||[])[i]?"done":""}"><i>${(st.steps||[])[i]?"✓":i+1}</i><span>${t}</span></li>`).join("")}</ol>
      <div id="pdone">${st.done?'<div class="pdone"><b>✓ Hoàn thành mini project</b><br>Lời giải mẫu đã mở. Tiến độ này lưu trên máy bạn.</div>':""}</div></div>
    <div class="pwork"><div class="ptool"><button class="btn blue" id="prun">▶ Chạy</button>${p.tests.length?'<button class="btn mint" id="ptest">✓ Nộp &amp; chấm</button>':""}<span class="sp"></span><button class="btn ghost" id="preset">↺ Mã ban đầu</button>${st.done?'<button class="btn ghost" id="psol">Lời giải mẫu</button>':""}</div>
      <div class="ped"><div class="gut" id="pgut"></div><textarea id="pcode" spellcheck="false" aria-label="Code Python"></textarea></div>
      <div class="pconlab"><span>KẾT QUẢ</span><span style="font-weight:400;letter-spacing:0">Ctrl + Enter để chạy</span></div><pre class="pcon" id="pcon"><span class="dim">Bấm Chạy để xem output.${p.tests.length?` Nộp &amp; chấm chạy ${p.tests.length} ca kiểm thử.`:""}</span></pre></div></div>`;
  const ta=$("#pcode");ta.value=code;const fitEd=()=>{$("#pgut").textContent=ta.value.split("\n").map((_,i)=>i+1).join("\n");ta.style.height="auto";ta.style.height=ta.scrollHeight+"px"};fitEd();
  ta.oninput=()=>{st.code=ta.value;psave();fitEd()};
  ta.onkeydown=e=>{if(e.key==="Tab"){e.preventDefault();const s=ta.selectionStart;ta.setRangeText("    ",s,ta.selectionEnd,"end");ta.oninput()}
    else if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();runP(false)}else if(e.key==="Escape")e.stopPropagation()};
  $("#prun").onclick=()=>runP(false);if($("#ptest"))$("#ptest").onclick=()=>runP(true);
  $("#preset").onclick=()=>{ta.value=p.starter;ta.oninput()};
  if($("#psol"))$("#psol").onclick=()=>{ta.value=p.solution;ta.oninput()};
  pyPill();
}
async function runP(test){
  const p=PROJECTS[pSel],st=PS[pSel],con=$("#pcon");if(!con)return;
  if(PY.fatal){con.innerHTML=`<span class="er">${esc(PY.fatal)}</span>\n<span class="dim">Code chạy bằng Pyodide cùng origin như bài học.</span>`;return}
  con.innerHTML=`<span class="dim">${PY.ready?"Đang chạy…":"Python đang khởi động (lần đầu mất vài giây)…"}</span>`;
  $("#prun").disabled=true;if($("#ptest"))$("#ptest").disabled=true;
  const r=await pyRun($("#pcode").value,test?p.tests:null);
  $("#prun").disabled=false;if($("#ptest"))$("#ptest").disabled=false;
  if(r.timeout){con.innerHTML='<span class="er">Quá 5 giây — có thể có vòng lặp vô hạn. Python đã được khởi động lại.</span>';return}
  let html=esc(r.out||"");if(r.error)html+=`<span class="er">${esc(r.error)}</span>`;if(!r.out&&!r.error)html+='<span class="dim">(không in gì)</span>';
  st.steps=st.steps||[];
  if(/Tổng:\s*\S/.test(r.out||""))st.steps[2]=true;
  if(r.results&&r.results.length){const ok=r.results.filter(x=>x[3]).length;
    html+=`\n<span class="dim">── ${ok}/${r.results.length} ca đạt ──</span>\n`+r.results.map(([ex,exp,got,pass])=>pass?`<span class="t-ok">✓ ${esc(ex)}</span>`:`<span class="t-bad">✗ ${esc(ex)}\n   cần ${esc(exp)}, nhận ${esc(got)}</span>`).join("\n");
    p.steps.forEach(([,idx],i)=>{if(idx)st.steps[i]=idx.every(j=>r.results[j][3])});
    if(ok===r.results.length&&!st.done){st.done=true;psave();renderProject();toastS("Hoàn thành mini project");$("#pcon").innerHTML=html;return}}
  psave();con.innerHTML=html;
  document.querySelectorAll("#psteps li").forEach((li,i)=>{li.classList.toggle("done",!!st.steps[i]);li.querySelector("i").textContent=st.steps[i]?"✓":i+1});
}
renderIcons();
try{const m=/^#code=(.*)$/.exec(location.hash);if(m){const c=decodeURIComponent(m[1]);const st=PS[0]||(PS[0]={});st.code=c;psave();pSel=0;history.replaceState(null,"",location.pathname);setTimeout(()=>openApp("project"),650)}}catch{}
// làm ấm Python lúc rảnh để lần đầu bấm Chạy trong Mini Project không phải chờ nạp ~13 MB
(window.requestIdleCallback||(f=>setTimeout(f,1500)))(()=>{if(!PY.w&&!document.hidden)pyStart()},{timeout:4000});
// Esc đóng menu, rồi tới cửa sổ trên cùng
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!$("#appmenu").hidden){$("#appmenu").hidden=true;$("#apple").classList.remove("open");return}const t=topWin();if(t)closeWin(t)});

// Tắt máy: đóng hết cửa sổ, dừng game/Python, màn hình co lại như CRT rồi đen; bấm nút nguồn để bật lại.
let isOff=false;
async function shutdown(){
  if(isOff)return;isOff=true;$("#appmenu").hidden=true;$("#apple").classList.remove("open");
  Object.keys(wins).forEach(k=>closeWin(k,true));
  if(PY.w){PY.w.terminate();PY.w=null;PY.ready=false}
  os.style.setProperty("--k",K);os.classList.add("shutting");
  await new Promise(r=>setTimeout(r,RM?0:700));
  $("#offscr").hidden=false;$("#pwron").focus({preventScroll:true});
  // máy tắt thì rời giao diện máy tính: báo trang cha gập laptop về phòng (bấm nút nguồn chỉ còn là đường dự phòng khi chạy lẻ)
  await new Promise(r=>setTimeout(r,RM?0:900));
  if(isOff&&parent!==window)parent.postMessage({type:"pe-mac:off"},location.origin);
}
function powerOn(){
  if(!isOff)return;isOff=false;$("#offscr").hidden=true;
  os.classList.remove("shutting","mac-boot");void os.offsetWidth;os.style.transform=`scale(${K})`;os.classList.add("mac-boot");
  renderIcons();(window.requestIdleCallback||(f=>setTimeout(f,1500)))(()=>{if(!PY.w&&!isOff)pyStart()},{timeout:4000});
}
$("#pwr").onclick=shutdown;$("#pwron").onclick=powerOn;
