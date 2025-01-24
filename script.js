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
                searchText(text);
            });
        } else {
            // Handle text files
            searchText(content);
        }
    };

    reader.readAsBinaryString(file); // Read file as binary string
}

function searchText(text) {
    const results = document.getElementById('results');
    const lines = text.split('\n');
    let found = false;

    lines.forEach((line, index) => {
        if (line.includes("TOTAL CYCLE TIME")) {
            results.textContent += `Line ${index + 1}: ${line}\n`;
            found = true;
        }
    });

    if (!found) {
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
                            text += item.str + '\n';
                        });
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
