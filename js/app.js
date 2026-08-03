/**
 * QUEENA CAKERY - Frontend POS Engine
 * Integrasi Google Apps Script Web App API
 */

// URL Web App Google Apps Script QUEENA CAKERY
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyscHY_oy0LO1TUpOVF7kLhXs9DjeuD3duXosRN2YYSiH5_lTh5mvUI7elhDI4XGUkx/exec";

// Global State Management
let productsData = [];
let cart = [];
let currentTrxID = "";

// Inisialisasi saat dokumen dimuat
document.addEventListener("DOMContentLoaded", () => {
  generateTrxID();
  loadProducts();
});

// 1. Generate TRX ID Otomatis
function generateTrxID() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  currentTrxID = `AVD-TRX-${randomNum}`;
  document.getElementById("trxIDDisplay").innerText = currentTrxID;
}

// 2. Fetch Data Produk dari Google Sheets API
async function loadProducts() {
  const grid = document.getElementById("productGrid");
  
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getProducts`);
    const data = await response.json();

    if (data.status === "success") {
      productsData = data.data;
      renderProducts(productsData);
    } else {
      grid.innerHTML = `<div class="alert alert-danger text-center">Gagal memuat produk.</div>`;
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

// 3. Render Daftar Produk ke UI
function renderProducts(items) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  if (items.length === 0) {
    grid.innerHTML = `<div class="text-center py-5 text-muted">Barang tidak ditemukan.</div>`;
    return;
  }

  const row = document.createElement("div");
  row.className = "row g-2";

  items.forEach((item) => {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4";

    col.innerHTML = `
      <div class="card pos-card product-item p-2 h-100 position-relative" onclick="addToCart('${item.barcode}')">
        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 px-1 py-0" 
                style="font-size: 0.7rem; z-index: 10;" 
                title="Hapus Barang" 
                onclick="event.stopPropagation(); hapusBarang('${item.barcode}', '${item.namaBarang}')">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="card-body p-1 d-flex flex-column justify-content-between">
          <div>
            <span class="badge bg-light-sky text-primary mb-1" style="font-size: 0.65rem;">${item.kategori || 'Umum'}</span>
            <h6 class="fw-bold mb-1 text-truncate pe-3" style="font-size: 0.85rem;" title="${item.namaBarang}">${item.namaBarang}</h6>
            <small class="text-muted d-block" style="font-size: 0.7rem;">Stok: ${item.stok} ${item.satuan}</small>
          </div>
          <div class="mt-2 pt-1 border-top d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary" style="font-size: 0.85rem;">Rp ${Number(item.hargaJual).toLocaleString('id-ID')}</span>
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
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = productsData.filter((p) => 
    p.namaBarang.toLowerCase().includes(query) || 
    String(p.barcode).toLowerCase().includes(query)
  );
  renderProducts(filtered);
}

// 5. Keranjang Belanja Logic
function addToCart(barcode) {
  const product = productsData.find((p) => String(p.barcode) === String(barcode));
  if (!product) return;

  if (product.stok <= 0) {
    Swal.fire("Stok Habis", `Stok untuk ${product.namaBarang} telah habis!`, "warning");
    return;
  }

  const existingItem = cart.find((item) => String(item.barcode) === String(barcode));

  if (existingItem) {
    if (existingItem.qty + 1 > product.stok) {
      Swal.fire("Stok Kurang", `Stok maksimum untuk ${product.namaBarang} adalah ${product.stok}`, "warning");
      return;
    }
    existingItem.qty += 1;
    existingItem.subtotal = existingItem.qty * existingItem.hargaJual;
  } else {
    cart.push({
      barcode: product.barcode,
      namaBarang: product.namaBarang,
      hargaJual: Number(product.hargaJual),
      qty: 1,
      subtotal: Number(product.hargaJual)
    });
  }

  renderCart();
}

function updateQty(barcode, change) {
  const item = cart.find((i) => String(i.barcode) === String(barcode));
  const product = productsData.find((p) => String(p.barcode) === String(barcode));
  
  if (!item) return;

  const newQty = item.qty + change;

  if (newQty <= 0) {
    removeFromCart(barcode);
    return;
  }

  if (product && newQty > product.stok) {
    Swal.fire("Stok Kurang", `Stok maksimum adalah ${product.stok}`, "warning");
    return;
  }

  item.qty = newQty;
  item.subtotal = item.qty * item.hargaJual;
  renderCart();
}

function removeFromCart(barcode) {
  cart = cart.filter((i) => String(i.barcode) !== String(barcode));
  renderCart();
}

function resetCart() {
  cart = [];
  document.getElementById("cashInput").value = "";
  document.getElementById("discountInput").value = "0";
  renderCart();
}

function renderCart() {
  const body = document.getElementById("cartBody");
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
        <div class="fw-semibold text-truncate" style="max-width: 150px;">${item.namaBarang}</div>
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

// 6. Hitung Total Pembayaran & Kembalian
function hitungTotal() {
  const subtotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  const discount = Number(document.getElementById("discountInput").value) || 0;
  const cash = Number(document.getElementById("cashInput").value) || 0;

  const grandTotal = Math.max(0, subtotal - discount);
  const change = Math.max(0, cash - grandTotal);

  document.getElementById("grandTotalDisplay").innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
  document.getElementById("changeDisplay").innerText = `Rp ${change.toLocaleString('id-ID')}`;
}

// 7. Simpan Barang Baru ke Database
async function simpanBarangBaru() {
  const barcode = document.getElementById("inBarcode").value;
  const namaBarang = document.getElementById("inNamaBarang").value;
  const kategori = document.getElementById("inKategori").value;
  const satuan = document.getElementById("inSatuan").value;
  const hargaModal = document.getElementById("inHargaModal").value;
  const hargaJual = document.getElementById("inHargaJual").value;
  const stok = document.getElementById("inStok").value;
  const expired = document.getElementById("inExpired").value;

  if (!barcode || !namaBarang || !hargaJual || !stok) {
    Swal.fire("Lengkapi Data", "Mohon isi semua bidang yang wajib!", "warning");
    return;
  }

  Swal.fire({
    title: "Menyimpan...",
    text: "Sedang menambahkan barang ke sistem",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const payload = {
    action: "addProduct",
    barcode,
    namaBarang,
    kategori,
    satuan,
    hargaModal: Number(hargaModal),
    hargaJual: Number(hargaJual),
    stok: Number(stok),
    expired
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const res = await response.json();

    if (res.status === "success") {
      Swal.fire("Berhasil", "Barang baru berhasil disimpan!", "success");
      document.getElementById("formTambahBarang").reset();
      
      const modal = bootstrap.Modal.getInstance(document.getElementById("modalTambahBarang"));
      if (modal) modal.hide();

      loadProducts();
    } else {
      Swal.fire("Gagal", res.message || "Gagal menyimpan barang.", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Terjadi kesalahan saat menyambung ke server.", "error");
  }
}

// 8. Hapus Barang dari Katalog
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
      body: JSON.stringify({ action: "deleteProduct", barcode })
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

// 9. Proses Transaksi Penjualan
async function prosesBayar() {
  if (cart.length === 0) {
    Swal.fire("Keranjang Kosong", "Pilih minimal 1 produk untuk diproses.", "warning");
    return;
  }

  const subtotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  const discount = Number(document.getElementById("discountInput").value) || 0;
  const cash = Number(document.getElementById("cashInput").value) || 0;
  const method = document.getElementById("payMethod").value;
  const grandTotal = Math.max(0, subtotal - discount);

  if (method === "Tunai" && cash < grandTotal) {
    Swal.fire("Uang Kurang", "Nominal pembayaran tunai kurang dari total bayar!", "warning");
    return;
  }

  const change = Math.max(0, cash - grandTotal);
  const kasir = document.getElementById("kasirName").innerText;

  const trxPayload = {
    action: "createTransaction",
    transaksiID: currentTrxID,
    kasir,
    metode: method,
    items: cart,
    subtotal,
    diskon: discount,
    total: grandTotal,
    bayar: cash,
    kembali: change
  };

  Swal.fire({
    title: "Memproses...",
    text: "Menyimpan transaksi ke database",
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
          <div class="text-start p-2 bg-light rounded mb-3">
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
    Swal.fire("Error", "Terjadi kesalahan saat memproses transaksi.", "error");
  }
}

// 10. Fitur Kirim Struk via WhatsApp (QUEENA CAKERY)
function promptKirimWA(trxData) {
  Swal.fire({
    title: "Kirim Struk WhatsApp",
    input: "tel",
    inputLabel: "Masukkan Nomor HP Pelanggan (Contoh: 081234567890)",
    inputPlaceholder: "08xxxxxxxxxx",
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

function kirimStrukWA(trxData, noHp) {
  let formattedPhone = noHp.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  }

  // Header Struk - QUEENA CAKERY
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
  
  // Footer Struk - QUEENA CAKERY
  pesan += `Terima kasih telah berkunjung ke QUEENA CAKERY! 🙏🏻`;

  const urlWA = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(pesan)}`;
  window.open(urlWA, '_blank');
}
