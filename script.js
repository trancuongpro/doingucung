// Lấy các phần tử DOM
const fileInput = document.getElementById('file-input');
const uploadLabel = document.getElementById('upload-label');
const convertBtn = document.getElementById('convert-btn');
const sheetContainer = document.getElementById('sheet-container');
const thankYouMessage = document.querySelector('.thank-you');

let fileContent = null; // Biến lưu nội dung file XML

// Bản đồ chuyển đổi nốt nhạc sang ngũ cung
const translationMap = {
    'C': 'Oan',
    'D': 'Hò',
    'E': 'U',
    'F': 'Xự',
    'G': 'Xang',
    'A': 'Xê',
    'B': 'Cống'
};

// Hàm kiểm tra measure có hợp lệ không
function isValidMeasure(measure) {
    const notes = measure.getElementsByTagName('note');
    const attributes = measure.getElementsByTagName('attributes');
    return notes.length > 0 || attributes.length > 0; // Measure phải có nốt hoặc thuộc tính
}

// Hàm tạo MusicXML cho đoạn ngũ cung
function createPentatonicMusicXML(measures, startMeasure, endMeasure) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fileContent, "application/xml");
    const newXmlDoc = parser.parseFromString('<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"></score-partwise>', "application/xml");

    // Sao chép part-list
    const partList = xmlDoc.querySelector('part-list');
    if (!partList) {
        throw new Error("File MusicXML không có part-list.");
    }
    newXmlDoc.querySelector('score-partwise').appendChild(partList.cloneNode(true));

    // Sao chép work (tiêu đề, tác giả, nếu có)
    const work = xmlDoc.querySelector('work');
    if (work) {
        newXmlDoc.querySelector('score-partwise').appendChild(work.cloneNode(true));
    }

    // Tạo phần part mới
    const part = xmlDoc.querySelector('part');
    if (!part) {
        throw new Error("File MusicXML không có part.");
    }
    const newPart = newXmlDoc.createElement('part');
    newPart.setAttribute('id', part.getAttribute('id'));

    // Sao chép attributes của measure đầu tiên (nhịp, khóa, v.v.)
    const firstMeasure = measures[0];
    const attributes = firstMeasure.getElementsByTagName('attributes')[0];
    if (attributes) {
        const firstNewMeasure = newXmlDoc.createElement('measure');
        firstNewMeasure.setAttribute('number', '0');
        firstNewMeasure.appendChild(attributes.cloneNode(true));
        newPart.appendChild(firstNewMeasure);
    }

    // Lấy các measure trong khoảng
    for (let i = startMeasure; i <= endMeasure && i < measures.length; i++) {
        if (!isValidMeasure(measures[i])) {
            console.warn(`Measure ${i} không hợp lệ, bỏ qua.`);
            continue;
        }
        const measure = measures[i].cloneNode(true);
        measure.setAttribute('number', (i - startMeasure + 1).toString());
        const notes = measure.getElementsByTagName('note');

        let lastDuration = 0; // Theo dõi duration của nốt trước
        let lyricRow = 1; // Bắt đầu từ hàng lyric 1

        for (let j = 0; j < notes.length; j++) {
            const note = notes[j];
            // Bỏ qua dấu lặng hoặc nốt không có step
            if (note.getElementsByTagName('rest').length > 0 || !note.getElementsByTagName('step')[0]) {
                continue;
            }

            const stepElement = note.getElementsByTagName('step')[0];
            const step = stepElement.textContent.trim().toUpperCase();
            const pentatonicNote = translationMap[step] || step;
            const durationElement = note.getElementsByTagName('duration')[0];
            const duration = durationElement ? parseInt(durationElement.textContent) : 0;

            // Nếu nốt hiện tại quá gần nốt trước (duration nhỏ), chuyển sang hàng lyric khác
            if (j > 0 && duration <= 2 && lastDuration <= 2) {
                lyricRow = lyricRow === 1 ? 2 : 1; // Chuyển giữa hàng 1 và 2
            } else {
                lyricRow = 1; // Đặt lại về hàng 1 nếu không gần
            }
            lastDuration = duration;

            // Thêm lời bài hát (lyric) với tên ngũ cung
            const lyric = newXmlDoc.createElement('lyric');
            lyric.setAttribute('number', lyricRow.toString()); // Đặt hàng lyric
            const syllabic = newXmlDoc.createElement('syllabic');
            syllabic.textContent = 'single';
            const text = newXmlDoc.createElement('text');
            text.textContent = pentatonicNote;
            lyric.appendChild(syllabic);
            lyric.appendChild(text);
            note.appendChild(lyric);
        }
        newPart.appendChild(measure);
    }

    newXmlDoc.querySelector('score-partwise').appendChild(newPart);

    // Chuyển đổi XML thành chuỗi
    return new XMLSerializer().serializeToString(newXmlDoc);
}

// Xử lý sự kiện khi người dùng chọn file
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // Xóa nội dung cũ
    resetDisplay();

    // Kiểm tra đuôi file
    if (file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.musicxml')) {
        uploadLabel.textContent = "Đúng File Rồi Mời Bạn Nhấn Thực Hiện";
        uploadLabel.className = 'upload-label valid-file';
        convertBtn.disabled = false;

        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;

            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(fileContent, "application/xml");
                const parserError = xmlDoc.querySelector("parsererror");
                if (parserError) {
                    throw new Error("File XML không hợp lệ hoặc bị lỗi.");
                }

                // Hiển thị bản nhạc gốc ban đầu
                const osmdDiv = document.createElement('div');
                osmdDiv.className = 'sheet-segment';
                const title = document.createElement('div');
                title.className = 'segment-title';
                title.textContent = 'Sheet Nhạc Gốc (Ban Đầu)';
                osmdDiv.appendChild(title);
                const osmdContainer = document.createElement('div');
                osmdDiv.appendChild(osmdContainer);
                sheetContainer.appendChild(osmdDiv);

                const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdContainer, {
                    autoResize: true,
                    backend: "svg",
                    drawTitle: true,
                    drawPartNames: true,
                    drawMeasureNumbers: true,
                });
                osmd.load(fileContent).then(() => {
                    osmd.render();
                    osmdDiv.classList.add('valid-sheet');
                }).catch((e) => {
                    osmdDiv.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> Không thể hiển thị bản nhạc gốc. File có thể bị lỗi: ${e.message}</p>`;
                    osmdDiv.classList.remove('valid-sheet');
                    convertBtn.disabled = true;
                    uploadLabel.textContent = "File XML bị lỗi, vui lòng chọn lại.";
                    uploadLabel.className = 'upload-label invalid-file';
                });
            } catch (error) {
                sheetContainer.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> ${error.message}</p>`;
                sheetContainer.classList.remove('valid-sheet');
                convertBtn.disabled = true;
                uploadLabel.textContent = "File XML bị lỗi, vui lòng chọn lại.";
                uploadLabel.className = 'upload-label invalid-file';
            }
        };
        reader.readAsText(file);
    } else {
        uploadLabel.textContent = "Không Đúng File .xml Mời Bạn Xem Lại";
        uploadLabel.className = 'upload-label invalid-file';
        convertBtn.disabled = true;
        fileContent = null;
    }
});

// Xử lý sự kiện khi nhấn nút "Thực Hiện"
convertBtn.addEventListener('click', () => {
    if (!fileContent) {
        alert("Vui lòng chọn một file MusicXML hợp lệ trước.");
        return;
    }

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "application/xml");
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
            throw new Error("File XML không hợp lệ hoặc bị lỗi.");
        }

        const measures = xmlDoc.getElementsByTagName('measure');
        if (measures.length === 0) {
            throw new Error("File MusicXML không chứa measure nào.");
        }

        // Xóa nội dung container, nhưng giữ lại sheet gốc
        const originalSheet = sheetContainer.querySelector('.sheet-segment');
        sheetContainer.innerHTML = '';
        if (originalSheet) {
            sheetContainer.appendChild(originalSheet);
        }

        // Chia thành các đoạn 4 phách và chỉ hiển thị ngũ cung
        const segmentSize = 4;
        let segmentIndex = 1;

        for (let i = 0; i < measures.length; i += segmentSize) {
            // Kiểm tra xem đoạn có measure hợp lệ không
            let hasValidMeasure = false;
            for (let j = i; j < i + segmentSize && j < measures.length; j++) {
                if (isValidMeasure(measures[j])) {
                    hasValidMeasure = true;
                    break;
                }
            }
            if (!hasValidMeasure) {
                console.warn(`Đoạn ${segmentIndex} không có measure hợp lệ, bỏ qua.`);
                segmentIndex++;
                continue;
            }

            // Tạo container cho đoạn
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'sheet-segment';

            // Hiển thị tiêu đề cho đoạn
            const title = document.createElement('div');
            title.className = 'segment-title';
            title.textContent = `Chuyển Ngũ Cung Đoạn ${segmentIndex}:`;
            segmentDiv.appendChild(title);

            // Tạo container cho OSMD
            const osmdDiv = document.createElement('div');
            segmentDiv.appendChild(osmdDiv);
            sheetContainer.appendChild(segmentDiv);

            // Hiển thị sheet ngũ cung
            const startMeasure = i;
            const endMeasure = Math.min(i + segmentSize - 1, measures.length - 1);
            const xmlContent = createPentatonicMusicXML(measures, startMeasure, endMeasure);

            const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdDiv, {
                autoResize: true,
                backend: "svg",
                drawTitle: false,
                drawPartNames: false,
                drawMeasureNumbers: true,
            });

            osmd.load(xmlContent).then(() => {
                osmd.render();
                segmentDiv.classList.add('valid-sheet');
                // Cuộn đến cuối sheet container sau khi render đoạn cuối
                if (i + segmentSize >= measures.length || i + segmentSize >= measures.length - (measures.length % segmentSize)) {
                    sheetContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }).catch((e) => {
                segmentDiv.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> Không thể hiển thị đoạn nhạc ngũ cung: ${e.message}</p>`;
                segmentDiv.classList.remove('valid-sheet');
            });

            segmentIndex++;
        }

        // Hiển thị lời cảm ơn
        thankYouMessage.style.display = 'block';
        // Nếu không có đoạn ngũ cung nào, cuộn đến cuối sheet container
        if (segmentIndex === 1) {
            sheetContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }

    } catch (error) {
        sheetContainer.innerHTML = `<p style="color: red;"><strong>Lỗi:</strong> ${error.message}</p>`;
        if (originalSheet) {
            sheetContainer.appendChild(originalSheet);
        }
        thankYouMessage.style.display = 'block';
        sheetContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
});

// Hàm để reset giao diện khi tải file mới
function resetDisplay() {
    sheetContainer.innerHTML = '';
    sheetContainer.classList.remove('valid-sheet');
    thankYouMessage.style.display = 'none';
    convertBtn.disabled = true;
    uploadLabel.textContent = "Nhấn Vào Đây Để Upload File Sheet Đuôi XML";
    uploadLabel.className = 'upload-label';
}