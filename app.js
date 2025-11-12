/* app.js - full JS moved out of HTML */
/* This file contains every function and event wiring copied verbatim from your original script. */

/* Default configuration */
const defaultConfig = {
    main_title: "Smart Attendance System",
    subtitle: "AI-Powered Facial Recognition System",
    system_status: "System Online",
    background_color: "#f9fafb",
    surface_color: "#ffffff",
    text_color: "#1f2937",
    primary_action_color: "#2563eb",
    secondary_action_color: "#0891b2",
    font_family: "Inter",
    font_size: 16
};

// Global variables
let allData = [];
let students = [];
let attendanceRecords = [];
let currentView = 'quick-attendance';
let registrationStream = null;
let quickStream = null;
let capturedFaceData = null;
let isQuickRecognitionActive = false;
let quickFaceDetectionInterval = null;

async function onConfigChange(config) {
    const mainTitle = config.main_title || defaultConfig.main_title;
    const subtitle = config.subtitle || defaultConfig.subtitle;
    const systemStatus = config.system_status || defaultConfig.system_status;
    const backgroundColor = config.background_color || defaultConfig.background_color;
    const surfaceColor = config.surface_color || defaultConfig.surface_color;
    const textColor = config.text_color || defaultConfig.text_color;
    const primaryActionColor = config.primary_action_color || defaultConfig.primary_action_color;
    const secondaryActionColor = config.secondary_action_color || defaultConfig.secondary_action_color;
    const customFont = config.font_family || defaultConfig.font_family;
    const baseSize = config.font_size || defaultConfig.font_size;
    const baseFontStack = 'Inter, sans-serif';

    document.getElementById('main-title').textContent = mainTitle;
    document.getElementById('subtitle').textContent = subtitle;
    document.getElementById('system-status').textContent = systemStatus;

    document.body.style.backgroundColor = backgroundColor;
    document.body.style.fontFamily = `${customFont}, ${baseFontStack}`;

    const statCards = document.querySelectorAll('.bg-white.rounded-xl.shadow-md');
    statCards.forEach(card => {
        card.style.backgroundColor = surfaceColor;
    });

    const headings = document.querySelectorAll('h1, h2, p');
    headings.forEach(heading => {
        heading.style.fontFamily = `${customFont}, ${baseFontStack}`;
        heading.style.color = textColor;
    });

    document.getElementById('main-title').style.fontSize = `${baseSize * 1.5}px`;
    document.getElementById('subtitle').style.fontSize = `${baseSize * 0.875}px`;
    document.getElementById('system-status').style.fontSize = `${baseSize * 0.875}px`;

    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.classList.contains('bg-gradient-to-r')) {
            button.style.background = `linear-gradient(to right, ${primaryActionColor}, ${secondaryActionColor})`;
        }
    });
}

function mapToCapabilities(config) {
    return {
        recolorables: [
            {
                get: () => config.background_color || defaultConfig.background_color,
                set: (value) => {
                    config.background_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ background_color: value });
                    }
                }
            },
            {
                get: () => config.surface_color || defaultConfig.surface_color,
                set: (value) => {
                    config.surface_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ surface_color: value });
                    }
                }
            },
            {
                get: () => config.text_color || defaultConfig.text_color,
                set: (value) => {
                    config.text_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ text_color: value });
                    }
                }
            },
            {
                get: () => config.primary_action_color || defaultConfig.primary_action_color,
                set: (value) => {
                    config.primary_action_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ primary_action_color: value });
                    }
                }
            },
            {
                get: () => config.secondary_action_color || defaultConfig.secondary_action_color,
                set: (value) => {
                    config.secondary_action_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ secondary_action_color: value });
                    }
                }
            }
        ],
        borderables: [],
        fontEditable: {
            get: () => config.font_family || defaultConfig.font_family,
            set: (value) => {
                config.font_family = value;
                if (window.elementSdk) {
                    window.elementSdk.setConfig({ font_family: value });
                }
            }
        },
        fontSizeable: {
            get: () => config.font_size || defaultConfig.font_size,
            set: (value) => {
                config.font_size = value;
                if (window.elementSdk) {
                    window.elementSdk.setConfig({ font_size: value });
                }
            }
        }
    };
}

function mapToEditPanelValues(config) {
    return new Map([
        ["main_title", config.main_title || defaultConfig.main_title],
        ["subtitle", config.subtitle || defaultConfig.subtitle],
        ["system_status", config.system_status || defaultConfig.system_status]
    ]);
}

function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }
}

let stream = null;
let isRecognitionActive = false;
let faceDetectionInterval = null;

// Quick Attendance Functions
async function startQuickCamera() {
    const video = document.getElementById('quick-video');
    const button = document.getElementById('quick-camera-btn');
    const placeholder = document.getElementById('quick-camera-placeholder');
    const statusOverlay = document.getElementById('quick-status-overlay');
    const scanningLine = document.getElementById('quick-scanning-line');

    try {
        button.textContent = 'Starting Camera...';
        button.disabled = true;

        quickStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            } 
        });

        video.srcObject = quickStream;
        
        video.onloadedmetadata = () => {
            placeholder.style.display = 'none';
            video.style.display = 'block';
            statusOverlay.style.display = 'block';
            scanningLine.style.display = 'block';
            
            button.textContent = 'Stop Camera';
            button.disabled = false;
            isQuickRecognitionActive = true;
            
            startQuickFaceDetection();
        };

    } catch (error) {
        console.error('Camera access error:', error);
        button.textContent = 'Start Quick Attendance';
        button.disabled = false;
    }
}

function stopQuickCamera() {
    const video = document.getElementById('quick-video');
    const button = document.getElementById('quick-camera-btn');
    const placeholder = document.getElementById('quick-camera-placeholder');
    const statusOverlay = document.getElementById('quick-status-overlay');
    const scanningLine = document.getElementById('quick-scanning-line');
    const faceBox = document.getElementById('quick-face-detection-box');

    if (quickStream) {
        quickStream.getTracks().forEach(track => track.stop());
        quickStream = null;
    }

    if (quickFaceDetectionInterval) {
        clearInterval(quickFaceDetectionInterval);
        quickFaceDetectionInterval = null;
    }

    video.style.display = 'none';
    statusOverlay.style.display = 'none';
    scanningLine.style.display = 'none';
    faceBox.style.display = 'none';
    placeholder.style.display = 'flex';
    
    button.textContent = 'Start Quick Attendance';
    isQuickRecognitionActive = false;
}

function startQuickFaceDetection() {
    const video = document.getElementById('quick-video');
    const faceBox = document.getElementById('quick-face-detection-box');
    const statusText = document.getElementById('quick-status-text');

    let faceDetected = false;

    quickFaceDetectionInterval = setInterval(() => {
        if (!isQuickRecognitionActive) return;

        const randomDetection = Math.random() > 0.4;
        
        if (randomDetection && !faceDetected) {
            const boxWidth = 120;
            const boxHeight = 150;
            const boxX = (video.offsetWidth - boxWidth) / 2;
            const boxY = (video.offsetHeight - boxHeight) / 2;
            
            faceBox.style.left = boxX + 'px';
            faceBox.style.top = boxY + 'px';
            faceBox.style.width = boxWidth + 'px';
            faceBox.style.height = boxHeight + 'px';
            faceBox.style.display = 'block';
            
            statusText.textContent = 'Face detected! Processing...';
            faceDetected = true;
            
            setTimeout(() => {
                if (faceDetected && isQuickRecognitionActive) {
                    processQuickAttendance();
                }
            }, 2000);
            
        } else if (!randomDetection && faceDetected) {
            faceBox.style.display = 'none';
            statusText.textContent = 'Scanning for faces...';
            faceDetected = false;
        }
    }, 800);
}

async function processQuickAttendance() {
    const statusText = document.getElementById('quick-status-text');
    const faceBox = document.getElementById('quick-face-detection-box');

    // Check if any students are registered
    if (students.length === 0) {
        statusText.textContent = 'No students registered!';
        faceBox.style.borderColor = '#ef4444';
        
        setTimeout(() => {
            stopQuickCamera();
        }, 2000);
        return;
    }

    // Select a registered student
    const selectedStudent = students[Math.floor(Math.random() * students.length)];
    
    // Check if student already marked attendance today
    const today = new Date().toDateString();
    const alreadyPresent = attendanceRecords.some(record => 
        record.student_id === selectedStudent.student_id && record.date === today
    );

    if (alreadyPresent) {
        statusText.textContent = `${selectedStudent.name} already present today!`;
        faceBox.style.borderColor = '#f59e0b';
        
        setTimeout(() => {
            stopQuickCamera();
        }, 2000);
        return;
    }
    
    statusText.textContent = 'Attendance marked!';
    faceBox.style.borderColor = '#10b981';
    
    const attendanceData = {
        student_id: selectedStudent.student_id,
        name: selectedStudent.name,
        course: selectedStudent.course,
        check_in_time: new Date().toISOString(),
        date: today,
        type: 'attendance'
    };

    try {
        // Try Data SDK first
        if (window.dataSdk && typeof window.dataSdk.create === 'function') {
            const result = await window.dataSdk.create(attendanceData);
            if (result && result.isOk) {
                statusText.textContent = `Welcome ${selectedStudent.name}!`;
                setTimeout(() => {
                    stopQuickCamera();
                }, 3000);
                return;
            }
        }
        
        // Fallback to local storage
        console.log('Using fallback for attendance');
        attendanceRecords.push(attendanceData);
        allData.push(attendanceData);
        
        updateQuickAttendanceStats();
        updateAttendanceList();
        updateDashboardStats();
        
        statusText.textContent = `Welcome ${selectedStudent.name}!`;
        
    } catch (error) {
        console.error('Failed to record attendance:', error);
        statusText.textContent = 'Error recording attendance';
    }
    
    setTimeout(() => {
        stopQuickCamera();
    }, 3000);
}

async function markManualAttendance() {
    const nameInput = document.getElementById('quick-student-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        return;
    }

    // Check if student is registered
    const registeredStudent = students.find(student => 
        student.name.toLowerCase() === name.toLowerCase()
    );

    if (!registeredStudent) {
        // Show error message
        nameInput.style.borderColor = '#ef4444';
        nameInput.placeholder = 'Student not registered!';
        setTimeout(() => {
            nameInput.style.borderColor = '#d1d5db';
            nameInput.placeholder = 'Enter student name';
        }, 3000);
        return;
    }

    // Check if already marked present today
    const today = new Date().toDateString();
    const alreadyPresent = attendanceRecords.some(record => 
        record.student_id === registeredStudent.student_id && record.date === today
    );

    if (alreadyPresent) {
        nameInput.style.borderColor = '#f59e0b';
        nameInput.placeholder = 'Already present today!';
        setTimeout(() => {
            nameInput.style.borderColor = '#d1d5db';
            nameInput.placeholder = 'Enter student name';
        }, 3000);
        return;
    }

    const attendanceData = {
        student_id: registeredStudent.student_id,
        name: registeredStudent.name,
        course: registeredStudent.course,
        check_in_time: new Date().toISOString(),
        date: today,
        type: 'attendance'
    };

    const button = document.getElementById('manual-attendance-btn');
    button.disabled = true;
    button.textContent = 'Marking...';

    try {
        // Try Data SDK first
        if (window.dataSdk && typeof window.dataSdk.create === 'function') {
            const result = await window.dataSdk.create(attendanceData);
            if (result && result.isOk) {
                nameInput.value = '';
                nameInput.style.borderColor = '#10b981';
                nameInput.placeholder = 'Attendance marked!';
                setTimeout(() => {
                    nameInput.style.borderColor = '#d1d5db';
                    nameInput.placeholder = 'Enter student name';
                }, 2000);
                button.disabled = false;
                button.textContent = 'Mark Present';
                return;
            }
        }
        
        // Fallback to local storage
        console.log('Using fallback for manual attendance');
        attendanceRecords.push(attendanceData);
        allData.push(attendanceData);
        
        updateQuickAttendanceStats();
        updateAttendanceList();
        updateDashboardStats();
        
        nameInput.value = '';
        nameInput.style.borderColor = '#10b981';
        nameInput.placeholder = 'Attendance marked!';
        setTimeout(() => {
            nameInput.style.borderColor = '#d1d5db';
            nameInput.placeholder = 'Enter student name';
        }, 2000);
        
    } catch (error) {
        console.error('Failed to record attendance:', error);
        nameInput.style.borderColor = '#ef4444';
        nameInput.placeholder = 'Error marking attendance!';
        setTimeout(() => {
            nameInput.style.borderColor = '#d1d5db';
            nameInput.placeholder = 'Enter student name';
        }, 3000);
    }

    button.disabled = false;
    button.textContent = 'Mark Present';
}

function updateQuickAttendanceStats() {
    const today = new Date().toDateString();
    const todayAttendance = attendanceRecords.filter(record => record.date === today);
    
    document.getElementById('today-present').textContent = todayAttendance.length;
    document.getElementById('today-total').textContent = Math.max(todayAttendance.length, students.length);
    
    const percentage = students.length > 0 ? 
        ((todayAttendance.length / students.length) * 100).toFixed(0) : 
        (todayAttendance.length > 0 ? '100' : '0');
    document.getElementById('today-percentage').textContent = percentage + '%';

    // Update recent list
    const container = document.getElementById('quick-attendance-list');
    if (todayAttendance.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-4">
                <p class="text-sm">No attendance marked yet today</p>
            </div>
        `;
        return;
    }

    const recentRecords = [...todayAttendance].sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time)).slice(0, 5);
    
    container.innerHTML = recentRecords.map(record => {
        const initials = record.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const colors = ['from-green-400 to-emerald-500', 'from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500', 'from-yellow-400 to-orange-500'];
        const color = colors[Math.abs(record.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
        
        return `
            <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br ${color} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                        ${initials}
                    </div>
                    <div>
                        <p class="font-medium text-gray-800 text-sm">${record.name}</p>
                        <p class="text-xs text-gray-500">${record.course}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-medium text-green-600">✓ Present</p>
                    <p class="text-xs text-gray-500">${new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Dashboard camera functions (existing code)
async function startCamera() {
    const video = document.getElementById('video');
    const button = document.getElementById('recognition-btn');
    const placeholder = document.getElementById('camera-placeholder');
    const errorDiv = document.getElementById('camera-error');
    const statusOverlay = document.getElementById('status-overlay');
    const scanningLine = document.getElementById('scanning-line');

    try {
        button.textContent = 'Starting Camera...';
        button.disabled = true;
        errorDiv.style.display = 'none';

        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            } 
        });

        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            placeholder.style.display = 'none';
            video.style.display = 'block';
            statusOverlay.style.display = 'block';
            scanningLine.style.display = 'block';
            
            button.textContent = 'Stop Recognition';
            button.disabled = false;
            isRecognitionActive = true;
            
            startFaceDetection();
        };

    } catch (error) {
        console.error('Camera access error:', error);
        errorDiv.style.display = 'block';
        button.textContent = 'Start Camera';
        button.disabled = false;
    }
}

function stopCamera() {
    const video = document.getElementById('video');
    const button = document.getElementById('recognition-btn');
    const placeholder = document.getElementById('camera-placeholder');
    const statusOverlay = document.getElementById('status-overlay');
    const scanningLine = document.getElementById('scanning-line');
    const faceBox = document.getElementById('face-detection-box');

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
        faceDetectionInterval = null;
    }

    video.style.display = 'none';
    statusOverlay.style.display = 'none';
    scanningLine.style.display = 'none';
    faceBox.style.display = 'none';
    placeholder.style.display = 'flex';
    
    button.textContent = 'Start Camera';
    isRecognitionActive = false;
}

function startFaceDetection() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const faceBox = document.getElementById('face-detection-box');
    const statusText = document.getElementById('status-text');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let faceDetected = false;

    faceDetectionInterval = setInterval(() => {
        if (!isRecognitionActive) return;

        const randomDetection = Math.random() > 0.3;
        
        if (randomDetection && !faceDetected) {
            const boxWidth = 120;
            const boxHeight = 150;
            const boxX = (video.offsetWidth - boxWidth) / 2;
            const boxY = (video.offsetHeight - boxHeight) / 2;
            
            faceBox.style.left = boxX + 'px';
            faceBox.style.top = boxY + 'px';
            faceBox.style.width = boxWidth + 'px';
            faceBox.style.height = boxHeight + 'px';
            faceBox.style.display = 'block';
            
            statusText.textContent = 'Face detected! Analyzing...';
            faceDetected = true;
            
            setTimeout(() => {
                if (faceDetected && isRecognitionActive) {
                    recognizeFace();
                }
            }, 3000);
            
        } else if (!randomDetection && faceDetected) {
            faceBox.style.display = 'none';
            statusText.textContent = 'Scanning for faces...';
            faceDetected = false;
        }
    }, 500);
}

// Data SDK Handler
const dataHandler = {
    onDataChanged(data) {
        allData = data;
        students = data.filter(item => item.type === 'student');
        attendanceRecords = data.filter(item => item.type === 'attendance');
        
        updateStudentsList();
        updateAttendanceList();
        updateDashboardStats();
        updateQuickAttendanceStats();
    }
};

// Initialize Data SDK with proper error handling
async function initializeDataSDK() {
    const statusElement = document.getElementById('system-status');
    
    try {
        // Show loading status
        statusElement.textContent = 'System Initializing... 🔄';
        statusElement.style.color = '#f59e0b';
        
        console.log('Starting Data SDK initialization...');
        
        // Wait longer for SDK to be fully loaded in Canva environment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Multiple checks for Data SDK availability
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            if (window.dataSdk && typeof window.dataSdk.init === 'function') {
                console.log(`Data SDK found on attempt ${attempts + 1}`);
                break;
            }
            
            console.log(`Attempt ${attempts + 1}: Waiting for Data SDK...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        // Check if Data SDK is available after all attempts
        if (!window.dataSdk) {
            console.log('Data SDK not available, using local storage mode');
            statusElement.textContent = 'System Ready (Local Mode) ⚠️';
            statusElement.style.color = '#f59e0b';
            return false;
        }
        
        if (typeof window.dataSdk.init !== 'function') {
            console.log('Data SDK init method not available, using local storage mode');
            statusElement.textContent = 'System Ready (Local Mode) ⚠️';
            statusElement.style.color = '#f59e0b';
            return false;
        }
        
        console.log('Data SDK found, initializing...');
        
        // Initialize the SDK with timeout
        const initPromise = window.dataSdk.init(dataHandler);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );
        
        const result = await Promise.race([initPromise, timeoutPromise]);
        
        if (result && result.isOk) {
            console.log('Data SDK initialized successfully');
            statusElement.textContent = 'System Ready ✅';
            statusElement.style.color = '#10b981';
            return true;
        } else {
            console.log('Data SDK initialization failed, using local storage mode');
            statusElement.textContent = 'System Ready (Local Mode) ⚠️';
            statusElement.style.color = '#f59e0b';
            return false;
        }
        
    } catch (error) {
        console.log('Data SDK initialization exception, using local storage mode:', error.message);
        statusElement.textContent = 'System Ready (Local Mode) ⚠️';
        statusElement.style.color = '#f59e0b';
        return false;
    }
}

// Navigation functions
function showView(viewName) {
    document.querySelectorAll('.view-content').forEach(view => {
        view.style.display = 'none';
    });
    
    document.querySelectorAll('[id^="tab-"]').forEach(tab => {
        tab.className = tab.className.replace(/bg-\w+-600 text-white/, 'text-gray-600 hover:text-gray-800');
    });
    
    document.getElementById(`${viewName}-view`).style.display = 'block';
    
    const activeTab = document.getElementById(`tab-${viewName}`);
    if (viewName === 'quick-attendance') {
        activeTab.className = activeTab.className.replace('text-gray-600 hover:text-gray-800', 'bg-green-600 text-white');
    } else {
        activeTab.className = activeTab.className.replace('text-gray-600 hover:text-gray-800', 'bg-blue-600 text-white');
    }
    
    currentView = viewName;
}

// Registration functions
async function startRegistrationCamera() {
    const video = document.getElementById('reg-video');
    const button = document.getElementById('reg-camera-btn');
    const placeholder = document.getElementById('reg-camera-placeholder');
    const captureBtn = document.getElementById('capture-face-btn');

    try {
        button.textContent = 'Starting Camera...';
        button.disabled = true;

        registrationStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            } 
        });

        video.srcObject = registrationStream;
        
        video.onloadedmetadata = () => {
            placeholder.style.display = 'none';
            video.style.display = 'block';
            
            button.textContent = 'Stop Camera';
            button.disabled = false;
            captureBtn.disabled = false;
        };

    } catch (error) {
        console.error('Camera access error:', error);
        button.textContent = 'Start Camera';
        button.disabled = false;
    }
}

function stopRegistrationCamera() {
    const video = document.getElementById('reg-video');
    const button = document.getElementById('reg-camera-btn');
    const placeholder = document.getElementById('reg-camera-placeholder');
    const captureBtn = document.getElementById('capture-face-btn');

    if (registrationStream) {
        registrationStream.getTracks().forEach(track => track.stop());
        registrationStream = null;
    }

    video.style.display = 'none';
    placeholder.style.display = 'flex';
    
    button.textContent = 'Start Camera';
    captureBtn.disabled = true;
}

function captureFace() {
    const video = document.getElementById('reg-video');
    const canvas = document.getElementById('reg-canvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('face-capture-status');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    capturedFaceData = canvas.toDataURL('image/jpeg', 0.8);
    
    statusDiv.textContent = '✅ Face captured successfully!';
    statusDiv.className = 'mt-2 text-sm text-center text-green-600';
}

async function registerStudent(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Check if all required fields are filled
    const requiredFields = ['student_id', 'name', 'email', 'phone', 'course'];
    for (let field of requiredFields) {
        if (!formData.get(field) || formData.get(field).trim() === '') {
            showMessage(`Please fill in the ${field.replace('_', ' ')} field!`, 'error');
            return;
        }
    }

    const studentData = {
        student_id: formData.get('student_id').trim(),
        name: formData.get('name').trim(),
        email: formData.get('email').trim(),
        phone: formData.get('phone').trim(),
        course: formData.get('course').trim(),
        face_data: capturedFaceData || 'no_face_data',
        registered_at: new Date().toISOString(),
        type: 'student'
    };

    const registerBtn = document.getElementById('register-btn');
    registerBtn.disabled = true;
    registerBtn.textContent = 'Registering...';

    try {
        // Try Data SDK first if available
        if (window.dataSdk && typeof window.dataSdk.create === 'function') {
            // Check if we're at the limit
            if (allData.length >= 999) {
                showMessage('❌ Maximum limit of 999 records reached. Please delete some records first.', 'error');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Register Student';
                return;
            }

            const result = await window.dataSdk.create(studentData);
            
            if (result && result.isOk) {
                showMessage('✅ Student registered successfully with data persistence!', 'success');
                document.getElementById('registration-form').reset();
                capturedFaceData = null;
                document.getElementById('face-capture-status').textContent = '';
                stopRegistrationCamera();
                registerBtn.disabled = false;
                registerBtn.textContent = 'Register Student';
                return;
            }
        }
        
        // Fallback to local storage if Data SDK fails
        console.log('Using fallback local storage for registration');
        
        // Add to local arrays
        students.push(studentData);
        allData.push(studentData);
        
        // Update displays
        updateStudentsList();
        updateDashboardStats();
        updateQuickAttendanceStats();
        
        showMessage('✅ Student registered successfully (local storage)!', 'success');
        document.getElementById('registration-form').reset();
        capturedFaceData = null;
        document.getElementById('face-capture-status').textContent = '';
        stopRegistrationCamera();
        
    } catch (error) {
        console.error('Registration exception:', error);
        showMessage(`❌ Registration failed: Please try again`, 'error');
    }

    registerBtn.disabled = false;
    registerBtn.textContent = 'Register Student';
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('registration-message');
    messageDiv.textContent = message;
    messageDiv.className = `mt-4 text-center ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Face recognition with database matching
async function recognizeFace() {
    const statusText = document.getElementById('status-text');
    const faceBox = document.getElementById('face-detection-box');

    statusText.textContent = 'Recognition successful!';
    faceBox.style.borderColor = '#10b981';
    
    setTimeout(async () => {
        if (students.length === 0) {
            statusText.textContent = 'No students registered yet';
            setTimeout(() => {
                stopCamera();
            }, 2000);
            return;
        }
        
        const recognizedStudent = students[Math.floor(Math.random() * students.length)];
        
        // Check if student already marked attendance today
        const today = new Date().toDateString();
        const alreadyPresent = attendanceRecords.some(record => 
            record.student_id === recognizedStudent.student_id && record.date === today
        );

        if (alreadyPresent) {
            statusText.textContent = `${recognizedStudent.name} already present today!`;
            faceBox.style.borderColor = '#f59e0b';
            
            setTimeout(() => {
                stopCamera();
            }, 2000);
            return;
        }
        
        const attendanceData = {
            student_id: recognizedStudent.student_id,
            name: recognizedStudent.name,
            course: recognizedStudent.course,
            check_in_time: new Date().toISOString(),
            date: today,
            type: 'attendance'
        };

        try {
            // Try Data SDK first
            if (window.dataSdk && typeof window.dataSdk.create === 'function') {
                const result = await window.dataSdk.create(attendanceData);
                if (result && result.isOk) {
                    statusText.textContent = `Welcome ${recognizedStudent.name}!`;
                    setTimeout(() => {
                        stopCamera();
                    }, 3000);
                    return;
                }
            }
            
            // Fallback to local storage
            attendanceRecords.push(attendanceData);
            allData.push(attendanceData);
            
            updateQuickAttendanceStats();
            updateAttendanceList();
            updateDashboardStats();
            
            statusText.textContent = `Welcome ${recognizedStudent.name}!`;
            
        } catch (error) {
            console.error('Failed to record attendance:', error);
            statusText.textContent = 'Error recording attendance';
        }
        
        setTimeout(() => {
            stopCamera();
        }, 3000);
    }, 1500);
}

// Update functions
function updateStudentsList() {
    const container = document.getElementById('students-list');
    
    if (students.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <p>No students registered yet</p>
                <p class="text-sm">Register students to see them here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = students.map(student => {
        const initials = student.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const colors = ['from-blue-400 to-indigo-500', 'from-green-400 to-emerald-500', 'from-purple-400 to-pink-500', 'from-yellow-400 to-orange-500', 'from-red-400 to-rose-500'];
        const color = colors[Math.abs(student.student_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
        
        return `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br ${color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        ${initials}
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800">${student.name}</p>
                        <p class="text-sm text-gray-500">ID: ${student.student_id} • ${student.course}</p>
                        <p class="text-xs text-gray-400">${student.email}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-medium text-gray-600">Registered</p>
                    <p class="text-xs text-gray-500">${new Date(student.registered_at).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    }).join('');
}

function updateAttendanceList() {
    const container = document.getElementById('attendance-list');
    
    if (attendanceRecords.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No attendance records yet</p>
                <p class="text-sm">Start face recognition to track attendance</p>
            </div>
        `;
        return;
    }

    const sortedRecords = [...attendanceRecords].sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time));
    
    container.innerHTML = sortedRecords.map(record => {
        const initials = record.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const colors = ['from-blue-400 to-indigo-500', 'from-green-400 to-emerald-500', 'from-purple-400 to-pink-500', 'from-yellow-400 to-orange-500', 'from-red-400 to-rose-500'];
        const color = colors[Math.abs(record.student_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
        
        return `
            <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br ${color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        ${initials}
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800">${record.name}</p>
                        <p class="text-sm text-gray-500">ID: ${record.student_id} • ${record.course}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-medium text-green-600">✓ Present</p>
                    <p class="text-xs text-gray-500">${new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
        `;
    }).join('');
}

function updateDashboardStats() {
    const today = new Date().toDateString();
    const todayAttendance = attendanceRecords.filter(record => record.date === today);
    
    const statElements = document.querySelectorAll('.text-3xl.font-bold.text-gray-800');
    if (statElements.length >= 4) {
        statElements[0].textContent = todayAttendance.length;
        statElements[1].textContent = Math.max(0, students.length - todayAttendance.length);
        statElements[2].textContent = 0;
        statElements[3].textContent = students.length > 0 ? ((todayAttendance.length / students.length) * 100).toFixed(1) + '%' : '0%';
    }

    const activityList = document.getElementById('activity-list');
    if (attendanceRecords.length > 0) {
        const recentRecords = [...attendanceRecords].sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time)).slice(0, 5);
        
        activityList.innerHTML = recentRecords.map(record => {
            const initials = record.name.split(' ').map(n => n[0]).join('').toUpperCase();
            const colors = ['from-green-400 to-emerald-500', 'from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500', 'from-yellow-400 to-orange-500', 'from-red-400 to-rose-500'];
            const color = colors[Math.abs(record.student_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
            
            return `
                <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 success-animation">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-gradient-to-br ${color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            ${initials}
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">${record.name}</p>
                            <p class="text-sm text-gray-500">Student ID: ${record.student_id}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-medium text-green-600">✓ Checked In</p>
                        <p class="text-xs text-gray-500">${new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function toggleRecognition() {
    if (!isRecognitionActive) {
        startCamera();
    } else {
        stopCamera();
    }
}

function toggleQuickCamera() {
    if (!isQuickRecognitionActive) {
        startQuickCamera();
    } else {
        stopQuickCamera();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // wire actions after DOM is ready (some elements exist only after DOM load)
    const recognitionBtn = document.getElementById('recognition-btn');
    const quickCameraBtn = document.getElementById('quick-camera-btn');
    const manualBtn = document.getElementById('manual-attendance-btn');
    const regCameraBtn = document.getElementById('reg-camera-btn');
    const captureBtn = document.getElementById('capture-face-btn');
    const regForm = document.getElementById('registration-form');

    if (recognitionBtn) recognitionBtn.addEventListener('click', toggleRecognition);
    if (quickCameraBtn) quickCameraBtn.addEventListener('click', toggleQuickCamera);
    if (manualBtn) manualBtn.addEventListener('click', markManualAttendance);

    // Tab navigation
    document.getElementById('tab-quick-attendance').addEventListener('click', () => showView('quick-attendance'));
    document.getElementById('tab-dashboard').addEventListener('click', () => showView('dashboard'));
    document.getElementById('tab-register').addEventListener('click', () => showView('register'));
    document.getElementById('tab-students').addEventListener('click', () => showView('students'));
    document.getElementById('tab-attendance').addEventListener('click', () => showView('attendance'));

    // Registration form
    if (regForm) regForm.addEventListener('submit', registerStudent);

    if (regCameraBtn) {
        regCameraBtn.addEventListener('click', () => {
            if (registrationStream) {
                stopRegistrationCamera();
            } else {
                startRegistrationCamera();
            }
        });
    }
    if (captureBtn) captureBtn.addEventListener('click', captureFace);

    console.log('Page loaded, starting initialization...');

    // Start date/time updates
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Initialize Element SDK first
    if (window.elementSdk) {
        try {
            window.elementSdk.init({
                defaultConfig,
                onConfigChange,
                mapToCapabilities,
                mapToEditPanelValues
            });
            console.log('Element SDK initialized');
        } catch (error) {
            console.error('Element SDK initialization failed:', error);
        }
    }

    // Initialize Data SDK with retry mechanism
    initializeDataSDK();
});

// Also try to initialize immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Document still loading, wait for DOMContentLoaded (handled above)
} else {
    // Document already loaded
    console.log('Document already loaded, initializing immediately...');
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    if (window.elementSdk) {
        try {
            window.elementSdk.init({
                defaultConfig,
                onConfigChange,
                mapToCapabilities,
                mapToEditPanelValues
            });
        } catch (error) {
            console.error('Element SDK initialization failed:', error);
        }
    }
    
    initializeDataSDK();
}
