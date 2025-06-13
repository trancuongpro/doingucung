// Lấy các phần tử DOM
const fileInput = document.getElementById('file-input');
const uploadLabel = document.getElementById('upload-label');
const convertBtn = document.getElementById('convert-btn');
const osmdContainer = document.getElementById('osmd-container');
const resultContainer = document.getElementById('result-container');
const thankYouMessage = document.querySelector('.thank-you');

let fileContent = null; // Biến lưu nội dung file XML
let osmd = null; // Biến lưu đối tượng OSMD

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
            // Hiển thị sheet nhạc ngay khi tải file thành công
            renderSheetMusic(fileContent);
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
        // Dùng DOMParser của trình duyệt để phân tích XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "application/xml");

        // Kiểm tra lỗi phân tích XML
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
            throw new Error("File XML không hợp lệ hoặc bị lỗi.");
        }

        const measures = xmlDoc.getElementsByTagName('measure');
        let finalResult = '<h3>Kết Quả Chuyển Đổi:</h3>';
        
        // Duyệt qua từng khuôn nhạc (measure)
        for (let i = 0; i < measures.length; i++) {
            const measure = measures[i];
            const notes = measure.getElementsByTagName('note');
            let measureText = '';

            // Duyệt qua từng nốt trong khuôn
            for (let j = 0; j < notes.length; j++) {
                const note = notes[j];
                
                // Bỏ qua nếu là dấu lặng (rest)
                if (note.getElementsByTagName('rest').length > 0) {
                    continue;
                }

                const stepElement = note.getElementsByTagName('step')[0];
                if (stepElement) {
                    const step = stepElement.textContent.trim().toUpperCase();
                    const translatedNote = translationMap[step] || `(${step}?)`; // Nếu không tìm thấy, ghi rõ nốt gốc
                    measureText += translatedNote + ' ';
                }
            }
            
            // Nếu khuôn có nốt nhạc thì mới thêm vào kết quả
            if (measureText.trim() !== '') {
                finalResult += measureText.trim() + ' . ';
            }
        }
        
        // Hiển thị kết quả và lời cảm ơn
        resultContainer.innerHTML = finalResult;
        resultContainer.style.display = 'block';
        thankYouMessage.style.display = 'block';

        // Cuộn mượt mà đến khu vực kết quả
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        resultContainer.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> ${error.message}</p>`;
        resultContainer.style.display = 'block';
        
        // Cuộn mượt mà đến khu vực kết quả ngay cả khi có lỗi
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

// Hàm để hiển thị sheet nhạc
function renderSheetMusic(xmlString) {
    osmdContainer.style.display = 'block';
    osmdContainer.innerHTML = ''; // Xóa sheet cũ
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdContainer, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
    });

    osmd.load(xmlString)
       .then(() => {
           osmd.render();
       })
       .catch((e) => {
           osmdContainer.innerHTML = `<p style="color: red;">Không thể hiển thị bản nhạc. File có thể bị lỗi.</p>`;
           console.error("Lỗi OSMD:", e);
       });
}

// Hàm để reset giao diện khi tải file mới
function resetDisplay() {
    osmdContainer.style.display = 'none';
    osmdContainer.innerHTML = '';
    resultContainer.style.display = 'none';
    resultContainer.innerHTML = '';
    thankYouMessage.style.display = 'none';
}