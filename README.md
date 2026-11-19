# GitHub Home

หน้า home สำหรับแสดง repository ทั้งหมดจาก GitHub พร้อม search / filter / sort
รองรับ 2 โหมด: รันในเครื่องผ่าน `gh` CLI (เห็น private repo) และ static บน GitHub Pages

**เว็บออนไลน์:** <https://wor9world.github.io/>

## วิธีรัน

```powershell
node server.mjs
```

แล้วเปิด <http://127.0.0.1:4173>

> ต้องมี Node.js 18+ และ `gh` CLI ที่ล็อกอินอยู่ (`gh auth status`)
> ถ้า `npm` ถูกบล็อกด้วย execution policy ก็ใช้ `node server.mjs` ได้เลย

## เปลี่ยนบัญชีที่แสดง

```powershell
$env:GITHUB_USER = "worrrrrr"
node server.mjs
```

- บัญชี public ทั่วไป: ไม่ต้องล็อกอินเพิ่ม
- อยากเห็น private repo ของบัญชี/org อื่น: ใช้ token ที่มีสิทธิ์อ่าน
  ```powershell
  $env:GITHUB_TOKEN = "ghp_..."
  ```

ตัวเลือกอื่น:

| env | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `GITHUB_USER` | `wor9world` | บัญชีที่ดึง repo |
| `PORT` | `4173` | พอร์ตของเว็บ |
| `HOST` | `127.0.0.1` | ใช้ `0.0.0.0` เพื่อให้เครื่องอื่นในวง LAN เปิดได้ |
| `CACHE_TTL_MS` | `120000` | ระยะเวลา cache ข้อมูล (มิลลิวินาที) |

## ฟีเจอร์

- การ์ด repo พร้อมภาษา, ดาว, fork, topic, commit ล่าสุด และเวลาอัปเดต
- ค้นหาจากชื่อ / คำอธิบาย / ภาษา / topic
- กรองตามภาษา และเรียงตามอัปเดต / ชื่อ / ดาว / วันที่สร้าง
- สลับมุมมองการ์ด–รายการ (จำค่าไว้ใน localStorage)
- ธีมสว่าง/มืด ตามระบบ พร้อมปุ่มสลับ (ใส่ `?theme=dark` ใน URL เพื่อบังคับได้)
- ปุ่มรีเฟรชดึงข้อมูลใหม่ (ข้าม cache)
- ปุ่มลัด `/` เพื่อโฟกัสช่องค้นหา, `Esc` เพื่อล้างคำค้นหา
- ถ้า `gh` ใช้ไม่ได้ จะ fallback ไป GitHub REST API แบบ public

## GitHub Pages (static mode)

หน้าเว็บเดียวกันนี้ถูก deploy ผ่าน GitHub Actions ไปที่
<https://wor9world.github.io/> โดย publish เฉพาะโฟลเดอร์ `public/`

- ตั้งค่าบัญชีที่ใช้บน Pages ได้ที่ `public/config.js`
- บน Pages จะดึง GitHub REST API จาก browser โดยตรง จึงเห็น **เฉพาะ repo public**
- workflow อยู่ที่ `.github/workflows/pages.yml` (รันทุกครั้งที่ push เข้า `main`)

## โครงสร้าง

```
server.mjs         เซิร์ฟเวอร์ HTTP + ตัวดึงข้อมูล GitHub (ไม่มี dependency)
public/index.html  หน้าเว็บ
public/styles.css  ธีมและ layout
public/app.js      fetch + render + interaction (รองรับ server และ static)
public/config.js   บัญชี GitHub สำหรับโหมด static
.github/workflows  GitHub Actions สำหรับ deploy Pages
```

## API

`GET /api/repos` — ข้อมูลโปรไฟล์และ repo ทั้งหมด (cache 2 นาที)
`GET /api/repos?refresh=1` — บังคับดึงใหม่
