
import { auth, cloudDB } from "./firebase-init.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// استبدل القيمة التالية ببريد حساب المدير المسجل في Firebase
const MANAGER_EMAIL = "PUT_MANAGER_EMAIL_HERE";

let unsubscribeMedicines = null;
let medicines = [];

const $ = id => document.getElementById(id);

function showMessage(message) {
  $("loginMessage").textContent = message;
}

function updateConnection() {
  $("connection").textContent = navigator.onLine
    ? "متصل بالإنترنت"
    : "غير متصل بالإنترنت";
}

function money(value) {
  return Number(value || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function render() {
  const query = $("search").value.trim().toLowerCase();

  const filtered = medicines.filter(m =>
    String(m.name || "").toLowerCase().includes(query) ||
    String(m.barcode || "").toLowerCase().includes(query)
  );

  $("totalItems").textContent = medicines.length;
  $("lowStock").textContent =
    medicines.filter(m => Number(m.quantity) <= 5).length;

  if (!filtered.length) {
    $("medicineList").innerHTML =
      `<p class="empty">${
        medicines.length
          ? "لا توجد نتائج مطابقة."
          : "لا توجد أصناف بعد."
      }</p>`;
    return;
  }

  $("medicineList").innerHTML = filtered
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(m => `
      <article class="medicine">
        <span class="name">${escapeHtml(m.name)}</span>
        <span class="meta">
          الكمية:
          <b class="${Number(m.quantity) <= 5 ? "low" : ""}">
            ${Number(m.quantity)}
          </b>
          · شراء: ${money(m.buyPrice)}
          · بيع: ${money(m.sellPrice)} جنيه
        </span>
        <span class="meta">
          الباركود: ${escapeHtml(m.barcode || "غير مسجل")}
          · الصلاحية: ${escapeHtml(m.expiry || "غير مسجلة")}
        </span>
      </article>
    `).join("");
}

function stopMedicineListener() {
  if (unsubscribeMedicines) {
    unsubscribeMedicines();
    unsubscribeMedicines = null;
  }
  medicines = [];
}

function startMedicineListener() {
  stopMedicineListener();

  unsubscribeMedicines = onSnapshot(
    collection(cloudDB, "medicines"),
    snapshot => {
      medicines = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      render();
    },
    error => {
      console.error(error);
      alert("تعذر تحميل الأصناف. راجع قواعد Firestore واتصال الإنترنت.");
    }
  );
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  showMessage("جارٍ تسجيل الدخول...");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    showMessage("تعذر تسجيل الدخول. راجع البريد وكلمة المرور.");
  }
});

$("logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    alert("تعذر تسجيل الخروج.");
  }
});

$("medicineForm").addEventListener("submit", async event => {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user || user.email?.toLowerCase() !== MANAGER_EMAIL.toLowerCase()) {
    alert("هذا الحساب غير مصرح له بإضافة الأصناف.");
    return;
  }

  const medicine = {
    name: $("name").value.trim(),
    barcode: $("barcode").value.trim(),
    quantity: Number($("quantity").value),
    buyPrice: Number($("buyPrice").value),
    sellPrice: Number($("sellPrice").value),
    expiry: $("expiry").value,
    createdAt: serverTimestamp(),
    createdBy: user.uid
  };

  if (
    !medicine.name ||
    !Number.isInteger(medicine.quantity) ||
    medicine.quantity < 0 ||
    medicine.buyPrice < 0 ||
    medicine.sellPrice < 0
  ) {
    alert("راجع اسم الدواء والكمية والأسعار.");
    return;
  }

  try {
    await addDoc(collection(cloudDB, "medicines"), medicine);
    event.target.reset();
    $("quantity").value = "0";
    $("buyPrice").value = "0";
    $("sellPrice").value = "0";
  } catch (error) {
    console.error(error);
    alert("لم يتم حفظ الصنف. تأكد من إعداد قواعد Firestore.");
  }
});

$("search").addEventListener("input", render);

onAuthStateChanged(auth, user => {
  stopMedicineListener();

  if (!user) {
    $("loginPanel").hidden = false;
    $("appContent").hidden = true;
    $("userInfo").textContent = "";
    return;
  }

  if (
    !user.email ||
    user.email.toLowerCase() !== MANAGER_EMAIL.toLowerCase()
  ) {
    $("loginPanel").hidden = false;
    $("appContent").hidden = true;
    showMessage("هذا الحساب غير مسجل كحساب مدير.");
    signOut(auth).catch(console.error);
    return;
  }

  $("loginPanel").hidden = true;
  $("appContent").hidden = false;
  $("userInfo").textContent = `تم تسجيل الدخول: ${user.email}`;
  showMessage("");

  startMedicineListener();
});

updateConnection();
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);
