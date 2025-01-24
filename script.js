function searchFile() {
    const fileInput = document.getElementById('fileInput');
    const results = document.getElementById('results');
    results.textContent = ''; // Clear previous results

    if (fileInput.files.length === 0) {
        alert('Please select a file.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        const content = event.target.result;

        if (file.type === 'application/pdf') {
            // Handle PDF files
            parsePDF(content).then(text => {
                const cycleTime = extractCycleTime(text);
                displayResults(cycleTime);
            });
        } else {
            // Handle text files
            const cycleTime = extractCycleTime(content);
            displayResults(cycleTime);
        }
    };

    if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file); // Read PDF as ArrayBuffer
    } else {
        reader.readAsText(file); // Read text files as text
    }
}

function extractCycleTime(text) {
    const regex = /TOTAL CYCLE TIME[:]?\s*([\d:.]+)/i; // Matches "TOTAL CYCLE TIME" and extracts the time
    const match = text.match(regex);
    return match ? match[1] : null;
}

function displayResults(cycleTime) {
    const results = document.getElementById('results');
    if (cycleTime) {
        results.textContent = `TOTAL CYCLE TIME: ${cycleTime}`;
    } else {
        results.textContent = 'No instances of "TOTAL CYCLE TIME" found.';
    }
}

function parsePDF(data) {
    return new Promise((resolve, reject) => {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument({ data });
        loadingTask.promise.then(pdf => {
            let text = '';
            const numPages = pdf.numPages;

            const fetchPage = (pageNum) => {
                return pdf.getPage(pageNum).then(page => {
                    return page.getTextContent().then(textContent => {
                        textContent.items.forEach(item => {
                            text += item.str + ' ';
                        });
                        text += '\n'; // Add newline after each page
                    });
                });
            };

            const fetchAllPages = async () => {
                for (let i = 1; i <= numPages; i++) {
                    await fetchPage(i);
                }
                resolve(text);
            };

            fetchAllPages();
        }).catch(reject);
    });
}
