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
                const cycleTimeLine = extractCycleTimeLine(text);
                displayResults(cycleTimeLine);
            });
        } else {
            // Handle text files
            const cycleTimeLine = extractCycleTimeLine(content);
            displayResults(cycleTimeLine);
        }
    };

    if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file); // Read PDF as ArrayBuffer
    } else {
        reader.readAsText(file); // Read text files as text
    }
}

function extractCycleTimeLine(text) {
    const lines = text.split('\n'); // Split text into lines
    for (const line of lines) {
        if (line.includes("TOTAL CYCLE TIME")) {
            return line.trim(); // Return the full line where the phrase appears
        }
    }
    return null; // Return null if no match is found
}

function displayResults(cycleTimeLine) {
    const results = document.getElementById('results');
    if (cycleTimeLine) {
        results.textContent = `Full Line: ${cycleTimeLine}`;
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
