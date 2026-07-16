// Google Apps Script Web App URL
// User will replace this with their actual deployment URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXRWUzPeKpEO6sDfTNS9ngLO39FVMJ5Fv2Ks55C0qADaYJu-Qz5xTgiP_j7T9IZio1OA/exec';

let currentStep = 1;
let isSigned = false;

// DOM Elements
const form = document.getElementById('commitment-form');
const canvas = document.getElementById('signature-canvas');
const ctx = canvas.getContext('2d');
const clearSigBtn = document.getElementById('btn-clear-signature');
const dateInput = document.getElementById('commitment_date');
const signatureInput = document.getElementById('signature_image');
const pdfBase64Input = document.getElementById('pdf_base64');
const submitStatus = document.getElementById('submit-status');
const submitBtn = document.getElementById('btn-submit-form');
const downloadPdfBtn = document.getElementById('btn-download-pdf');

// Receipt Elements
const successModal = document.getElementById('success-modal');
const receiptBusinessName = document.getElementById('receipt-business-name');
const receiptRepresentative = document.getElementById('receipt-representative');
const receiptDate = document.getElementById('receipt-date');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yyyy = today.getFullYear();
    dateInput.value = `${dd}/${mm}/${yyyy}`;

    // Initialize Checkbox Card Listeners
    initCheckboxCards();

    // Initialize Signature Pad
    initSignaturePad();

    // Setup Local PDF Download Button Click Listener
    downloadPdfBtn.addEventListener('click', downloadLocalPDF);

    // Listen to input changes to remove validation error styles
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const group = input.closest('.input-group');
            if (group && group.classList.contains('invalid')) {
                group.classList.remove('invalid');
            }
        });
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', () => {
                const group = input.closest('.input-group');
                if (group) group.classList.remove('invalid');
            });
        }
    });
});

// Setup checkbox cards highlight toggle
function initCheckboxCards() {
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        // Initial state check
        if (cb.checked) {
            cb.closest('.checkbox-card').classList.add('checked');
        }

        cb.addEventListener('change', () => {
            const card = cb.closest('.checkbox-card');
            if (cb.checked) {
                card.classList.add('checked');
            } else {
                card.classList.remove('checked');
            }

            // Clear errors when checked
            if (cb.id.startsWith('k')) {
                document.getElementById('k-error').style.display = 'none';
            } else if (cb.id.startsWith('a')) {
                document.getElementById('a-error').style.display = 'none';
            } else if (cb.id === 'agree_terms') {
                document.getElementById('agree-error').style.display = 'none';
            }
        });
    });
}

// Stepper Navigation logic
function showStep(stepNum) {
    // Remove active state from all steps and step indicators
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    document.querySelectorAll('.step').forEach(indicator => {
        indicator.classList.remove('active');
    });
    
    // Add active state to correct step and indicators
    document.getElementById(`step-${stepNum}`).classList.add('active');
    
    // Stepper indicators up to current step
    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`step-indicator-${i}`);
        if (i < stepNum) {
            ind.classList.add('completed');
            ind.classList.remove('active');
        } else if (i === stepNum) {
            ind.classList.add('active');
            ind.classList.remove('completed');
        } else {
            ind.classList.remove('active', 'completed');
        }
    }

    currentStep = stepNum;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Resize canvas if step 3 is loaded to match container size
    if (stepNum === 3) {
        resizeCanvas();
    }
}

function nextStep(currentStepNum) {
    if (validateStep(currentStepNum)) {
        showStep(currentStepNum + 1);
    }
}

function prevStep(currentStepNum) {
    showStep(currentStepNum - 1);
}

// Field validation per step
function validateStep(stepNum) {
    let isValid = true;

    if (stepNum === 1) {
        const fields = ['business_name', 'business_type', 'representative', 'phone', 'address'];
        fields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            const group = input.closest('.input-group');
            
            if (!input.checkValidity()) {
                group.classList.add('invalid');
                isValid = false;
            } else {
                group.classList.remove('invalid');
            }
        });
    } 
    else if (stepNum === 2) {
        // Validate 3K
        const kCheckboxes = ['k1', 'k2', 'k3'];
        const allKChecked = kCheckboxes.every(id => document.getElementById(id).checked);
        if (!allKChecked) {
            document.getElementById('k-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('k-error').style.display = 'none';
        }

        // Validate 3A
        const aCheckboxes = ['a1', 'a2', 'a3'];
        const allAChecked = aCheckboxes.every(id => document.getElementById(id).checked);
        if (!allAChecked) {
            document.getElementById('a-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('a-error').style.display = 'none';
        }
    }

    return isValid;
}

// Accordion Toggle
function toggleAccordion() {
    const item = document.querySelector('.accordion-item');
    const content = document.getElementById('accordion-content');
    
    if (item.classList.contains('open')) {
        item.classList.remove('open');
        content.style.maxHeight = '0px';
    } else {
        item.classList.add('open');
        content.style.maxHeight = content.scrollHeight + 'px';
    }
}

// Signature Canvas Drawing Logic
let drawing = false;

function initSignaturePad() {
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch events for mobile screens
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
        e.preventDefault();
    }, { passive: false });

    clearSigBtn.addEventListener('click', clearSignature);
}

function resizeCanvas() {
    // Get container size
    const rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Clear and reset line options
    clearSignature();
}

function startDrawing(e) {
    drawing = true;
    isSigned = true;
    document.getElementById('sig-error').style.display = 'none';
    
    const pos = getMousePos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2c3e50'; // Slate color for ink
}

function draw(e) {
    if (!drawing) return;
    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

function stopDrawing() {
    drawing = false;
}

function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isSigned = false;
    signatureInput.value = '';
}

function getMousePos(canvasDom, mouseEvent) {
    const rect = canvasDom.getBoundingClientRect();
    return {
        x: ((mouseEvent.clientX - rect.left) / rect.width) * canvasDom.width,
        y: ((mouseEvent.clientY - rect.top) / rect.height) * canvasDom.height
    };
}

// Populate the off-screen A4 print document with input values
function populatePDFTemplate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    
    // Date markers
    document.getElementById('pdf-day').textContent = dd;
    document.getElementById('pdf-month').textContent = mm;
    
    // Form fields
    document.getElementById('pdf-business-name').textContent = document.getElementById('business_name').value;
    document.getElementById('pdf-business-type').textContent = document.getElementById('business_type').value;
    document.getElementById('pdf-address').textContent = document.getElementById('address').value;
    document.getElementById('pdf-representative').textContent = document.getElementById('representative').value;
    document.getElementById('pdf-phone').textContent = document.getElementById('phone').value;
    
    // Signature fields
    document.getElementById('pdf-signee-name').textContent = document.getElementById('signee_name').value;
    document.getElementById('pdf-signature-img').src = canvas.toDataURL('image/png');
}

// Download PDF directly from browser cache
function downloadLocalPDF() {
    const element = document.getElementById('pdf-document');
    const bizName = document.getElementById('business_name').value || 'CoSoKinhDoanh';
    const cleanBizName = bizName.replace(/[^a-z0-9]/gi, '_');
    const filename = `CamKetDuLich_${cleanBizName}.pdf`;
    
    const opt = {
      margin:       0,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2.5, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
      jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(element).set(opt).save();
}

// Form Submission Event
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Step 3 Validation
    let isValid = true;

    // Check Signature
    if (!isSigned) {
        document.getElementById('sig-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('sig-error').style.display = 'none';
        signatureInput.value = canvas.toDataURL('image/png');
    }

    // Check Signee Name
    const signeeName = document.getElementById('signee_name');
    const signeeGroup = signeeName.closest('.input-group');
    if (!signeeName.value.trim()) {
        signeeGroup.classList.add('invalid');
        isValid = false;
    } else {
        signeeGroup.classList.remove('invalid');
    }

    // Check General Agreement Checkbox
    const agreeTerms = document.getElementById('agree_terms');
    if (!agreeTerms.checked) {
        document.getElementById('agree-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('agree-error').style.display = 'none';
    }

    if (!isValid) return;

    // Trigger PDF generation before form post
    processPDFAndSubmit();
});

function processPDFAndSubmit() {
    // Show spinner & disable button
    submitStatus.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang thiết lập PDF...';

    // 1. Populate the hidden PDF layout
    populatePDFTemplate();

    // 2. Generate PDF Base64 string using html2pdf
    const element = document.getElementById('pdf-document');
    const opt = {
      margin:       0,
      image:        { type: 'jpeg', quality: 0.95 },
      html2canvas:  { scale: 2.0, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
      jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).outputPdf('datauristring')
    .then((pdfDataUri) => {
        // Strip data header to extract raw base64 string
        const base64Pdf = pdfDataUri.split(',')[1];
        pdfBase64Input.value = base64Pdf;
        
        // 3. Submit Form Data (including PDF base64 string)
        submitForm();
    })
    .catch((error) => {
        console.error('Error generating PDF:', error);
        alert('Không thể tạo biên bản PDF. Hệ thống vẫn tiếp tục gửi dữ liệu văn bản...');
        pdfBase64Input.value = '';
        submitForm();
    });
}

function submitForm() {
    submitStatus.querySelector('#submit-status-text').textContent = 'Đang gửi dữ liệu cam kết về hệ thống...';
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

    // Build Form Data Object
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    // If Google Sheet SCRIPT_URL hasn't been set yet, simulate success for demonstration
    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        setTimeout(() => {
            console.log('Simulating form data submission:', data);
            showSuccess(data);
        }, 1500);
        return;
    }

    // Actual submission to Apps Script
    // Convert to URL-encoded form data (safest way to bypass CORS in Apps Script)
    const searchParams = new URLSearchParams();
    for (const key in data) {
        searchParams.append(key, data[key]);
    }

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script web app redirect can trigger CORS errors. no-cors bypasses this.
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: searchParams
    })
    .then(() => {
        showSuccess(data);
    })
    .catch((error) => {
        console.error('Error submitting form:', error);
        alert('Có lỗi xảy ra khi gửi dữ liệu cam kết. Vui lòng kiểm tra lại đường truyền mạng hoặc liên hệ quản trị viên.');
        
        // Restore buttons
        submitStatus.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi Bản Cam Kết';
    });
}

function showSuccess(data) {
    // Hide status spinner
    submitStatus.style.display = 'none';
    
    // Set values in receipt modal
    receiptBusinessName.textContent = data.BusinessName;
    receiptRepresentative.textContent = data.Representative;
    receiptDate.textContent = data.Date;

    // Show Success Modal
    successModal.classList.add('active');
}

function closeSuccessModal() {
    successModal.classList.remove('active');
    
    // Reset form
    form.reset();
    clearSignature();
    
    // Go back to first step
    showStep(1);
    
    // Reset buttons
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi Bản Cam Kết';
}

// Tab Switching between Register and Search
function switchMainTab(tab) {
    const regTabBtn = document.getElementById('tab-register-btn');
    const searchTabBtn = document.getElementById('tab-search-btn');
    const regContainer = document.getElementById('register-container');
    const searchContainer = document.getElementById('search-container');
    
    if (tab === 'register') {
        regTabBtn.classList.add('active');
        searchTabBtn.classList.remove('active');
        regContainer.style.display = 'block';
        searchContainer.style.display = 'none';
    } else {
        regTabBtn.classList.remove('active');
        searchTabBtn.classList.add('active');
        regContainer.style.display = 'none';
        searchContainer.style.display = 'block';
        
        // Clear previous searches
        document.getElementById('search-results-box').innerHTML = '';
        document.getElementById('search_phone').value = '';
    }
}

// Search commitment from Google Sheet via Phone number
// Search commitment from Google Sheet via Phone number
function searchCommitment() {
    const phoneInput = document.getElementById('search_phone');
    const phoneVal = phoneInput.value.trim();
    const resultsBox = document.getElementById('search-results-box');
    const statusBox = document.getElementById('search-status');
    const searchBtn = document.getElementById('btn-search-commit');
    
    if (!phoneVal || !/^[0-9]{9,11}$/.test(phoneVal)) {
        alert('Vui lòng nhập số điện thoại tra cứu hợp lệ (9 - 11 chữ số).');
        phoneInput.focus();
        return;
    }
    
    // Show spinner & disable search button
    statusBox.style.display = 'flex';
    resultsBox.innerHTML = '';
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tìm...';
    
    // Demo mode if SCRIPT_URL isn't set yet
    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        setTimeout(() => {
            statusBox.style.display = 'none';
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tra cứu';
            
            // Render a mock search result card
            resultsBox.innerHTML = `
                <div class="result-item">
                    <div class="result-header">
                        <div class="result-title">
                            <h3>Cơ Sở Kinh Doanh Demo (Chưa kết nối Sheet)</h3>
                            <span>Ăn uống</span>
                        </div>
                        <div class="result-date">
                            <i class="fa-solid fa-clock"></i> 10:40 16/07/2026
                        </div>
                    </div>
                    <div class="result-body">
                        <div class="result-row">
                            <label>Người đại diện</label>
                            <span>Nguyễn Văn A</span>
                        </div>
                        <div class="result-row">
                            <label>Người ký cam kết</label>
                            <span>Nguyễn Văn A</span>
                        </div>
                        <div class="result-row" style="grid-column: span 2;">
                            <label>Địa chỉ</label>
                            <span>123 Đường Lê Lợi, Phường Pleiku, Gia Lai</span>
                        </div>
                    </div>
                    <div class="result-footer">
                        <a href="#" class="btn-result-download" onclick="alert('Khi Google Sheet và Apps Script được cấu hình hoàn chỉnh, nút này sẽ tải trực tiếp file PDF chính thức từ Google Drive của bạn.'); return false;"><i class="fa-solid fa-file-pdf"></i> Tải Bản Cam Kết (PDF)</a>
                    </div>
                </div>
            `;
        }, 1200);
        return;
    }
    
    // Fetch from Apps Script Web App
    const url = `${SCRIPT_URL}?action=search&phone=${encodeURIComponent(phoneVal)}`;
    
    fetch(url)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        return response.text(); // Get raw text first
    })
    .then(text => {
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Google Apps Script returned raw response (Non-JSON):', text);
            throw new Error('Google Apps Script phản hồi lỗi hệ thống hoặc không đúng định dạng. Vui lòng kiểm tra Console (F12) để xem chi tiết.');
        }
    })
    .then(res => {
        statusBox.style.display = 'none';
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tra cứu';
        
        if (res.status === 'success') {
            let html = '';
            res.data.forEach(item => {
                const hasPdf = item.pdfUrl && typeof item.pdfUrl === 'string' && item.pdfUrl.startsWith('http');
                const downloadBtnHtml = hasPdf 
                    ? `<a href="${item.pdfUrl}" target="_blank" class="btn-result-download"><i class="fa-solid fa-file-pdf"></i> Tải Bản Cam Kết (PDF)</a>`
                    : `<span style="font-size: 0.85rem; color: #e74c3c; font-weight: bold; font-style: italic;"><i class="fa-solid fa-triangle-exclamation"></i> Chưa có file PDF trên Drive</span>`;
                
                html += `
                    <div class="result-item">
                        <div class="result-header">
                            <div class="result-title">
                                <h3>${escapeHtml(item.businessName)}</h3>
                                <span>${escapeHtml(item.businessType)}</span>
                            </div>
                            <div class="result-date">
                                <i class="fa-solid fa-clock"></i> ${escapeHtml(item.date)}
                            </div>
                        </div>
                        <div class="result-body">
                            <div class="result-row">
                                <label>Người đại diện</label>
                                <span>${escapeHtml(item.representative)}</span>
                            </div>
                            <div class="result-row">
                                <label>Người ký cam kết</label>
                                <span>${escapeHtml(item.signeeName)}</span>
                            </div>
                            <div class="result-row" style="grid-column: span 2;">
                                <label>Địa chỉ</label>
                                <span>${escapeHtml(item.address)}</span>
                            </div>
                        </div>
                        <div class="result-footer">
                            ${downloadBtnHtml}
                        </div>
                    </div>
                `;
            });
            resultsBox.innerHTML = html;
        } else {
            // Not found
            resultsBox.innerHTML = `
                <div class="no-result-box">
                    <div class="no-result-icon">
                        <i class="fa-solid fa-circle-xmark"></i>
                    </div>
                    <h3>Không tìm thấy dữ liệu</h3>
                    <p>Không tìm thấy bản cam kết nào đăng ký với số điện thoại <strong>${escapeHtml(phoneVal)}</strong>. Vui lòng kiểm tra lại số điện thoại hoặc chọn tab "Đăng ký cam kết mới" để lập cam kết.</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error searching:', error);
        statusBox.style.display = 'none';
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tra cứu';
        alert('Đã xảy ra lỗi khi tra cứu dữ liệu: ' + error.message);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
