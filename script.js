<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
<script>
function searchFile() {
    const fileInput = document.getElementById('fileInput');
    const excelInput = document.getElementById('excelInput'); // Input for the Excel file
    const results = document.getElementById('results');
    results.textContent = ''; // Clear previous results

    if (fileInput.files.length === 0) {
        alert('Please select at least one file.');
        return;
    }

    if (!excelInput.files.length) {
        alert('Please select an Excel file.');
        return;
    }

    const files = fileInput.files;
    const resultsArray = [];
    let excelData = [];

    // Parse the Excel file
    const parseExcel = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0]; // Assuming the first sheet
                const sheet = workbook.Sheets[sheetName];
                excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                resolve(workbook);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

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
        // Wait for Excel parsing to complete
        const workbook = await parseExcel(excelInput.files[0]);

        // Process each file
        for (let i = 0; i < files.length; i++) {
            await processFile(files[i], i);
        }

        // Update Excel with cycle time based on filenames
        resultsArray.forEach(result => {
            // Search for the row in the Excel data that matches the file name
            const rowIndex = excelData.findIndex(row => row[0] && row[0].toString() === result.fileName); // Assuming the file name is in the first column
            if (rowIndex !== -1) {
                // Update the cycle time in the second column (you can modify the column index if needed)
                excelData[rowIndex][1] = result.cycleTime || 'No instances of "TOTAL CYCLE TIME" found.';
            }
        });

        // Update the sheet with modified data
        const updatedSheet = XLSX.utils.aoa_to_sheet(excelData);
        workbook.Sheets[workbook.SheetNames[0]] = updatedSheet;

        // Export the updated workbook
        const updatedExcelFile = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        // Trigger the download of the updated Excel file
        const blob = new Blob([updatedExcelFile], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'updated_file.xlsx';
        link.click();
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
</script>
