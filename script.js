// Lấy các phần tử DOM
const fileInput = document.getElementById('file-input');
const uploadLabel = document.getElementById('upload-label');
const convertBtn = document.getElementById('convert-btn');
const osmdContainer = document.getElementById('osmd-container');
const resultContainer = document.getElementById('result-container');
const thankYouMessage = document.querySelector('.thank-you');

let fileContent = null; // Biến lưu nội dung file XML
let osmd = null; // Biến lưu instance OSMD

// Xử lý sự kiện khi người dùng chọn file
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // Xóa kết quả cũ
    resetDisplay();

    // Kiểm tra đuôi file
    if (file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.musicxml')) {
        uploadLabel.textContent = "Đúng File Rồi Mời Bạn Nhấn Thực Hiện";
        uploadLabel.className = 'upload-label valid-file';
        convertBtn.disabled = false; // Kích hoạt nút "Thực Hiện"

        // Đọc nội dung file
        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;

            // Kiểm tra file XML hợp lệ và hiển thị bản nhạc ngay
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(fileContent, "application/xml");
                const parserError = xmlDoc.querySelector("parsererror");
                if (parserError) {
                    throw new Error("File XML không hợp lệ hoặc bị lỗi.");
                }

                // Hiển thị bản nhạc
                osmdContainer.style.display = 'block';
                osmdContainer.classList.add('valid-sheet'); // Thêm class để sáng khung
                osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdContainer, {
                    autoResize: true,
                    backend: "svg",
                    drawTitle: true,
                    drawPartNames: true,
                    drawMeasureNumbers: true,
                });
                osmd.load(fileContent).then(() => {
                    osmd.render();
                }).catch((e) => {
                    osmdContainer.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> Không thể hiển thị bản nhạc. File có thể bị lỗi: ${e.message}</p>`;
                    osmdContainer.style.display = 'block';
                    osmdContainer.classList.remove('valid-sheet'); // Xóa class nếu lỗi
                    convertBtn.disabled = true;
                    uploadLabel.textContent = "File XML bị lỗi, vui lòng chọn lại.";
                    uploadLabel.className = 'upload-label invalid-file';
                });
            } catch (error) {
                osmdContainer.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> ${error.message}</p>`;
                osmdContainer.style.display = 'block';
                osmdContainer.classList.remove('valid-sheet'); // Xóa class nếu lỗi
                convertBtn.disabled = true;
                uploadLabel.textContent = "File XML bị lỗi, vui lòng chọn lại.";
                uploadLabel.className = 'upload-label invalid-file';
            }
        };
        reader.readAsText(file);
    } else {
        uploadLabel.textContent = "Không Đúng File .xml Mời Bạn Xem Lại";
        uploadLabel.className = 'upload-label invalid-file';
        convertBtn.disabled = true; // Vô hiệu hóa nút
        fileContent = null;
    }
});

// Xử lý sự kiện khi nhấn nút "Thực Hiện"
convertBtn.addEventListener('click', () => {
    if (!fileContent) {
        alert("Vui lòng chọn một file MusicXML hợp lệ trước.");
        return;
    }

    // Bản đồ chuyển đổi nốt nhạc
    const translationMap = {
        'C': 'Oan',
        'D': 'Hò',
        'E': 'U',
        'F': 'Xự',
        'G': 'Xang',
        'A': 'Xê',
        'B': 'Cống'
    };

    try {
        // Dùng DOMParser để phân tích XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "application/xml");

        // Kiểm tra lỗi phân tích XML
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
            throw new Error("File XML không hợp lệ hoặc bị lỗi.");
        }

        // Xử lý chuyển đổi sang ngũ cung theo từng dòng
        const measures = xmlDoc.getElementsByTagName('measure');
        if (measures.length === 0) {
            throw new Error("File MusicXML không chứa measure nào.");
        }

        let resultText = '';
        for (let i = 0; i < measures.length; i++) {
            const measure = measures[i];
            const notes = measure.getElementsByTagName('note');
            let measureText = '';

            // Duyệt qua từng nốt trong measure
            for (let j = 0; j < notes.length; j++) {
                const note = notes[j];

                // Bỏ qua nếu là dấu lặng (rest)
                if (note.getElementsByTagName('rest').length > 0) {
                    continue;
                }

                const stepElement = note.getElementsByTagName('step')[0];
                if (stepElement) {
                    const step = stepElement.textContent.trim().toUpperCase();
                    const translatedNote = translationMap[step] || `(${step}?)`;
                    measureText += translatedNote + ' ';
                }
            }

            // Thêm kết quả của measure vào resultText nếu có nốt
            if (measureText.trim() !== '') {
                resultText += `Dòng ${i + 1}: ${measureText.trim()}\n`;
            }
        }

        // Hiển thị kết quả ngũ cung với tiêu đề
        if (resultText.trim() === '') {
            resultContainer.innerHTML = '<p>Không tìm thấy nốt nhạc nào để chuyển đổi.</p>';
        } else {
            resultContainer.innerHTML = `
                <div class="result-title">---Đây Là Sheet Ngũ Cung Đã Chuyển Đổi Của Bạn---</div>
                <pre>${resultText.trim()}</pre>
            `;
        }
        resultContainer.style.display = 'block';

        // Hiển thị lời cảm ơn
        thankYouMessage.style.display = 'block';

        // Cuộn mượt mà đến kết quả
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        resultContainer.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> ${error.message}</p>`;
        resultContainer.style.display = 'block';
        thankYouMessage.style.display = 'block';
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

// Hàm để reset giao diện khi tải file mới
function resetDisplay() {
    osmdContainer.style.display = 'none';
    osmdContainer.innerHTML = '';
    osmdContainer.classList.remove('valid-sheet'); // Xóa class valid-sheet
    resultContainer.style.display = 'none';
    resultContainer.innerHTML = '';
    thankYouMessage.style.display = 'none';
    convertBtn.disabled = true;
    uploadLabel.textContent = "Nhấn Vào Đây Để Upload File Sheet Đuôi XML";
    uploadLabel.className = 'upload-label';
}
