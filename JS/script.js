// =========================================================
// helpers
// =========================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =========================================================
// 1. พิมพ์โค้ด Java พร้อมสี Syntax
// =========================================================
const javaModCode = `package net.voxelforge.mod;

import net.fabricmc.api.ModInitializer;
import de.maxhenkel.voicechat.api.VoicechatPlugin;
import gg.essential.api.EssentialAPI;
import org.slf4j.Logger;

public class VoxelForgeMod implements ModInitializer {
    public static final String MOD_ID = "voxelforge_ai";

    @Override
    public void onInitialize() {
        // Auto-sync Simple Voice Chat & Essential Mod
        VoiceChatBridge.syncClientAudio(MOD_ID);
        EssentialAPI.getModSync().verifyChecksums();

        // AI Tick Optimizer (Lock Server at 20.0 TPS)
        ServerTickAI.boostMemory("8GB_OPTIMIZED");
    }
}`;

// ใช้ regex รอบเดียว กันไม่ให้ไปแทนที่ซ้ำใน <span class="...">
const TOKEN_RE = new RegExp(
  [
    "(\\/\\/.*$)",                                   // 1 comment
    "(\"[^\"]*\"?)",                                 // 2 string
    "(@\\w+)",                                       // 3 annotation
    "\\b(package|import|public|class|implements|static|final|void)\\b", // 4 keyword
    "\\b(ModInitializer|VoicechatPlugin|EssentialAPI|Logger|VoxelForgeMod|String|VoiceChatBridge|ServerTickAI)\\b", // 5 class
    "\\b(onInitialize|syncClientAudio|getModSync|verifyChecksums|boostMemory)\\b" // 6 function
  ].join("|"),
  "g"
);

function highlightJavaSyntax(rawText) {
  const escaped = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split("\n")
    .map(line =>
      line.replace(TOKEN_RE, (m, cmt, str, ann, kw, cls, fn) => {
        if (cmt) return `<span class="tok-cmt">${m}</span>`;
        if (str) return `<span class="tok-str">${m}</span>`;
        if (ann) return `<span class="tok-ann">${m}</span>`;
        if (kw)  return `<span class="tok-kw">${m}</span>`;
        if (cls) return `<span class="tok-cls">${m}</span>`;
        if (fn)  return `<span class="tok-fn">${m}</span>`;
        return m;
      })
    )
    .join("\n");
}

const typingArea = document.getElementById("java-typing-area");
if (typingArea) {
  let charIndex = 0;

  function typeJavaCode() {
    if (charIndex <= javaModCode.length) {
      typingArea.innerHTML = highlightJavaSyntax(javaModCode.slice(0, charIndex));
      charIndex++;
      const editorBox = typingArea.parentElement.parentElement;
      editorBox.scrollTop = editorBox.scrollHeight;
      setTimeout(typeJavaCode, 26);
    } else {
      setTimeout(() => {
        charIndex = 0;
        typingArea.innerHTML = "";
        typeJavaCode();
      }, 3800);
    }
  }
  typeJavaCode();
}

// =========================================================
// 2. Spotlight stage: มืดสนิท -> รอ -> ไฟกระพริบ -> ไฟขาวค้าง -> กดปุ่มโชว์ฟีเจอร์
// =========================================================
const DARK_WAIT_MS = 600;    // เวลาที่รอในความมืดก่อนไฟเริ่มกระพริบ
const FLICKER_MS = 2000;     // ความยาวช่วงกระพริบ (ต้องตรงกับ animation 2s ใน CSS)
const MODEL_RADIUS = "125%"; // รัศมีกล้อง ยิ่งมากบล็อกยิ่งเล็ก ไม่โดนตัดขอบ

// รายการโมเดลในโฟลเดอร์ Object (เพิ่ม/ลบไฟล์ได้ที่นี่)
const MODEL_LIST = [
  "Object/minecraft_grass_block.glb",
  "Object/minecraft_diamond-sword.glb",
  "Object/minecraft_chest.glb",
  "Object/minecraft_diamond-pickaxe.glb",
  "Object/minecraft_cat_lying.glb",
  "Object/minecraft_rainbow_dragon.glb",
  "Object/minecraft_food__snacks_mini-pack.glb",
  "Object/minecraft_-_an-94.glb",
];

// สุ่มแบบสับไพ่: ครบทุกโมเดลก่อนวนรอบใหม่ จึงไม่ซ้ำติดกัน
let modelQueue = [];
let lastModel = "Object/minecraft_grass_block.glb"; // โมเดลเริ่มต้นในหน้าเว็บ

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomModel() {
  if (modelQueue.length === 0) {
    modelQueue = shuffle([...MODEL_LIST]);
    // กันตัวแรกของรอบใหม่ซ้ำกับตัวสุดท้ายของรอบก่อน
    if (modelQueue.length > 1 && modelQueue[0] === lastModel) {
      [modelQueue[0], modelQueue[1]] = [modelQueue[1], modelQueue[0]];
    }
  }
  lastModel = modelQueue.shift();
  return lastModel;
}

const showcaseSection = document.getElementById("showcase");
const modelViewer = document.getElementById("mc-model-viewer");

if (modelViewer) {
  modelViewer.setAttribute("camera-orbit", `35deg 75deg ${MODEL_RADIUS}`);
}

if (showcaseSection) {
  let started = false;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || started) return;
      started = true;
      observer.disconnect();

      // อยู่ในความมืดสั้นๆ ก่อนไฟกระพริบ
      window.setTimeout(() => {
        showcaseSection.classList.remove("stage-off");
        showcaseSection.classList.add("stage-flicker");

        window.setTimeout(() => {
          // ถ้าผู้ใช้ยังไม่ได้กดอะไร ให้เข้าสถานะไฟขาวค้าง
          if (!showcaseSection.classList.contains("stage-active")) {
            showcaseSection.classList.remove("stage-flicker");
            showcaseSection.classList.add("stage-ready");
          }
        }, FLICKER_MS);
      }, DARK_WAIT_MS);
    });
  }, { threshold: 0.5 });

  observer.observe(showcaseSection);
}

// โทนสีเขียว-ขาว-น้ำตาล แบบบล็อกหญ้า
const spotlightFeatures = [
  {
    tag: "FEATURE 01 // AUTO VOICE & MODS",
    title: "SMART MOD<br>& VOICE SYNC",
    desc: "ซิงค์ Modpack และปลั๊กอินเสียง Simple Voice Chat / Plasmo Voice ให้เพื่อนทั้งเซิร์ฟเวอร์อัตโนมัติในคลิกเดียว ไม่ต้องส่งไฟล์แยกให้วุ่นวายอีกต่อไป",
    primaryColor: "#a8d98a",
    secondaryColor: "#eef4e6",
    glowRgba: "rgba(143, 209, 106, 0.38)",
    tiltZ: "-8deg", tiltX: "6deg",
    orbit: `35deg 75deg ${MODEL_RADIUS}`
  },
  {
    tag: "FEATURE 02 // AI CRASH ANALYZER",
    title: "AI JAVA<br>CONFIG FIXER",
    desc: "วิเคราะห์ Crash Log ทันทีที่เกมเด้งด้วย AI อัจฉริยะ พร้อมช่วยเขียนสคริปต์และแก้ไฟล์ Config ที่ชนกันให้กลับมาเปิดเซิร์ฟเวอร์ได้ในพริบตา",
    primaryColor: "#8fe0b5",
    secondaryColor: "#d6f3e1",
    glowRgba: "rgba(143, 224, 181, 0.36)",
    tiltZ: "8deg", tiltX: "-6deg",
    orbit: `125deg 70deg ${MODEL_RADIUS}`
  },
  {
    tag: "FEATURE 03 // ZERO-LAG ENGINE",
    title: "20.0 TPS<br>MEMORY BOOST",
    desc: "ปรับจูน JVM Arguments และบริหารจัดการ RAM อัตโนมัติ ลดอาการกระตุกเมื่อโหลด Chunk ขนาดใหญ่ รองรับผู้เล่นออนไลน์พร้อมกันได้มากกว่าเดิม",
    primaryColor: "#e3d28f",
    secondaryColor: "#8fd16a",
    glowRgba: "rgba(227, 210, 143, 0.34)",
    tiltZ: "-9deg", tiltX: "-5deg",
    orbit: `215deg 80deg ${MODEL_RADIUS}`
  },
  {
    tag: "FEATURE 04 // REAL-TIME CLOUD",
    title: "INSTANT WORLD<br>CLOUD BACKUP",
    desc: "สำรองข้อมูลโลก Minecraft และฐานข้อมูลผู้เล่นขึ้นระบบ Cloud อัตโนมัติทุกชั่วโมง กู้คืนโลกได้ทันทีแม้เกิดเหตุไม่คาดฝัน",
    primaryColor: "#d9b58a",
    secondaryColor: "#a8d98a",
    glowRgba: "rgba(217, 181, 138, 0.34)",
    tiltZ: "9deg", tiltX: "6deg",
    orbit: `305deg 68deg ${MODEL_RADIUS}`
  }
];

let currentSpotIndex = -1;
const orbButtons = document.querySelectorAll(".orb-btn");
const tryClickBtn = document.getElementById("try-click-btn");
const modelWrapper = document.getElementById("model-tilted-wrapper");
const textBox = document.getElementById("spotlight-text-box");

function setSpotlightFeature(index) {
  currentSpotIndex = index;
  const item = spotlightFeatures[index];
  const root = document.documentElement;

  if (showcaseSection) {
    showcaseSection.classList.remove("stage-off", "stage-flicker", "stage-ready");
    showcaseSection.classList.add("stage-active");
  }

  root.style.setProperty("--spot-primary", item.primaryColor);
  root.style.setProperty("--spot-secondary", item.secondaryColor);
  root.style.setProperty("--spot-glow", item.glowRgba);
  root.style.setProperty("--block-tilt-z", item.tiltZ);
  root.style.setProperty("--block-tilt-x", item.tiltX);

  if (modelViewer) {
    // สุ่มโมเดลใหม่ทุกครั้งที่กดปุ่ม (ไม่ซ้ำติดกัน)
    modelViewer.setAttribute("src", pickRandomModel());
    modelViewer.setAttribute("camera-orbit", item.orbit);
  }

  if (textBox) {
    textBox.style.opacity = "0";
    textBox.style.transform = "translateX(-15px)";
    setTimeout(() => {
      document.getElementById("spot-tag").textContent = item.tag;
      document.getElementById("spot-title").innerHTML = item.title;
      document.getElementById("spot-desc").textContent = item.desc;
      textBox.style.opacity = "1";
      textBox.style.transform = "translateX(0)";
    }, 160);
  }

  orbButtons.forEach((btn, idx) => btn.classList.toggle("active", idx === index));
}

orbButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    setSpotlightFeature(parseInt(btn.getAttribute("data-index"), 10));
  });
});

if (tryClickBtn) {
  tryClickBtn.addEventListener("click", () => {
    // กดได้เฉพาะตอนไฟติดแล้ว
    if (showcaseSection && showcaseSection.classList.contains("stage-off")) return;
    if (showcaseSection && showcaseSection.classList.contains("stage-flicker")) return;

    setSpotlightFeature((currentSpotIndex + 1) % spotlightFeatures.length);

    if (modelWrapper) {
      modelWrapper.classList.add("pulse-spin");
      setTimeout(() => modelWrapper.classList.remove("pulse-spin"), 650);
    }
  });
}

// =========================================================
// 3. ระบบรีวิว (LocalStorage + กัน XSS)
// =========================================================
const REVIEW_KEY = "voxelforge_reviews_v2";

const defaultReviews = [
  { name: "Nattapong_Dev", rating: 5, comment: "ตั้งแต่ใช้ VoxelForge ช่วยซิงค์ Essential Mod กับ Simple Voice Chat เพื่อนในแก๊งไม่เคยบ่นเรื่องลงมอดไม่เป็นอีกเลย ประหยัดเวลาสุดๆ!" },
  { name: "Korn_Builder", rating: 5, comment: "ฟีเจอร์ AI ช่วยเช็กไฟล์ Config ตอนมอดตีกันคือสวรรค์ของคนทำเซิร์ฟเวอร์ ไม่ต้องนั่งไล่อ่าน Crash Log ยาวๆ เองอีกต่อไป" },
  { name: "Mintra_MC", rating: 4, comment: "หน้าเว็บและตัวแอปใช้งานง่ายมาก โทนสีสวยทันสมัย ระบบดูสถานะ RAM กับ TPS แบบเรียลไทม์ช่วยให้ดูแลเซิร์ฟเวอร์ได้ลื่นไหลมากค่ะ" }
];

function getSavedReviews() {
  try {
    const saved = localStorage.getItem(REVIEW_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) ? parsed : [...defaultReviews];
  } catch {
    return [...defaultReviews];
  }
}

function renderStars(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += i <= rating
      ? `<i class="bi bi-star-fill text-warning me-1"></i>`
      : `<i class="bi bi-star text-secondary me-1"></i>`;
  }
  return html;
}

function loadReviews() {
  const el = document.getElementById("review-list");
  if (!el) return;

  el.innerHTML = getSavedReviews().map(item => {
    const name = escapeHtml(item.name);
    const comment = escapeHtml(item.comment);
    const rating = Math.min(5, Math.max(1, parseInt(item.rating, 10) || 5));
    return `
    <div class="col-12 col-md-4">
      <div class="custom-card p-4 rounded-4 h-100 d-flex flex-column justify-content-between">
        <div>
          <div class="mb-2">${renderStars(rating)}</div>
          <p class="text-light fst-italic mb-3">"${comment}"</p>
        </div>
        <div class="d-flex align-items-center gap-3 pt-3 border-top border-secondary">
          <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.name)}"
               alt="${name}" width="38" height="38" class="rounded-circle border border-secondary">
          <div>
            <h6 class="fw-bold mb-0">${name}</h6>
            <small class="text-accent font-mono">Verified Player</small>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}

const starItems = document.querySelectorAll("#star-selector .star-item");
const ratingInput = document.getElementById("reviewer-rating");

if (starItems.length > 0 && ratingInput) {
  starItems.forEach(star => {
    star.addEventListener("click", () => {
      const val = parseInt(star.getAttribute("data-value"), 10);
      ratingInput.value = val;
      starItems.forEach(s => {
        s.classList.toggle("active", parseInt(s.getAttribute("data-value"), 10) <= val);
      });
    });
  });
}

const reviewForm = document.getElementById("review-form");
if (reviewForm) {
  reviewForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("reviewer-name").value.trim();
    const rating = parseInt(ratingInput.value, 10) || 5;
    const comment = document.getElementById("reviewer-comment").value.trim();
    if (!name || !comment) return;

    const reviews = getSavedReviews();
    reviews.unshift({ name, rating, comment });
    localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));

    reviewForm.reset();
    ratingInput.value = 5;
    starItems.forEach(s => s.classList.add("active"));
    loadReviews();
  });
}

document.addEventListener("DOMContentLoaded", loadReviews);

// =========================================================
// 4. Particle Canvas (โทนเขียว-ขาว-ทอง)
// =========================================================
const canvas = document.getElementById("particle-canvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  const colors = ["143,209,106", "168,217,138", "238,244,230", "143,224,181", "217,192,143"];
  let particles = [];
  let animationFrame;
  let lastFrame = 0;

  class Particle {
    constructor() {
      this.x = Math.random() * window.innerWidth;
      this.y = Math.random() * window.innerHeight;
      this.size = Math.random() * 2 + 0.8;
      this.speedX = (Math.random() - 0.5) * 0.28;
      this.speedY = (Math.random() - 0.5) * 0.28;
      this.alpha = Math.random() * 0.35 + 0.1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < -10 || this.x > window.innerWidth + 10) this.speedX *= -1;
      if (this.y < -10 || this.y > window.innerHeight + 10) this.speedY *= -1;
    }
    draw() {
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = window.innerWidth < 768 ? 22 : 45;
    particles = Array.from({ length: count }, () => new Particle());
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  function animateParticles(timestamp = 0) {
    if (timestamp - lastFrame < 33) {
      animationFrame = requestAnimationFrame(animateParticles);
      return;
    }
    lastFrame = timestamp;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(p => { p.update(); p.draw(); });
    animationFrame = requestAnimationFrame(animateParticles);
  }
  animateParticles();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
    } else {
      lastFrame = 0;
      animateParticles();
    }
  });
}

// =========================================================
// 5. Active navigation
// =========================================================
const navLinks = [...document.querySelectorAll('.custom-navbar .nav-link[href^="#"]')];
const navSections = navLinks
  .map(link => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (navLinks.length && navSections.length) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${entry.target.id}`
      ));
    });
  }, { rootMargin: "-30% 0px -55% 0px", threshold: 0 });
  navSections.forEach(section => navObserver.observe(section));
}
