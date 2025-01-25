function searchFile() {
    const fileInput = document.getElementById('fileInput');
    const results = document.getElementById('results');
    results.textContent = ''; // Clear previous results

    if (fileInput.files.length === 0) {
        alert('Please select at least one file.');
        return;
    }

    const files = fileInput.files;
    const resultsArray = [];

    const processFile = (file, index) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function (event) {
                const content = event.target.result;

                if (file.type === 'application/pdf') {
                    // Handle PDF files
                    parsePDF(content).then(text => {
                        const cycleTime = extractCycleTime(text);
                        resultsArray[index] = { fileName: file.name, cycleTime };
                        resolve();
                    }).catch(reject);
                } else {
                    // Handle text files
                    const cycleTime = extractCycleTime(content);
                    resultsArray[index] = { fileName: file.name, cycleTime };
                    resolve();
                }
            };

            if (file.type === 'application/pdf') {
                reader.readAsArrayBuffer(file); // Read PDF as ArrayBuffer
            } else {
                reader.readAsText(file); // Read text files as text
            }
        });
    };

    const processAllFiles = async () => {
        for (let i = 0; i < files.length; i++) {
            await processFile(files[i], i);
        }

        // Display results
        results.textContent = resultsArray.map(result => 
            `File: ${result.fileName}\nCycle Time: ${result.cycleTime || 'No instances of "TOTAL CYCLE TIME" found.'}\n\n`
        ).join('');
    };

    processAllFiles().catch(error => {
        console.error('Error processing files:', error);
        results.textContent = 'An error occurred while processing the files.';
    });
}

function extractCycleTime(text) {
    const lines = text.split('\n'); // Split text into lines
    for (const line of lines) {
        if (line.includes("TOTAL CYCLE TIME")) {
            // Use regex to extract the time part (e.g., "0 HOURS, 4 MINUTES, 16 SECONDS")
            const regex = /(\d+ HOURS?, \d+ MINUTES?, \d+ SECONDS?)/i;
            const match = line.match(regex);
            return match ? match[0] : null; // Return the matched time or null
        }
    }
    return null; // Return null if no match is found
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
                        let pageText = '';
                        textContent.items.forEach(item => {
                            pageText += item.str + ' ';
                        });
                        text += pageText + '\n'; // Add newline after each page
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
