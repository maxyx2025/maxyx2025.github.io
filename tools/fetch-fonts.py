#!/usr/bin/env python3
# 字体自托管：按站点实际用字，从 Google Fonts 镜像抓取所需 unicode-range 子集
import re, os, sys, subprocess, collections

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

def fetch(url):
    last = None
    for attempt in range(4):
        r = subprocess.run(
            ["curl", "-sS", "--fail", "--max-time", "60", "-A", UA, url],
            capture_output=True)
        if r.returncode == 0:
            return r.stdout
        last = r.stderr.decode("utf-8", "replace").strip()
    raise RuntimeError(f"fetch failed after retries: {url}\n{last}")
CSS_URL = "https://fonts.googleapis.cn/css2?family=Inter:wght@400;500;600;700&display=swap"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "fonts")

# 1. 收集站点用字（4 个页面全文 + README 标题用不到，跳过）
chars = set()
for f in ["index.html", "index-zh.html"]:
    chars.update(open(os.path.join(ROOT, f), encoding="utf-8").read())
chars = {c for c in chars if not c.isspace()}
print(f"site chars: {len(chars)}")

# 2. 抓取 css2
css = fetch(CSS_URL).decode("utf-8")

# 3. 解析 @font-face 块（CJK 子集块无注释，注释可有可无）
blocks = [(m.group(1) or "subset", m.group(2)) for m in re.finditer(r"(?:/\*\s*([^*]+?)\s*\*/\s*)?@font-face\s*\{([^}]+)\}", css)]
print(f"font-face blocks: {len(blocks)}")

def parse_ur(ur):
    spans = []
    for part in ur.split(","):
        part = part.strip().upper()
        if not part.startswith("U+"): continue
        part = part[2:]
        if "-" in part:
            a, b = part.split("-", 1)
        else:
            a = b = part
        lo = int(a.replace("?", "0"), 16)
        hi = int(b.replace("?", "F"), 16)
        spans.append((lo, hi))
    return spans

kept = []
for subset, body in blocks:
    fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
    style = re.search(r"font-style:\s*(\w+)", body).group(1)
    weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
    url = re.search(r"url\((https://[^)]+)\)", body).group(1)
    ur = re.search(r"unicode-range:\s*([^;]+);", body).group(1)
    spans = parse_ur(ur)
    hit = any(lo <= ord(c) <= hi for c in chars for lo, hi in spans)
    if hit:
        kept.append((subset, fam, style, weight, url, ur, body))
print(f"kept subsets: {len(kept)}")

# 4. 下载字体文件
os.makedirs(OUT_DIR, exist_ok=True)
total = 0
dl = 0
for subset, fam, style, weight, url, ur, body in kept:
    slug = fam.lower().replace(" ", "")
    fname = url.rsplit("/", 1)[-1]
    d = os.path.join(OUT_DIR, slug)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, fname)
    if not os.path.exists(p):
        open(p, "wb").write(fetch(url))
        dl += 1
    total += os.path.getsize(p)
print(f"downloaded: {dl}, total size: {total//1024}KB")

# 5. 生成本地 fonts.css（仅保留用到的子集，URL 改为相对路径）
out = []
for subset, fam, style, weight, url, ur, body in kept:
    slug = fam.lower().replace(" ", "")
    fname = url.rsplit("/", 1)[-1]
    nb = re.sub(r"url\(https://[^)]+\)", f"url({slug}/{fname})", body)
    # block：文字短暂不可换，待字体就绪后直接以正确字体首屏，避免回落闪烁
    nb = nb.replace("font-display: swap", "font-display: block")
    out.append(f"/* {subset} */\n@font-face {{{nb}}}")
css_out = "\n".join(out) + "\n"
css_out = re.sub(r"\s+", " ", css_out)  # 压缩空白（字体清单类 CSS，无需保留格式）
open(os.path.join(OUT_DIR, "fonts.css"), "w", encoding="utf-8").write(css_out)
print("fonts/fonts.css written,", len(css_out)//1024, "KB")

# 6. 覆盖校验：站点用字必须全部命中某个保留子集
all_spans = []
for subset, fam, style, weight, url, ur, body in kept:
    all_spans.extend(parse_ur(ur))
missing = sorted(c for c in chars if not any(lo <= ord(c) <= hi for lo, hi in all_spans))
print("uncovered chars:", "".join(missing) if missing else "NONE (all covered)")
