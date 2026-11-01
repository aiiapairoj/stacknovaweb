StackNova
================================
คุณคือผู้เชี่ยวชาญด้านการออกแบบเว็บไซต์ ผมต้องการให้คุณออกแบบเว็บหน้าหลัก (home page) + login/register modal ในตัวเลย ที่ใช้งานจริงได้ พร้อมข้อมูลจำลองเสมือนจริง ไม่ใช่แบบ concept ด้วย web design trend ที่อัพเดทล่าสุดของปี 2026
เป็นเว็บสำหรับจากข้อมูลของ ### 2.1 Agency Public Site | หน้าแรก
### 2.1 Agency Public Site | หน้าแรก
Route: `/` · ผู้ใช้: ลูกค้าปลายทาง (ส่วนใหญ่มาจากมือถือ ผ่าน Google, AI Search, LINE, Social)
เป้าหมาย: ภายใน 5 วินาทีต้องรู้ว่า "ทำอะไร ที่ไหน น่าเชื่อถือไหม คุยยังไง"
Sections:
1. Hero: headline บอกบริการ + พื้นที่, ภาพผลงานเด่น, CTA หลัก "ประเมินราคาฟรีกับ AI" (เปิด 2.6) + CTA รอง "ดูผลงาน"
2. Trust Bar: จำนวนผลงาน, คะแนนรีวิวเฉลี่ย, ปีประสบการณ์ (ข้อมูลจริงจาก 1.12)
3. บริการ (การ์ด 3-6 รายการ พร้อมช่วงราคา จาก 1.6)
4. ผลงานล่าสุด (Grid จาก 1.12 อัปเดตอัตโนมัติ)
5. ขั้นตอนการทำงาน (Process จาก Vertical Pack)
6. รีวิว (Carousel)
7. FAQ (5 ข้อยอดนิยม)
8. CTA ปิดท้าย + ช่องทางติดต่อ
Sticky Mobile Bar: แชท AI | LINE | โทร
Floating Chat Widget: ทุกหน้า
SEO/GEO: schema Organization + LocalBusiness + AggregateRating, คำอธิบายธุรกิจแบบสั้นที่อ่านแล้วตอบคำถาม "ใครคือ X"


====================================
เชื่อมโยง: 2.2, 2.4, 2.6, 2.7, 2.10
---
-----------------------------------
ให้มี layout style : Structured Grid + Zoning + Adaptive Layout
------------------------------------
ใช้ color palette: # misc 7 (10) — Data Visualization Infographic Google Slides
## Typography Guideline
### Primary Font: Plus Jakarta Sans + Outfit
Plus Jakarta Sans provides high-density, legible labels for multi-category charts. Outfit delivers punchy, rounded numbers and titles.
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```
```css
body {
font-family: 'Plus Jakarta Sans', sans-serif;
}
h1, h2, h3, .chart-title {
font-family: 'Outfit', sans-serif;
}
```
### Typography Feel
- High-contrast data-first dashboard style with rapid cognitive recognition
- Vibrant coral-orange hero title balanced by lime-green and sky-blue chart markers
- Dark slate panels designed to make quantitative metrics glow
- Clear multi-channel infographics including funnels, pie charts, and grid blocks
## Typography Hierarchy
```css
.hero-title {
font-family: 'Outfit', sans-serif;
font-size: 60px;
line-height: 0.94;
font-weight: 800;
letter-spacing: -0.03em;
}
.section-title {
font-family: 'Outfit', sans-serif;
font-size: 26px;
line-height: 1.2;
font-weight: 700;
}
.card-title {
font-family: 'Outfit', sans-serif;
font-size: 16px;
line-height: 1.35;
font-weight: 600;
}
.body-text {
font-family: 'Plus Jakarta Sans', sans-serif;
font-size: 13px;
line-height: 1.6;
font-weight: 400;
color: #FFFFFF;
}
.stat-large {
font-family: 'Outfit', sans-serif;
font-size: 44px;
font-weight: 800;
}
.label {
font-family: 'Plus Jakarta Sans', sans-serif;
font-size: 11px;
font-weight: 700;
letter-spacing: 0.08em;
text-transform: uppercase;
}
```


===================================
## Color Palette Guideline
| Role | Hex | Usage |
| --- | --- | --- |
| Neon Coral Orange | #F75A38 | cover banner background, primary data category, key metric |
| Lime Green | #C4E864 | contrast tag, pie chart sector A, outer presentation canvas |
| Deep Slate Charcoal | #222426 | dashboard container background, dark card backdrop |
| Sky Blue | #7CA4F8 | category C metric, bar chart fill, funnel tip |
| Pure White | #FFFFFF | main display typography, metric numerals |
| Muted Silver Grey | #A4A8B0 | axis labels, secondary chart legend |
## Recommended Web Color System
```css
:root {
--color-coral: #F75A38;
--color-lime: #C4E864;
--color-sky-blue: #7CA4F8;
--color-slate-dark: #222426;
--color-surface: #FFFFFF;
--color-text-on-dark: #FFFFFF;
--color-text-muted: #A4A8B0;
--color-border-dark: #34363A;
}
```
## Color Usage Rules
```css
.hero-banner {
background: #F75A38;
color: #FFFFFF;
border-radius: 12px;
}
.dashboard-card {
background: #222426;
border: 1px solid #34363A;
border-radius: 10px;
color: #FFFFFF;
}
.chart-bar-coral {
background: #F75A38;
border-radius: 4px;
}
.chart-bar-lime {
background: #C4E864;
border-radius: 4px;
}
.chart-bar-blue {
background: #7CA4F8;
border-radius: 4px;
}
.tag-lime {
background: #C4E864;
color: #222426;
font-weight: 700;
border-radius: 20px;
padding: 4px 14px;
}
```
## Recommended Pairing
| Background | Text | Accent |
| --- | --- | --- |
| #F75A38 | #FFFFFF | #C4E864 |
| #222426 | #FFFFFF | #C4E864 |
| #222426 | #FFFFFF | #F75A38 |
| #222426 | #FFFFFF | #7CA4F8 |
| #C4E864 | #222426 | #F75A38 |
------------------------------------


นอกจากนั้นแล้วให้มีคุณสมบัติดั่งนี้:
- template ต้อง Fully responsive รองรับ ทั้งขนาดจอของ desktop, mobile and tablet ด้วย โดยใช้ tailwindcss
- winner takes most
- micro-animation ที่ smooth
- layout ที่ breathing room ดี ไม่แน่นเกินไป
- เป็นภาษาอังกฤษทั้งหมด เลือกใช้ฟอนต์จาก google font
- inner ของแต่ละ section ให้มี max-width เป็น 1280px และรองรับ responsive ทุกขนาดจอ devices
- currency in baht dollar ในกรณีต้องใช้
- ให้เป็น minimal เต็มรูปแบบ และ background ของทุก section รวมทั้ง header, hero และ footer ต้องเป็นสีขาวทั้งหมดด้วย แต่เน้นการใช้รูปประกอบจริง ( ใช้รูปจาก free stockphoto ที่เกี่ยวข้อง) ส่วน typography, component, card ต่างๆ ให้มีความเป็น vibrant color ตามโทนสีใน color palette guideline ที่ได้ให้ไป
- การออกแบบที่เน้นจิตวิทยาการขาย (CRO), และดีไซน์ที่มีรสนิยมสูงแบบที่ AI ยังเลียนแบบความ "Human Touch" ไม่ได้ **** สำคัญมาก
- ใส่ข้อมูล title, tag/keyword และ description ใน <header> ที่ตรงประเด็น/สอดคล้องด้วย
ส่วน icon เลือกใช้จาก font-icon (เท่านั้น) ที่ใกล้เคียงที่สุด
@import url('https://cdn.jsdelivr.net/.../bootstrap-iconsbootstrap...');
@import url('https://cdnjs.cloudflare.com/.../6.4.0/css/all.min.css');
@import url('https://code.ionicframework.com/.../css/ionicons.min.css');
@import url('https://cdn.lineicons.com/5.0/lineicons.css');
<link href="https://fonts.googleapis.com/css2?family=Material+Icons" rel="stylesheet"> <link href="https://fonts.googleapis.com/css2..." rel="stylesheet"> <link href='https://cdn.boxicons.com/3.0.4/fonts/basic/boxicons.min.css' rel='stylesheet'> <link rel="stylesheet" href="https://cdn.linearicons.com/free/1.0.0/icon-font.min.css">
เพิ่ม interactive ด้วย javascript ให้น่าใช้ และมี smooth effect ด้วย ทำงานได้จริง ไม่น่าเบื่อ และไม่น่ารำคาญ
ทำมาไม่ต้องซับซ้อนมากน่ะครับ มี sections เท่าที่จำเป็นพอ
- เพิ่ม chatbot โดยที่เวลากดเปิด chatbot แล้ว ให้ปุ่ม chatbot คงอยู่ตำแหน่งเดิม ไม่ย้ายไปไหน และให้ chatbot สามารถพิม และปุ่มได้จริง
- ให้ปุ่ม chatbot กับ back to top อยู่ในระแนบบรรทัดเดียวกัน โดย chatbot อยู่ขวามือ และ back to top ซ้าย และมี gap ระยะกัน 5px ให้ปุ่ม back to top ปรากฎเมื่อ scroll ลงจนล้น hero ไปแล้ว
รบกวนสร้างเป็น standalone html template อย่างตรงไปตรงมา ให้เสร็จภายในรอบเดียว คุณไม่ต้องเทสอะไรเลย
หมายเหตุ: [...หมายเหตุ...]
ก่อนทำ อยากให้คุณช่วยวิเคราะห์แล้วคิดอย่างรอบคอบว่า จากข้อมูลที่ไปให้นั้น web site นี้ ต้องประกอบด้วย component / item / card อะไรบ้าง
อย่าทำให้ผิดหวังน่ะครับ ทำมาให้สมบูรณ์และดีที่สุด