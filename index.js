// 1. Panggil semua id yang ada di HTML
const minusButton = document.getElementById('minusButton');
const plusButton = document.getElementById('plusButton');
const counter = document.getElementById('counter');
const resetButton = document.getElementById('resetButton');

// 2. buat variable untuk angkanya bisa berubah2 
let count = 0;

// 3. buat ganti tampilan angkanya
function updateCounter() {
    counter.textContent = count;

    // Ganti warna angka berdasarkan nilai count
    if (count < 0) {
        counter.style.color = '#dc2626'; // merah
    } else if (count > 0) {
        counter.style.color = '#16a34a'; // hijau
    } else {
        counter.style.color = '#db2777'; // pink (default / nol)
    }
}

// 4. Ngetest updateCounter jalan atau enggak
// updateCounter(); 

// 5. fungsi untuk mendengar minusButton ketika diklik, dan berkurang
minusButton.addEventListener('click', function () {
    count = count - 1;
    updateCounter();
});

// 6. fungsi untuk mendengar plusButton ketika diklik, dan bertambah
plusButton.addEventListener('click', function() {
    count = count + 1;
    updateCounter();
});

// 7. fungsi untuk mereset angka kembali ke 0 
resetButton.addEventListener('click', function() {
    count = 0;
    updateCounter();
})