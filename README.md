# SURVIVAL // เกมเอาตัวรอด

เกม 2D Survival Hazard สไตล์ Neon Arcade — พื้นที่ (Arena) คือศัตรู ผู้เล่นต้องหลบอันตรายให้รอดนานที่สุด ไม่มีเสียงในเกม ทุกอย่างสื่อสารผ่านภาพ (VFX) เท่านั้น

## วิธีเล่น (Setup)

ไม่ต้องติดตั้งอะไรเพิ่มเติม:

1. คัดลอกโฟลเดอร์ `survival-hazard/` ทั้งหมด
2. เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ (ดับเบิลคลิก หรือใช้ Live Server)
3. เริ่มเล่นได้ทันที

โปรเจกต์นี้เป็น HTML/CSS/JavaScript ล้วน (ไม่มี build step, ไม่มี dependency ภายนอก) ใช้ Canvas 2D สำหรับกราฟิกทั้งหมด

## การควบคุม

| ผู้เล่น | เคลื่อนที่ | พุ่งหลบ (Dash) |
|---|---|---|
| P1 | W A S D | Shift (ซ้าย/ขวา) |
| P2 | ลูกศร ↑ ↓ ← → | / (Slash) หรือ Right Ctrl |

## โครงสร้างโปรเจกต์

```
survival-hazard/
├── index.html          จุดเริ่มต้น + DOM ของทุกหน้าจอ (เมนู, HUD, ผลลัพธ์)
├── style.css            ธีม Neon Arcade ทั้งหมด
├── js/
│   ├── utils.js          ฟังก์ชันช่วยทั่วไป (random, clamp, distance, ฯลฯ)
│   ├── config.js          ค่าคอนฟิกทั้งหมดที่ปรับสมดุลเกมได้ (ตัวเลขทุกอย่างรวมที่นี่)
│   ├── persistence.js     บันทึกสถิติ/คะแนนสูงสุดผ่าน localStorage
│   ├── vfx.js             ระบบอนุภาค, หน้าจอสั่น, แฟลช, วงแหวนคลื่น
│   ├── input.js           อ่านสถานะคีย์บอร์ดของทั้งสองผู้เล่น
│   ├── arena.js            สนามเล่น + พื้นหลัง + การหด (shrink)
│   ├── collision.js       ฟังก์ชันตรวจการชนที่ระบบอื่นเรียกใช้ร่วมกัน
│   ├── player.js           Energy Core: การเคลื่อนที่, Dash, ชีวิต, อมตะชั่วคราว, โล่
│   ├── hazard.js            คลาสฐาน Hazard (Telegraph→Warning→Active→Recovery)
│   │                        + Hazard แต่ละชนิด (Bomb, Laser Sweep, Rotating Laser,
│   │                        Falling Object, Moving Wall)
│   ├── hazardManager.js    กำหนดจังหวะการเกิด Hazard และรวมเป็น Pattern
│   ├── powerup.js           นิยามไอเทมเสริมพลังแต่ละชนิด
│   ├── powerupManager.js    การเกิด/เก็บ/หมดอายุของไอเทม + แม่เหล็ก
│   ├── score.js              ระบบคะแนนและคอมโบ (รองรับ 1-2 ผู้เล่น)
│   ├── difficulty.js        แปลงเวลาที่รอดเป็น "เลเวลความยาก"
│   ├── events.js             Event พิเศษ (Blackout, Chaos, Shrink, Bonus, Rush)
│   ├── ui.js                  อัปเดต DOM ทั้งหมด (HUD, เมนู, ผลลัพธ์) — ภาษาไทยทั้งหมด
│   ├── game.js                State machine หลัก, game loop, ผูกทุกระบบเข้าด้วยกัน
│   └── main.js                จุดเริ่มต้นโปรแกรม
└── assets/                (ว่างไว้สำหรับใช้ในอนาคต — ปัจจุบันกราฟิกทั้งหมดวาดด้วยโค้ด)
```

## แนวทางต่อยอด (สำหรับนักพัฒนา/AI ที่มาต่อ)

- **เพิ่ม Hazard ใหม่**: สร้างคลาสใน `hazard.js` (extend `Hazard`, implement `overlapsCircle()` + `draw()`) แล้วเพิ่ม factory function ใน `HAZARD_FACTORIES` ของ `hazardManager.js` ไม่ต้องแก้ไฟล์อื่น
- **เพิ่ม Pattern ใหม่**: เพิ่มรายการใน `PATTERNS` array ของ `hazardManager.js`
- **เพิ่ม Power-up ใหม่**: เพิ่ม entry ใน `POWERUP_TYPES` ของ `powerup.js` พร้อมฟังก์ชัน `apply(player, game)`
- **เพิ่ม Event ใหม่**: เพิ่ม entry ใน `EVENT_DEFS` ของ `events.js` แล้วผูก effect ใน `EventSystem`
- **ปรับสมดุลเกม**: ตัวเลขเกือบทั้งหมด (ความเร็ว, เวลาตอบสนอง, ความถี่การเกิด) รวมอยู่ใน `config.js` ไฟล์เดียว
- **เพิ่มโหมดเกมใหม่**: `game.js` ใช้ `this.mode` ('solo' | 'duo') ควบคุม flow — เพิ่มโหมดใหม่โดยขยาย state machine ใน `Game` โดยไม่กระทบระบบอื่น

ระบบต่าง ๆ ถูกออกแบบให้เชื่อมกันหลวม ๆ (loosely coupled) — `game.js` เป็นจุดเดียวที่รู้จักทุกระบบ ส่วนระบบย่อยแต่ละตัวไม่ผูกติดกันโดยตรง เพื่อให้แก้ไข/ต่อยอดทีละส่วนได้โดยไม่กระทบส่วนอื่น
