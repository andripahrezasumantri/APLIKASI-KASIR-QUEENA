/**
 * QUEENA CAKERY - Frontend POS Engine
 * Integrasi Google Apps Script Web App API
 * Ultra-Flexible Data Normalization Version
 */

// URL Web App Google Apps Script QUEENA CAKERY
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyscHY_oy0LO1TUpOVF7kLhXs9DjeuD3duXosRN2YYSiH5_lTh5mvUI7elhDI4XGUkx/exec";

// Global State Management
let productsData = [];
let cart = [];
let currentTrxID = "";

/**
 * PINTAR: Fungsi pembaca properti objek yang kebal terhadap spasi, huruf kapital, & garis bawah
 */
function getVal(obj, ...possibleKeys) {
  if (!obj || typeof obj !== 'object') return null;

  // Jika data berupa Array
  if (Array.isArray(obj)) {
    return obj;
  }

  const keys = Object.keys(obj);

  // 1. Cek langsung
  for (let pKey of possibleKeys) {
    if (obj[pKey] !== undefined && obj[pKey] !== null && obj[pKey] !== "") {
      return obj[pKey];
    }
  }

  // 2. Cek dengan normalisasi (abaikan spasi, simbol, & kapital)
  const normalize = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

  for (let pKey of possibleKeys) {
    const normPKey = normalize(pKey);
    const matchedKey = keys.find(k => normalize(k) === normPKey);
    if (matchedKey && obj[matchedKey] !== undefined && obj[matchedKey] !== null && obj[matchedKey] !== "") {
      return obj[matchedKey];
    }
  }

  return null;
}

// Inisialisasi saat dokumen dimuat
document.addEventListener("DOMContentLoaded", () => {
  generateTrxID();
  loadProducts();
});

// 1. Generate TRX ID Otomatis
function generateTrxID() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  currentTrxID = `AVD-TRX-${randomNum}`;
  const trxEl = document.getElementById("trxIDDisplay");
  if (trxEl) trxEl.innerText = currentTrxID;
}

// 2. Fetch Data Produk dari Google Sheets API
async function loadProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="text-center py-5 text-muted">
      <div class="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
      <div>Memuat data barang...</div>
    </div>`;

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getProducts`);
    const data = await response.json();

    if (data.status === "success" && Array.isArray(data.data)) {
      productsData = data.data;
      renderProducts(productsData);
    } else {
      grid.innerHTML = `<div class="alert alert-danger text-center">Gagal memuat produk dari database.</div>`;
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    grid.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-exclamation-triangle fs-2 text-warning"></i>
        <div class="mt-2">Gagal terhubung ke database. Pastikan URL SCRIPT_URL sudah benar.</div>
      </div>`;
  }
}

// 3. Render Daftar Produk ke UI (Kebal Mismatch Header)
function renderProducts(items) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!items || items.length === 0) {
    grid.innerHTML = `<div class="text-center py-5 text-muted">Barang tidak ditemukan.</div>`;
    return;
  }

  const row = document.createElement("div");
  row.className = "row g-2";

  items.forEach((item, index) => {
    // Ekstraksi data dengan pencarian pintar
    const barcode = String(getVal(item, 'Barcode', 'barcode', 'BarangID', 'barangID', 'KodeBarang', 'kodeBarang') || index);
    const namaBarang = String(getVal(item, 'NamaBarang', 'namaBarang', 'Nama Barang', 'Nama', 'nama', 'Produk') || 'Tanpa Nama');
    const kategori = String(getVal(item, 'Kategori', 'kategori') || 'Umum');
    const satuan = String(getVal(item, 'Satuan', 'satuan') || 'Pcs');
    
    const rawHarga = getVal(item, 'HargaJual', 'hargaJual', 'Harga Jual', 'Harga', 'harga') || 0;
    const hargaJual = Number(String(rawHarga).replace(/[^0-9.-]+/g, "")) || 0;

    const rawStok = getVal(item, 'Stok', 'stok', 'Jumlah') || 0;
    const stok = Number(String(rawStok).replace(/[^0-9.-]+/g, "")) || 0;

    const col = document.createElement("div");
    col.className = "col-6 col-md-4";

    col.innerHTML = `
      <div class="card pos-card product-item p-2 h-100 position-relative shadow-sm" style="cursor: pointer;" onclick="addToCart('${barcode}')">
        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 px-1 py-0" 
                style="font-size: 0.7rem; z-index: 10;" 
                title="Hapus Barang" 
                onclick="event.stopPropagation(); hapusBarang('${barcode}', '${namaBarang.replace(/'/g, "\\'")}')">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="card-body p-1 d-flex flex-column justify-content-between">
          <div>
            <span class="badge bg-light text-primary mb-1 border" style="font-size: 0.65rem;">${kategori}</span>
            <h6 class="fw-bold mb-1 text-truncate pe-3" style="font-size: 0.85rem;" title="${namaBarang}">${namaBarang}</h6>
            <small class="text-muted d-block" style="font-size: 0.7rem;">Stok: ${stok} ${satuan}</small>
          </div>
          <div class="mt-2 pt-1 border-top d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary" style="font-size: 0.85rem;">Rp ${hargaJual.toLocaleString('id-ID')}</span>
            <i class="bi bi-plus-circle-fill text-primary"></i>
          </div>
        </div>
      </div>
    `;
    row.appendChild(col);
  });

  grid.appendChild(row);
}

// 4. Filter / Pencarian Barang
function filterBarang() {
  const query = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  
  const filtered = productsData.filter((p) => {
    const nama = String(getVal(p, 'NamaBarang', 'namaBarang', 'Nama Barang', 'Nama', 'nama') || '').toLowerCase();
    const barcode = String(getVal(p, 'Barcode', 'barcode', 'BarangID', 'barangID') || '').toLowerCase();
    const kategori = String(getVal(p, 'Kategori', 'kategori') || '').toLowerCase();

    return nama.includes(query) || barcode.includes(query) || kategori.includes(query);
  });

  renderProducts(filtered);
}

// 5. Tambah Produk ke Keranjang Belanja
function addToCart(targetBarcode) {
  const product = productsData.find((p) => {
    const code = String(getVal(p, 'Barcode', 'barcode', 'BarangID', 'barangID', 'KodeBarang', 'kodeBarang') || '');
    return code === String(targetBarcode);
  });

  if (!product) return;

  const barcode = String(getVal(product, 'Barcode', 'barcode', 'BarangID', 'barangID') || targetBarcode);
  const namaBarang = String(getVal(product, 'NamaBarang', 'namaBarang', 'Nama Barang', 'Nama', 'nama') || 'Tanpa Nama');
  
  const rawHarga = getVal(product, 'HargaJual', 'hargaJual', 'Harga Jual', 'Harga', 'harga') || 0;
  const hargaJual = Number(String(rawHarga).replace(/[^0-9.-]+/g, "")) || 0;

  const rawStok = getVal(product, 'Stok', 'stok', 'Jumlah') || 0;
  const stok = Number(String(rawStok).replace(/[^0-9.-]+/g, "")) || 0;

  if (stok <= 0) {
    Swal.fire("Stok Habis", `Stok untuk "${namaBarang}" telah habis!`, "warning");
    return;
  }

  const existingItem = cart.find((item) => String(item.barcode) === String(barcode));

  if (existingItem) {
    if (existingItem.qty + 1 > stok) {
      Swal.fire("Stok Kurang", `Stok maksimum untuk "${namaBarang}" adalah ${stok}`, "warning");
      return;
    }
    existingItem.qty += 1;
    existingItem.subtotal = existingItem.qty * existingItem.hargaJual;
  } else {
    cart.push({
      barcode: barcode,
      namaBarang: namaBarang,
      hargaJual: hargaJual,
      stokMax: stok,
      qty: 1,
      subtotal: hargaJual
    });
  }

  renderCart();
}

// 6. Update Jumlah (Qty) Barang di Keranjang
function updateQty(barcode, change) {
  const item = cart.find((i) => String(i.barcode) === String(barcode));
  if (!item) return;

  const newQty = item.qty + change;

  if (newQty <= 0) {
    removeFromCart(barcode);
    return;
  }

  if (newQty > item.stokMax) {
    Swal.fire("Stok Kurang", `Stok maksimum adalah ${item.stokMax}`, "warning");
    return;
  }

  item.qty = newQty;
  item.subtotal = item.qty * item.hargaJual;
  renderCart();
}

// 7. Hapus Barang dari Keranjang
function removeFromCart(barcode) {
  cart = cart.filter((i) => String(i.barcode) !== String(barcode));
  renderCart();
}

// 8. Reset Seluruh Isi Keranjang
function resetCart() {
  cart = [];
  const cashInput = document.getElementById("cashInput");
  const discountInput = document.getElementById("discountInput");
  
  if (cashInput) cashInput.value = "";
  if (discountInput) discountInput.value = "0";
  
  renderCart();
}

// 9. Render Keranjang Belanja
function renderCart() {
  const body = document.getElementById("cartBody");
  if (!body) return;
  body.innerHTML = "";

  if (cart.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          <i class="bi bi-cart-x fs-3 d-block mb-1"></i> Keranjang belanja masih kosong
        </td>
      </tr>`;
    hitungTotal();
    return;
  }

  cart.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="fw-semibold text-truncate" style="max-width: 140px;" title="${item.namaBarang}">${item.namaBarang}</div>
      </td>
      <td class="small">Rp ${item.hargaJual.toLocaleString('id-ID')}</td>
      <td class="text-center">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary px-1 py-0" onclick="updateQty('${item.barcode}', -1)">-</button>
          <span class="btn btn-light disabled px-2 py-0 text-dark fw-bold">${item.qty}</span>
          <button class="btn btn-outline-secondary px-1 py-0" onclick="updateQty('${item.barcode}', 1)">+</button>
        </div>
      </td>
      <td class="text-end fw-semibold small">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
      <td class="text-end">
        <button class="btn btn-sm text-danger p-0" onclick="removeFromCart('${item.barcode}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    body.appendChild(tr);
  });

  hitungTotal();
}

// 10. Hitung Subtotal, Diskon, Total Bayar, dan Kembalian
function hitungTotal() {
  const subtotal = cart.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0);
  const discount = Number(document.getElementById("discountInput")?.value) || 0;
  const cash = Number(document.getElementById("cashInput")?.value) || 0;

  const grandTotal = Math.max(0, subtotal - discount);
  const change = Math.max(0, cash - grandTotal);

  const grandTotalEl = document.getElementById("grandTotalDisplay");
  const changeEl = document.getElementById("changeDisplay");

  if (grandTotalEl) grandTotalEl.innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
  if (changeEl) changeEl.innerText = `Rp ${change.toLocaleString('id-ID')}`;
}

// 11. Simpan Barang Baru ke Database
async function simpanBarangBaru() {
  const barcode = document.getElementById("inBarcode")?.value.trim();
  const namaBarang = document.getElementById("inNamaBarang")?.value.trim();
  const kategori = document.getElementById("inKategori")?.value.trim() || "Kue";
  const satuan = document.getElementById("inSatuan")?.value.trim() || "Pcs";
  const hargaModal = document.getElementById("inHargaModal")?.value || 0;
  const hargaJual = document.getElementById("inHargaJual")?.value || 0;
  const stok = document.getElementById("inStok")?.value || 0;
  const expired = document.getElementById("inExpired")?.value || "";

  if (!barcode || !namaBarang || !hargaJual || !stok) {
    Swal.fire("Lengkapi Data", "Mohon isi Barcode, Nama Barang, Harga Jual, dan Stok!", "warning");
    return;
  }

  Swal.fire({
    title: "Menyimpan...",
    text: "Sedang menambahkan barang baru ke sistem",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const payload = {
    action: "addProduct",
    data: {
      barangID: barcode,
      barcode: barcode,
      kodeBarang: barcode,
      namaBarang: namaBarang,
      kategori: kategori,
      satuan: satuan,
      hargaModal: Number(hargaModal),
      hargaJual: Number(hargaJual),
      stok: Number(stok),
      expired: expired
    },
    barcode: barcode,
    namaBarang: namaBarang,
    kategori: kategori,
    satuan: satuan,
    hargaModal: Number(hargaModal),
    hargaJual: Number(hargaJual),
    stok: Number(stok),
    expired: expired
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const res = await response.json();

    if (res.status === "success") {
      Swal.fire("Berhasil", "Barang baru berhasil disimpan!", "success");
      document.getElementById("formTambahBarang")?.reset();
      
      const modalEl = document.getElementById("modalTambahBarang");
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }

      loadProducts();
    } else {
      Swal.fire("Gagal", res.message || "Gagal menyimpan barang.", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Terjadi kesalahan koneksi ke server.", "error");
  }
}

// 12. Hapus Barang dari Database
async function hapusBarang(barcode, namaBarang) {
  const confirmDelete = await Swal.fire({
    title: "Hapus Barang?",
    text: `Apakah Anda yakin ingin menghapus "${namaBarang}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#EF4444",
    confirmButtonText: "Ya, Hapus!",
    cancelButtonText: "Batal"
  });

  if (!confirmDelete.isConfirmed) return;

  Swal.fire({
    title: "Menghapus...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteProduct", barcode: barcode, data: { barangID: barcode } })
    });
    const res = await response.json();

    if (res.status === "success") {
      Swal.fire("Terhapus", "Barang telah berhasil dihapus.", "success");
      loadProducts();
    } else {
      Swal.fire("Gagal", res.message || "Gagal menghapus barang.", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Terjadi kesalahan koneksi.", "error");
  }
}

// 13. Proses Transaksi Penjualan
async function prosesBayar() {
  if (cart.length === 0) {
    Swal.fire("Keranjang Kosong", "Pilih minimal 1 produk untuk diproses.", "warning");
    return;
  }

  const subtotal = cart.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0);
  const discount = Number(document.getElementById("discountInput")?.value) || 0;
  const cash = Number(document.getElementById("cashInput")?.value) || 0;
  const method = document.getElementById("payMethod")?.value || "Tunai";
  const grandTotal = Math.max(0, subtotal - discount);

  if (method === "Tunai" && cash < grandTotal) {
    Swal.fire("Uang Kurang", "Nominal pembayaran tunai kurang dari total bayar!", "warning");
    return;
  }

  const change = Math.max(0, cash - grandTotal);
  const kasir = document.getElementById("kasirName")?.innerText || "Kasir QUEENA CAKERY";

  const trxPayload = {
    action: "createTransaction",
    data: {
      transaksiID: currentTrxID,
      kasir: kasir,
      pelanggan: "Umum",
      total: grandTotal,
      diskon: discount,
      bayar: cash,
      kembali: change,
      metode: method,
      items: cart
    },
    transaksiID: currentTrxID,
    kasir: kasir,
    metode: method,
    items: cart,
    subtotal: subtotal,
    diskon: discount,
    total: grandTotal,
    bayar: cash,
    kembali: change
  };

  Swal.fire({
    title: "Memproses Transaksi...",
    text: "Menyimpan data penjualan ke database",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(trxPayload)
    });
    const res = await response.json();

    if (res.status === "success") {
      Swal.fire({
        title: "Transaksi Berhasil!",
        html: `
          <div class="text-start p-2 bg-light rounded mb-3 border">
            <small class="d-block">ID: <b>${currentTrxID}</b></small>
            <small class="d-block">Total: <b>Rp ${grandTotal.toLocaleString('id-ID')}</b></small>
            <small class="d-block">Kembali: <b>Rp ${change.toLocaleString('id-ID')}</b></small>
          </div>
          <p class="mb-0 small text-muted">Ingin mengirimkan struk via WhatsApp?</p>
        `,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "<i class='bi bi-whatsapp'></i> Kirim Struk WA",
        cancelButtonText: "Selesai",
        confirmButtonColor: "#22C55E"
      }).then((result) => {
        if (result.isConfirmed) {
          promptKirimWA(trxPayload);
        }
        resetCart();
        generateTrxID();
        loadProducts();
      });
    } else {
      Swal.fire("Gagal Transaksi", res.message || "Gagal memproses transaksi.", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Terjadi kesalahan saat menyimpan transaksi.", "error");
  }
}

// 14. Dialog Input Nomor WhatsApp
function promptKirimWA(trxData) {
  Swal.fire({
    title: "Kirim Struk WhatsApp",
    input: "tel",
    inputLabel: "Masukkan Nomor HP Pelanggan",
    inputPlaceholder: "Contoh: 081234567890",
    showCancelButton: true,
    confirmButtonText: "Kirim Sekarang",
    cancelButtonText: "Batal",
    confirmButtonColor: "#0284C7"
  }).then((res) => {
    if (res.isConfirmed && res.value) {
      kirimStrukWA(trxData, res.value);
    }
  });
}

// 15. Kirim Struk via WhatsApp (QUEENA CAKERY)
function kirimStrukWA(trxData, noHp) {
  let formattedPhone = noHp.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  }

  let pesan = `*--- QUEENA CAKERY ---*\n`;
  pesan += `*Nota:* ${trxData.transaksiID}\n`;
  pesan += `*Tanggal:* ${new Date().toLocaleString('id-ID')}\n`;
  pesan += `*Kasir:* ${trxData.kasir}\n`;
  pesan += `-----------------------------------\n`;
  pesan += `*DETAIL BELANJA:*\n`;

  trxData.items.forEach(item => {
    pesan += `• ${item.namaBarang} (${item.qty}x) = Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
  });

  pesan += `-----------------------------------\n`;
  if (trxData.diskon > 0) {
    pesan += `*Diskon:* Rp ${trxData.diskon.toLocaleString('id-ID')}\n`;
  }
  pesan += `*TOTAL BAYAR:* *Rp ${trxData.total.toLocaleString('id-ID')}*\n`;
  pesan += `*Metode:* ${trxData.metode}\n`;
  pesan += `*Bayar:* Rp ${trxData.bayar.toLocaleString('id-ID')}\n`;
  pesan += `*Kembali:* Rp ${trxData.kembali.toLocaleString('id-ID')}\n\n`;
  pesan += `Terima kasih telah berkunjung ke QUEENA CAKERY! 🙏🏻`;

  const urlWA = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(pesan)}`;
  window.open(urlWA, '_blank');
}