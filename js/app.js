/**
 * APLIKASI KASIR WARKOP WANSONG 97
 * Frontend Engine & Apps Script Integration
 */

// 1. Konfigurasi Endpoint Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbys1snMwkwXzPA4EPMbFr9S1CI8htf3sl4r0SwYSLDSMr4oXxkULhBg_c_SkO3S2RJ92A/exec";

// State Global Aplikasi
let dataBarang = [];
let cart = [];
let currentTrxID = "";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initTrxID();
  loadDataBarang();
});

/**
 * 2. Generator ID Transaksi dengan Prefix AVD-TRX-
 */
function initTrxID() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  currentTrxID = `AVD-TRX-${randomNum}`;
  document.getElementById("trxIDDisplay").innerText = currentTrxID;
}

/**
 * 3. Ambil Data Barang dari Apps Script Backend
 */
async function loadDataBarang() {
  const gridContainer = document.getElementById("productGrid");
  
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getBarang`);
    const result = await response.json();

    if (result.status === "success") {
      dataBarang = result.data || [];
      renderProducts(dataBarang);
    } else {
      gridContainer.innerHTML = `<div class="text-center text-danger py-4">Gagal memuat barang: ${result.message}</div>`;
    }
  } catch (err) {
    gridContainer.innerHTML = `<div class="text-center text-danger py-4">Error Koneksi: ${err.message}</div>`;
  }
}

/**
 * 4. Render Grid Produk Kasir (Lengkap dengan Tombol Hapus Barang)
 */
function renderProducts(list) {
  const gridContainer = document.getElementById("productGrid");
  
  if (!list || list.length === 0) {
    gridContainer.innerHTML = `<div class="text-center text-muted py-5">Belum ada data produk.</div>`;
    return;
  }

  let html = `<div class="row row-cols-2 row-cols-md-3 g-2">`;
  
  list.forEach(item => {
    const hargaFormat = Number(item.HargaJual || item.hargaJual || 0).toLocaleString("id-ID");
    const stok = item.Stok || item.stok || 0;
    const nama = item.NamaBarang || item.namaBarang || 'Tanpa Nama';
    const id = item.BarangID || item.barangID;

    html += `
      <div class="col">
        <div class="card pos-card product-item h-100 p-2 position-relative">
          <div onclick="addToCart('${id}')" style="cursor: pointer;">
            <div class="fw-bold text-truncate text-dark small pe-3" title="${nama}">${nama}</div>
            <div class="text-primary fw-bold fs-7 mt-1">Rp ${hargaFormat}</div>
            <div class="d-flex justify-content-between align-items-center mt-2 small text-muted">
              <span class="badge bg-light text-dark border">Stok: ${stok}</span>
              <i class="bi bi-plus-circle-fill text-primary fs-6"></i>
            </div>
          </div>
          
          <button class="btn btn-sm btn-link text-danger position-absolute top-0 end-0 p-1 lh-1" 
                  title="Hapus Barang" 
                  onclick="event.stopPropagation(); konfirmasiHapusBarang('${id}', '${nama}')">
            <i class="bi bi-x-circle-fill fs-6"></i>
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  gridContainer.innerHTML = html;
}

/**
 * Fitur 1: Fungsi Konfirmasi & Hapus Barang dari Backend Apps Script
 */
async function konfirmasiHapusBarang(barangID, namaBarang) {
  const confirmResult = await Swal.fire({
    title: 'Hapus Barang?',
    text: `Apakah Anda yakin ingin menghapus "${namaBarang}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  });

  if (!confirmResult.isConfirmed) return;

  Swal.fire({
    title: 'Menghapus Barang...',
    text: 'Mohon tunggu',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const payload = {
    action: "hapusBarang",
    data: {
      barangID: barangID
    }
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === "success") {
      Swal.fire('Terhapus!', 'Barang berhasil dihapus.', 'success');
      loadDataBarang(); // Refresh daftar barang
    } else {
      Swal.fire('Gagal', result.message, 'error');
    }
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
}

/**
 * 5. Filter Pencarian Barang
 */
function filterBarang() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = dataBarang.filter(item => {
    const nama = (item.NamaBarang || item.namaBarang || '').toLowerCase();
    const barcode = (item.Barcode || item.barcode || '').toLowerCase();
    return nama.includes(query) || barcode.includes(query);
  });
  renderProducts(filtered);
}

/**
 * 6. Fitur Keranjang Belanja
 */
function addToCart(barangID) {
  const item = dataBarang.find(b => (b.BarangID || b.barangID) == barangID);
  if (!item) return;

  const existing = cart.find(c => c.barangID == barangID);
  const stokTersedia = Number(item.Stok || item.stok || 0);

  if (existing) {
    if (existing.qty + 1 > stokTersedia) {
      Swal.fire('Stok Tidak Cukup', `Stok ${item.NamaBarang || item.namaBarang} tersisa ${stokTersedia}`, 'warning');
      return;
    }
    existing.qty++;
    existing.subtotal = existing.qty * existing.harga;
  } else {
    if (stokTersedia < 1) {
      Swal.fire('Stok Habis', 'Stok barang ini sudah habis!', 'warning');
      return;
    }
    cart.push({
      barangID: barangID,
      namaBarang: item.NamaBarang || item.namaBarang,
      harga: Number(item.HargaJual || item.hargaJual || 0),
      qty: 1,
      subtotal: Number(item.HargaJual || item.hargaJual || 0)
    });
  }

  renderCart();
}

function updateQty(barangID, delta) {
  const item = cart.find(c => c.barangID == barangID);
  if (!item) return;

  const original = dataBarang.find(b => (b.BarangID || b.barangID) == barangID);
  const stokTersedia = Number(original.Stok || original.stok || 0);

  item.qty += delta;

  if (item.qty > stokTersedia) {
    item.qty = stokTersedia;
    Swal.fire('Batas Stok', `Maksimal stok tercapai (${stokTersedia})`, 'info');
  }

  if (item.qty <= 0) {
    cart = cart.filter(c => c.barangID != barangID);
  } else {
    item.subtotal = item.qty * item.harga;
  }

  renderCart();
}

function removeFromCart(barangID) {
  cart = cart.filter(c => c.barangID != barangID);
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById("cartBody");
  tbody.innerHTML = "";

  cart.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div class="fw-semibold text-truncate" style="max-width: 140px;">${item.namaBarang}</div></td>
      <td>Rp ${item.harga.toLocaleString("id-ID")}</td>
      <td class="text-center">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary px-2" onclick="updateQty('${item.barangID}', -1)">-</button>
          <span class="btn btn-light disabled px-2 fw-bold">${item.qty}</span>
          <button class="btn btn-outline-secondary px-2" onclick="updateQty('${item.barangID}', 1)">+</button>
        </div>
      </td>
      <td class="text-end fw-bold">Rp ${item.subtotal.toLocaleString("id-ID")}</td>
      <td class="text-center">
        <button class="btn btn-link text-danger p-0 ms-1" onclick="removeFromCart('${item.barangID}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  hitungTotal();
}

/**
 * 7. Hitung Subtotal, Diskon, & Kembalian
 */
function hitungTotal() {
  const subtotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  const diskon = Number(document.getElementById("discountInput").value) || 0;
  const cash = Number(document.getElementById("cashInput").value) || 0;

  const grandTotal = Math.max(0, subtotal - diskon);
  const kembalian = cash - grandTotal;

  document.getElementById("grandTotalDisplay").innerText = `Rp ${grandTotal.toLocaleString("id-ID")}`;
  
  const changeEl = document.getElementById("changeDisplay");
  if (cash >= grandTotal && grandTotal > 0) {
    changeEl.innerText = `Rp ${kembalian.toLocaleString("id-ID")}`;
    changeEl.className = "fw-bold text-success";
  } else {
    changeEl.innerText = `Rp 0`;
    changeEl.className = "fw-bold text-muted";
  }
}

function resetCart() {
  cart = [];
  document.getElementById("discountInput").value = 0;
  document.getElementById("cashInput").value = "";
  renderCart();
  initTrxID();
}

/**
 * Fitur 2: Fungsi Format & Kirim Struk ke WhatsApp
 */
function kirimStrukWA(trxData, noHp) {
  // Format nomor HP (ubah awalan 08xx menjadi 628xx)
  let formattedPhone = noHp.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  }

  // Susun Teks Pesan Struk Digital
  let pesan = `*--- WARKOP WANSONG 97 ---*\n`;
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
  pesan += `Terima kasih telah berkunjung ke WARKOP WANSONG 97! 🙏🏻`;

  // Buka WhatsApp API Click to Chat
  const urlWA = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(pesan)}`;
  window.open(urlWA, '_blank');
}

/**
 * 8. Simpan Transaksi Penjualan & Trigger Kirim WA
 */
async function prosesBayar() {
  if (cart.length === 0) {
    Swal.fire('Keranjang Kosong', 'Pilih minimal satu barang terlebih dahulu.', 'warning');
    return;
  }

  const subtotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  const diskon = Number(document.getElementById("discountInput").value) || 0;
  const grandTotal = Math.max(0, subtotal - diskon);
  const cash = Number(document.getElementById("cashInput").value) || 0;
  const metode = document.getElementById("payMethod").value;

  if (metode === "Tunai" && cash < grandTotal) {
    Swal.fire('Uang Kurang', 'Jumlah uang yang diterima kurang dari total bayar!', 'warning');
    return;
  }

  const payload = {
    action: "simpanPenjualan",
    data: {
      transaksiID: currentTrxID,
      kasir: "Kasir 1",
      pelanggan: "Umum",
      total: grandTotal,
      diskon: diskon,
      bayar: cash,
      kembali: Math.max(0, cash - grandTotal),
      metode: metode,
      items: cart
    }
  };

  Swal.fire({
    title: 'Memproses Transaksi...',
    text: 'Mohon tunggu sebentar',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === "success") {
      const trxDataSimpan = { ...payload.data };

      // Fitur 2: Pop-up Sukses dengan Tombol Kirim WA
      Swal.fire({
        icon: 'success',
        title: 'Transaksi Berhasil!',
        text: `ID: ${currentTrxID}`,
        showCancelButton: true,
        confirmButtonColor: '#25D366', // Warna Hijau WA
        cancelButtonColor: '#6B7280',
        confirmButtonText: '<i class="bi bi-whatsapp"></i> Kirim Struk WA',
        cancelButtonText: 'Selesai / Transaksi Baru'
      }).then((res) => {
        if (res.isConfirmed) {
          // Input Nomor WA Pelanggan
          Swal.fire({
            title: 'Kirim Struk WA',
            input: 'tel',
            inputLabel: 'Masukkan Nomor WA Pelanggan:',
            inputPlaceholder: 'Contoh: 081234567890',
            showCancelButton: true,
            confirmButtonText: 'Kirim Sekarang',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#25D366',
            inputValidator: (value) => {
              if (!value) {
                return 'Nomor WA tidak boleh kosong!';
              }
            }
          }).then((inputRes) => {
            if (inputRes.isConfirmed && inputRes.value) {
              kirimStrukWA(trxDataSimpan, inputRes.value);
            }
          });
        }
      });

      resetCart();
      loadDataBarang(); // Refresh stok barang
    } else {
      Swal.fire('Gagal Simpan', result.message, 'error');
    }
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
}

/**
 * 9. Fungsi Tambah Barang Baru
 */
async function simpanBarangBaru() {
  const barcode = document.getElementById("inBarcode").value;
  const nama = document.getElementById("inNamaBarang").value;
  const kategori = document.getElementById("inKategori").value;
  const satuan = document.getElementById("inSatuan").value;
  const hgModal = Number(document.getElementById("inHargaModal").value);
  const hgJual = Number(document.getElementById("inHargaJual").value);
  const stok = Number(document.getElementById("inStok").value);
  const expired = document.getElementById("inExpired").value;

  if (!barcode || !nama || !satuan || !hgJual) {
    Swal.fire('Lengkapi Data', 'Harap isi semua kolom wajib!', 'warning');
    return;
  }

  const payload = {
    action: "tambahBarang",
    data: {
      barangID: "BRG-" + Math.floor(Math.random() * 1000000),
      barcode: barcode,
      kodeBarang: barcode,
      namaBarang: nama,
      kategori: kategori,
      satuan: satuan,
      hargaModal: hgModal,
      hargaJual: hgJual,
      stok: stok,
      supplierID: "SUP-001",
      expired: expired
    }
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (result.status === "success") {
      Swal.fire('Berhasil', 'Barang baru berhasil ditambahkan!', 'success');
      document.getElementById("formTambahBarang").reset();
      
      const modalEl = document.getElementById('modalTambahBarang');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();

      loadDataBarang();
    } else {
      Swal.fire('Gagal', result.message, 'error');
    }
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
}