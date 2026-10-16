const DB_NAME = "saydalaty-db";
const DB_VERSION = 1;
let db;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("medicines")) {
        const store = database.createObjectStore("medicines", { keyPath: "id", autoIncrement: true });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("barcode", "barcode", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function allMedicines() {
  return new Promise((resolve, reject) => {
    const request = db.transaction("medicines", "readonly").objectStore("medicines").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function addMedicine(medicine) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("medicines", "readwrite").objectStore("medicines").add(medicine);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const money = n => Number(n || 0).toLocaleString("ar-EG", {minimumFractionDigits:2, maximumFractionDigits:2});
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
async function render() {
  const all = await allMedicines();
  const query = document.getElementById("search").value.trim().toLowerCase();
  const filtered = all.filter(m => m.name.toLowerCase().includes(query) || (m.barcode || "").toLowerCase().includes(query));
  document.getElementById("totalItems").textContent = all.length;
  document.getElementById("lowStock").textContent = all.filter(m => m.quantity <= 5).length;
  const list = document.getElementById("medicineList");
  if (!filtered.length) {
    list.innerHTML = `<p class="empty">${all.length ? "لا توجد نتائج مطابقة." : "لا توجد أصناف بعد."}</p>`;
    return;
  }
  list.innerHTML = filtered.sort((a,b) => a.name.localeCompare(b.name)).map(m => `
    <article class="medicine">
      <span class="name">${escapeHtml(m.name)}</span>
      <span class="meta">الكمية: <b class="${m.quantity <= 5 ? "low" : ""}">${m.quantity}</b> · شراء: ${money(m.buyPrice)} · بيع: ${money(m.sellPrice)} جنيه</span>
      <span class="meta">الباركود: ${escapeHtml(m.barcode || "غير مسجل")} · الصلاحية: ${escapeHtml(m.expiry || "غير مسجلة")}</span>
    </article>`).join("");
}
document.getElementById("medicineForm").addEventListener("submit", async event => {
  event.preventDefault();
  const medicine = {
    name: document.getElementById("name").value.trim(),
    barcode: document.getElementById("barcode").value.trim(),
    quantity: Number(document.getElementById("quantity").value),
    buyPrice: Number(document.getElementById("buyPrice").value),
    sellPrice: Number(document.getElementById("sellPrice").value),
    expiry: document.getElementById("expiry").value,
    createdAt: new Date().toISOString()
  };
  if (!medicine.name || medicine.quantity < 0 || medicine.buyPrice < 0 || medicine.sellPrice < 0) return;
  await addMedicine(medicine);
  event.target.reset();
  document.getElementById("quantity").value = "0";
  document.getElementById("buyPrice").value = "0";
  document.getElementById("sellPrice").value = "0";
  await render();
});
document.getElementById("search").addEventListener("input", render);
function updateConnection() {
  const el = document.getElementById("connection");
  el.textContent = navigator.onLine ? "متصل بالإنترنت" : "أوفلاين";
}
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);
(async function init() {
  updateConnection();
  try { db = await openDatabase(); await render(); }
  catch (error) { alert("تعذر فتح قاعدة البيانات المحلية. افتح التطبيق من متصفح حديث عبر HTTPS."); console.error(error); }
})();
