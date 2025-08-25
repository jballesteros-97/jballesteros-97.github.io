let questions = [];
let testsHistory = [];
let currentTest = null;
let savedTests = []; // Changed from savedTestInProgress and now an array

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    loadData(); // Loads data from localStorage
    initEventListeners(); // Set up all general event listeners
    navigateTo('tests-page'); // Navigate to the initial page
    updateUI(); // Update UI based on loaded data
    updateTestsPageUI(); // Update specific UI for tests-page, including resume option
});

// Cargar datos guardados
function loadData() {
    showLoading("Cargando datos..."); 
    
    // Cargar preguntas
    const savedQuestions = localStorage.getItem('questions');
    if (savedQuestions) {
        questions = JSON.parse(savedQuestions);
    } else {
        questions = []; // Ensure questions is an array if nothing is in storage
    }
    
    // Cargar historial de tests
    const savedTestsHistory = localStorage.getItem('testsHistory'); // Renamed to avoid confusion with new savedTests
    if (savedTestsHistory) {
        testsHistory = JSON.parse(savedTestsHistory);
    } else {
        testsHistory = []; // Ensure testsHistory is an array
    }

    // Cargar tests guardados (plural)
    const storedSavedTests = localStorage.getItem('savedTests'); // New key for the array
    if (storedSavedTests) {
        savedTests = JSON.parse(storedSavedTests);
    } else {
        savedTests = [];
    }
    
    // Cargar preferencia de modo oscuro
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }
    
    hideLoading();
}

// Inicializar event listeners
function initEventListeners() {
    // Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(this.getAttribute('data-page'));
        });
    });

    // Modo oscuro
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        document.body.classList.toggle('dark-mode', this.checked);
        localStorage.setItem('darkMode', this.checked);
    });

    // Subida de archivo Excel
    // Ensure the element exists before adding event listener
    const excelUploadInput = document.getElementById('excel-upload');
    if (excelUploadInput) {
        excelUploadInput.addEventListener('change', handleFileUpload);
    } else {
        console.warn('Element with ID "excel-upload" not found. Skipping event listener attachment.');
    }
    
    const loadSampleButton = document.getElementById('load-sample');
    if (loadSampleButton) {
        loadSampleButton.addEventListener('click', loadSampleData);
    } else {
        console.warn('Element with ID "load-sample" not found. Skipping event listener attachment.');
    }

    // Test aleatorio
    document.getElementById('random-test-btn').addEventListener('click', function() {
        document.getElementById('random-test-options').classList.remove('hidden');
    });
    
    document.getElementById('cancel-random-options').addEventListener('click', function() {
        document.getElementById('random-test-options').classList.add('hidden');
    });
    
    document.getElementById('start-random-test').addEventListener('click', startRandomTest);

    // Test por tema
    document.getElementById('by-theme-btn').addEventListener('click', function() {
        document.getElementById('theme-selection').classList.remove('hidden');
        populateThemeList();
    });
    
    document.getElementById('cancel-theme-selection').addEventListener('click', function() {
        document.getElementById('theme-selection').classList.add('hidden');
    });
    
    // Theme selection click handler for the 'Por Tema' section
    document.getElementById('theme-list').addEventListener('click', function(event) {
        const target = event.target.closest('.theme-item');
        if (target) {
            // This logic is for single-selection, which is no longer used for theme tests.
            // It can be kept for other potential uses or removed if it causes conflicts.
            // For now, let's keep it but it won't affect the checkbox functionality.
            document.querySelectorAll('#theme-list .theme-item').forEach(item => item.classList.remove('selected'));
            target.classList.add('selected');
        }
    });
    
    document.getElementById('start-theme-test').addEventListener('click', startThemeTest);

    // Navegación del test
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    document.getElementById('prev-question').addEventListener('click', prevQuestion);
    
    // Finalizar test
    document.getElementById('finish-test').addEventListener('click', () => {
        // Al terminar de ver los resultados, volver a la página de inicio de tests
        navigateTo('tests-page'); 
    });

    // Retest options from results page
    document.getElementById('retest-all-questions').addEventListener('click', retestAllQuestions);
    document.getElementById('retest-incorrect-questions').addEventListener('click', retestIncorrectQuestions);
    
    // Slider de número de preguntas
    document.getElementById('questions-count-slider').addEventListener('input', function() {
        document.getElementById('questions-count-value').textContent = this.value;
    });

    // Search questions
    document.getElementById('search-questions-input').addEventListener('input', function(e) {
        populateQuestionsList(e.target.value);
    });

    // Setup listeners for the question edit modal
    setupEditModalListeners(); // NEW: Call the function to set up modal listeners

    // New: Test control buttons (pause/cancel existing test)
    document.getElementById('pause-test-btn').addEventListener('click', pauseTest);
    document.getElementById('cancel-test-btn').addEventListener('click', cancelTest);

    // New: Delegated listeners for dynamically generated saved test items
    document.getElementById('test-in-progress-card').addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('resume-saved-test-btn')) {
            const testId = target.dataset.testId;
            resumeTest(testId);
        } else if (target.classList.contains('delete-saved-test-btn')) {
            const testId = target.dataset.testId;
            deleteSavedTest(testId);
        }
    });
}

// New: Pause test function
function pauseTest() {
    if (!currentTest) {
        alert("No hay ningún test en curso para guardar.");
        navigateTo('tests-page');
        return;
    }
    
    const newSavedTest = {
        id: Date.now().toString(), // Unique ID for the saved test
        savedAt: new Date().toISOString(), // Timestamp for oldest tracking
        test: currentTest
    };

    let message = "";
    if (savedTests.length < 3) {
        savedTests.push(newSavedTest);
        message = "Test guardado. Puedes continuarlo más tarde.";
    } else {
        // If 3 tests are already saved, replace the oldest one
        savedTests.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()); // Sort by oldest first
        const oldestTestTheme = savedTests[0].test.theme;
        savedTests[0] = newSavedTest; // Replace the oldest
        message = `Has guardado 3 tests. Este test ha reemplazado al test de ${oldestTestTheme}. Puedes continuarlo más tarde.`;
    }

    localStorage.setItem('savedTests', JSON.stringify(savedTests)); // Use new key
    currentTest = null; // Clear the active test
    navigateTo('tests-page');
    updateTestsPageUI(); // Update UI to show saved tests
    alert(message);
}

// New: Cancel test function
function cancelTest() {
    if (confirm("¿Estás seguro de que quieres cancelar el test? Se perderá todo el progreso.")) {
        currentTest = null;
        // localStorage.removeItem('savedTestInProgress'); // Removed, now handled by savedTests array
        // savedTestInProgress = null; // Removed, now handled by savedTests array
        navigateTo('tests-page');
        updateTestsPageUI(); // Update UI to hide resume option
        //alert("Test cancelado. No se ha guardado el progreso.");
    }
}

// New: Resume test function
function resumeTest(testId) {
    const indexToResume = savedTests.findIndex(st => st.id === testId);
    if (indexToResume !== -1) {
        const testToResume = savedTests[indexToResume];
        currentTest = testToResume.test; // Load the actual test data
        
        // Remove the test from the savedTests array after resuming
        savedTests.splice(indexToResume, 1);
        localStorage.setItem('savedTests', JSON.stringify(savedTests));
        
        navigateTo('test-page');
        showQuestion(currentTest.currentIndex);
        updateTestsPageUI(); // Update UI to reflect removal of this saved test
        //alert("Test reanudado.");
    } else {
        alert("No se encontró el test guardado para continuar.");
        updateTestsPageUI(); // Ensure UI is updated if an error occurs or test is somehow missing
    }
}

// New: Delete saved test function
function deleteSavedTest(testId) {
    if (confirm("¿Estás seguro de que quieres eliminar este test guardado? Se perderá todo el progreso guardado.")) {
        const initialLength = savedTests.length;
        savedTests = savedTests.filter(st => st.id !== testId);
        
        if (savedTests.length < initialLength) {
            localStorage.setItem('savedTests', JSON.stringify(savedTests));
            updateTestsPageUI(); // Hide the resume card
            alert("Test guardado eliminado.");
        } else {
            alert("Error: No se encontró el test guardado para eliminar.");
        }
    }
}

// Retest the entire test again
function retestAllQuestions() {
    if (testsHistory.length === 0) {
        alert("No hay un test anterior para rehacer.");
        navigateTo('tests-page');
        return;
    }

    const lastTest = testsHistory[testsHistory.length - 1]; // Get the last completed test
    if (!lastTest || !lastTest.questions || lastTest.questions.length === 0) {
        alert("No se pudo cargar las preguntas del test anterior para rehacer. (Es posible que el test se haya guardado con una versión anterior de la aplicación).");
        navigateTo('tests-page');
        return;
    }

    // Shuffle the questions again to make it a fresh test experience
    const shuffledQuestions = [...lastTest.questions].sort(() => 0.5 - Math.random());
    startTest(shuffledQuestions, lastTest.theme);
}

// Retest only the bad answered questions
function retestIncorrectQuestions() {
    if (testsHistory.length === 0) {
        alert("No hay un test anterior para repasar preguntas falladas.");
        navigateTo('tests-page');
        return;
    }

    const lastTest = testsHistory[testsHistory.length - 1]; // Get the last completed test
    if (!lastTest || !lastTest.answers || lastTest.answers.length === 0) {
        alert("No se encontraron respuestas en el test anterior para repasar.");
        navigateTo('tests-page');
        return;
    }
    if (!lastTest.questions || lastTest.questions.length === 0) {
        alert("No se pudo cargar las preguntas del test anterior para repasar errores. (Es posible que el test se haya guardado con una versión anterior de la aplicación).");
        navigateTo('tests-page');
        return;
    }

    const incorrectQuestionIds = lastTest.answers
        .filter(answer => !answer.isCorrect)
        .map(answer => answer.questionId);
    
    if (incorrectQuestionIds.length === 0) {
        alert("¡Felicidades! No hay preguntas falladas para repasar.");
        navigateTo('tests-page');
        return;
    }

    const questionsToRetest = lastTest.questions.filter(q => incorrectQuestionIds.includes(q.id));
    
    // Shuffle these specific questions for a fresh retest
    const shuffledIncorrectQuestions = [...questionsToRetest].sort(() => 0.5 - Math.random());

    // Use a generic theme name for retest of incorrect questions
    const retestTheme = `Repaso de errores (${lastTest.theme})`;
    startTest(shuffledIncorrectQuestions, retestTheme);
}

// Show/Hide Edit Question Modal
function showEditQuestionModal() {
    document.getElementById('edit-question-modal').classList.remove('hidden');
}

function hideEditQuestionModal() {
    document.getElementById('edit-question-modal').classList.add('hidden');
}

// Attach event listeners for the edit modal buttons
function setupEditModalListeners() {
    document.getElementById('save-question-changes').addEventListener('click', saveQuestionChanges);
    document.getElementById('cancel-edit-question').addEventListener('click', hideEditQuestionModal);
    
    // Add event listeners to option inputs to update correct answer dropdown dynamically
    const optionInputs = ['edit-option-a', 'edit-option-b', 'edit-option-c', 'edit-option-d'];
    optionInputs.forEach(input_id => {
        const inputElement = document.getElementById(input_id);
        if (inputElement) {
            inputElement.addEventListener('input', updateCorrectAnswerOptions);
        }
    });
}

// Navegar entre páginas
function navigateTo(pageId) {
    // Defensive checks for core elements before manipulating them
    const appContent = document.getElementById('app-content');
    const navBar = document.querySelector('.nav-bar');
    const targetPage = document.getElementById(pageId);

    if (!appContent) {
        console.error('Critical DOM element missing: #app-content.');
        return; 
    }
    if (!navBar) {
        console.error('Critical DOM element missing: .nav-bar.');
        return;
    }
    if (!targetPage) {
        console.error(`Target page element not found for ID: #${pageId}`);
        return; 
    }

    // Hide all pages within app-content
    appContent.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    
    // Show the target page
    targetPage.classList.remove('hidden');

    if (pageId === 'questions-list-page') {
        populateQuestionsList();
    }
    
    // Handle navigation bar visibility and active state
    if (['test-page', 'results-page', 'loading-page'].includes(pageId)) {
        navBar.classList.add('hidden');
    } else {
        navBar.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const activeNavItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (activeNavItem) { 
            activeNavItem.classList.add('active');
        }
        updateUI(); // Llamar a updateUI solo para las páginas principales
        if (pageId === 'tests-page') {
            updateTestsPageUI(); // Ensure tests-page specific UI is updated
        }
    }
}

// Manejar subida de archivo Excel
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("No se seleccionó ningún archivo");
        return;
    }

    showLoading("Procesando archivo Excel...");

    // Check if XLSX library is loaded
    if (typeof XLSX === 'undefined') {
        console.error("Librería XLSX no está cargada.");
        alert("Error al cargar el procesador de Excel. Intenta recargar la página.");
        hideLoading();
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error("El archivo no contiene hojas visibles");
            }
            
            processExcelData(workbook);
        } catch (error) {
            console.error("Error procesando Excel:", error);
            alert(`Error al procesar Excel: ${error.message}`);
            hideLoading();
        }
    };
    
    reader.onerror = function() {
        alert("Error al leer el archivo");
        hideLoading();
    };
    
    reader.readAsArrayBuffer(file);
}

// Procesar datos de Excel
function processExcelData(workbook) {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        alert("El archivo Excel no contiene hojas.");
        hideLoading();
        const loadStatusElement = document.getElementById('load-status');
        if (loadStatusElement) {
            loadStatusElement.textContent = "Archivo vacío.";
        }
        return;
    }
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];

    if (!firstSheet) {
        alert("El archivo Excel no contiene hojas.");
        hideLoading();
        const loadStatusElement = document.getElementById('load-status');
        if (loadStatusElement) {
            loadStatusElement.textContent = "Archivo vacío.";
        }
        return;
    }

    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    questions = [];
    // Assuming first row are headers, start from index 1
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        // Column order: id, theme, question, option1, option2, option3, option4, correctAnswer
        // Ensure row has at least 8 columns and critical data is not empty
        if (row.length >= 8 && row[2] && row[7]) { 
            questions.push({
                id: row[0] || (i + 1), // Use row[0] or row index as ID
                theme: row[1] || "General",
                question: row[2],
                options: [row[3], row[4], row[5], row[6]].filter(Boolean), // Filter out empty options
                correctAnswer: row[7],
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            });
        }
    }
    
    localStorage.setItem('questions', JSON.stringify(questions));
    hideLoading();
    alert(`Se han cargado ${questions.length} preguntas correctamente.`);
    const loadStatusElement = document.getElementById('load-status');
    if (loadStatusElement) {
        loadStatusElement.textContent = `Cargadas ${questions.length} preguntas.`;
    }
    populateThemeList();
}

// Cargar datos de ejemplo (simulados)
function loadSampleData() {
    showLoading("Cargando datos de ejemplo...");
    const loadStatusElement = document.getElementById('load-status');
    if (loadStatusElement) {
        loadStatusElement.textContent = "Cargando datos de ejemplo...";
    }
    
    setTimeout(() => {
        questions = [
            {
                id: 1,
                theme: "ATA29",
                question: "¿Qué es el sistema hidráulico en un avión?",
                options: ["Sistema de combustible", "Sistema de control de vuelo", "Sistema de presión de cabina", "Sistema que usa fluidos para transmitir potencia"],
                correctAnswer: "Sistema que usa fluidos para transmitir potencia",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 2,
                theme: "ATA30",
                question: "¿Qué indica una luz roja intermitente en el panel?",
                options: ["Advertencia", "Emergencia", "Información", "Estado normal"],
                correctAnswer: "Emergencia",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 3,
                theme: "ATA29",
                question: "¿Cuál es el fluido hidráulico más común?",
                options: ["Agua", "Aceite mineral", "Skydrol", "Alcohol"],
                correctAnswer: "Skydrol",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 4,
                theme: "ATA31",
                question: "¿Qué es el ACARS?",
                options: ["Sistema de aire acondicionado", "Sistema de comunicación digital aire-tierra", "Sistema de navegación", "Sistema de alerta de colisión"],
                correctAnswer: "Sistema de comunicación digital aire-tierra",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 5,
                theme: "ATA31",
                question: "¿Qué significa 'TAT' en aviación?",
                options: ["Temperatura ambiente total", "Tiempo aproximado de llegada", "Turbulencia en aire tranquilo", "Tensión de alta transmisión"],
                correctAnswer: "Temperatura ambiente total",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 6,
                theme: "ATA24",
                question: "¿Cuál es la función principal del APU?",
                options: ["Generar empuje adicional", "Suministrar energía eléctrica y neumática en tierra", "Controlar la temperatura de la cabina", "Ayudar en el despegue"],
                correctAnswer: "Suministrar energía eléctrica y neumática en tierra",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 7,
                theme: "ATA24",
                question: "¿Qué tipo de corriente eléctrica se usa comúnmente en la aeronave?",
                options: ["Corriente continua (DC)", "Corriente alterna (AC)", "Ambas", "Ninguna"],
                correctAnswer: "Ambas",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 8,
                theme: "ATA27",
                question: "¿Qué es un 'spoiler' en un ala?",
                options: ["Un dispositivo para aumentar la sustentación", "Un dispositivo para reducir la sustentación y aumentar la resistencia", "Un componente estructural del ala", "Un tipo de luz de navegación"],
                correctAnswer: "Un dispositivo para reducir la sustentación y la resistencia",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 9,
                theme: "ATA27",
                question: "¿Cuál es la función del 'flap'?",
                options: ["Aumentar la resistencia", "Aumentar la sustentación y la resistencia para el despegue y aterrizaje", "Reducir el consumo de combustible", "Controlar la dirección en vuelo"],
                correctAnswer: "Aumentar la sustentación y la resistencia para el despegue y aterrizaje",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            },
            {
                id: 10,
                theme: "ATA49",
                question: "¿Qué es una APU?",
                options: ["Unidad de Potencia Auxiliar", "Unidad de Propulsión Unificada", "Unidad de Procesamiento de Aire", "Unidad de Presión Urbana"],
                correctAnswer: "Unidad de Potencia Auxiliar",
                answeredCorrectly: 0,
                answeredIncorrectly: 0
            }
        ];
        
        localStorage.setItem('questions', JSON.stringify(questions));
        document.getElementById('file-info').textContent = "Datos de ejemplo cargados";
        hideLoading();
        alert("Datos de ejemplo cargados correctamente.");
        if (loadStatusElement) {
            loadStatusElement.textContent = `Cargadas ${questions.length} preguntas.`;
        }
        populateThemeList();
    }, 1000);
}

// Mostrar loading
function showLoading(message) {
    document.getElementById('loading-message').textContent = message;
    navigateTo('loading-page');
}

// Ocultar loading
function hideLoading() {
    navigateTo('tests-page');
}

// Actualizar UI (general for nav pages)
function updateUI() {
    // Actualizar lista de tests recientes
    const recentTestsContainer = document.getElementById('recent-tests');
    if (!recentTestsContainer) return; // Defensive check
    recentTestsContainer.innerHTML = ''; 

    if (testsHistory.length > 0) {
        const lastTests = testsHistory.slice(-3).reverse();
        lastTests.forEach(test => {
            const correctAnswers = test.answers.filter(a => a.isCorrect).length;
            const percentage = test.answers.length > 0 ? Math.round((correctAnswers / test.answers.length) * 100) : 0;
            
            const testElement = document.createElement('div');
            testElement.className = 'theme-item';
            testElement.innerHTML = `
                <span>${test.theme || 'Aleatorio'} (${correctAnswers}/${test.answers.length})</span>
                <span>${percentage}%</span>
            `;
            
            recentTestsContainer.appendChild(testElement);
        });
    } else {
        const noTestsMessage = document.createElement('p');
        noTestsMessage.textContent = 'Aún no has realizado ningún test';
        recentTestsContainer.appendChild(noTestsMessage);
    }
    
    // Actualizar estadísticas
    updateStatistics();
}

// New: Update Tests Page specific UI (resume card)
function updateTestsPageUI() {
    const testInProgressCard = document.getElementById('test-in-progress-card');
    const savedTestsListContainer = document.getElementById('saved-tests-list'); // New container

    if (!testInProgressCard || !savedTestsListContainer) return;

    savedTestsListContainer.innerHTML = ''; // Clear existing content

    if (savedTests.length > 0) {
        testInProgressCard.classList.remove('hidden');
        const header = document.createElement('h3');
        header.textContent = `Tests guardados (${savedTests.length}/3)`;
        savedTestsListContainer.appendChild(header);

        savedTests.forEach(savedItem => {
            const test = savedItem.test;
            const progressPercentage = test.questions.length > 0 ? 
                Math.round(((test.currentIndex + 1) / test.questions.length) * 100) : 0;

            const savedTestElement = document.createElement('div');
            savedTestElement.className = 'card saved-test-item'; // Add a class for potential styling
            savedTestElement.innerHTML = `
                <p><strong>Tema:</strong> ${test.theme || 'Aleatorio'}</p>
                <p>Progreso: Pregunta ${test.currentIndex + 1} de ${test.questions.length} (${progressPercentage}%)</p>
                <div class="test-controls" style="flex-direction: row; justify-content: flex-end; gap: 8px;">
                    <button class="btn resume-saved-test-btn" data-test-id="${savedItem.id}" style="width: auto;">Continuar</button>
                    <button class="btn btn-outline delete-saved-test-btn" data-test-id="${savedItem.id}" style="width: auto;">Eliminar</button>
                </div>
            `;
            savedTestsListContainer.appendChild(savedTestElement);
        });
    } else {
        testInProgressCard.classList.add('hidden');
    }
}

// Actualizar estadísticas
function updateStatistics() {
    const themeStatsContainer = document.getElementById('theme-stats');
    if (!themeStatsContainer) return; // Defensive check
    themeStatsContainer.innerHTML = ''; 

    const averageScoreElem = document.getElementById('average-score');
    const totalTestsElem = document.getElementById('total-tests');
    const totalQuestionsStatsElem = document.getElementById('total-questions-stats');
    const averageProgressElem = document.getElementById('average-progress');

    // Defensive checks for stats elements
    if (!averageScoreElem || !totalTestsElem || !totalQuestionsStatsElem || !averageProgressElem) {
        console.warn("One or more statistics display elements are missing.");
        const noStatsMessage = document.createElement('p');
        noStatsMessage.textContent = 'No hay estadísticas disponibles';
        themeStatsContainer.appendChild(noStatsMessage);
        return;
    }

    if (testsHistory.length === 0) {
        const noStatsMessage = document.createElement('p');
        noStatsMessage.textContent = 'No hay estadísticas disponibles';
        themeStatsContainer.appendChild(noStatsMessage);

        averageScoreElem.textContent = `0%`;
        totalTestsElem.textContent = 0;
        totalQuestionsStatsElem.textContent = 0;
        averageProgressElem.style.width = `0%`;
        return; 
    }
    
    const totalTests = testsHistory.length;
    const totalQuestions = testsHistory.reduce((sum, test) => sum + test.answers.length, 0);
    const totalCorrect = testsHistory.reduce((sum, test) => {
        return sum + test.answers.filter(a => a.isCorrect).length;
    }, 0);
    
    const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    averageScoreElem.textContent = `${averageScore}%`;
    totalTestsElem.textContent = totalTests;
    totalQuestionsStatsElem.textContent = totalQuestions;
    averageProgressElem.style.width = `${averageScore}%`;
    
    const themeStats = {};
    
    testsHistory.forEach(test => {
        test.answers.forEach(answer => {
            const theme = answer.theme;
            if (!themeStats[theme]) {
                themeStats[theme] = { correct: 0, total: 0 };
            }
            
            if (answer.isCorrect) {
                themeStats[theme].correct++;
            }
            themeStats[theme].total++;
        });
    });
    
    Object.keys(themeStats).sort().forEach(theme => { 
        const stat = themeStats[theme];
        const percentage = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        
        const statElement = document.createElement('div');
        statElement.className = 'theme-stat-item';
        statElement.innerHTML = `
            <span>${theme}</span>
            <span>${percentage}% (${stat.correct}/${stat.total})</span>
        `;
        
        themeStatsContainer.appendChild(statElement);
    });
}

// Rellenar la lista de todas las preguntas
function populateQuestionsList(searchTerm = '') {
    const container = document.getElementById('all-questions-container');
    container.innerHTML = '';

    if (questions.length === 0) {
        container.innerHTML = `<div class="card"><p>No hay preguntas cargadas. Ve a la pestaña 'Usuario' para subir un archivo o cargar datos de ejemplo.</p></div>`;
        return;
    }

    const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
    const filteredQuestions = questions.filter(q => 
        q.question.toLowerCase().includes(lowerCaseSearchTerm) ||
        q.theme.toLowerCase().includes(lowerCaseSearchTerm)
    );

    if (filteredQuestions.length === 0) {
        container.innerHTML = `<div class="card"><p>No se encontraron preguntas que coincidan con la búsqueda.</p></div>`;
        return;
    }

    filteredQuestions.forEach(question => {
        const questionCard = document.createElement('div');
        questionCard.className = 'card question-card-editable'; // Added class for styling

        let optionsHtml = '<ul style="list-style: none; padding-left: 0;">';
        question.options.forEach(option => {
            const isCorrect = option === question.correctAnswer;
            const style = isCorrect ? 'color: var(--stat-correct); font-weight: bold;' : '';
            optionsHtml += `<li style="padding: 4px 0; ${style}">${option}</li>`;
        });
        optionsHtml += '</ul>';

        questionCard.innerHTML = `
            <div class="question-header">
                <p style="font-size: 14px; color: var(--primary-color);"><strong>Tema: ${question.theme}</strong></p>
                <span class="edit-icon" data-id="${question.id}" title="Editar pregunta"><i class="fa-solid fa-pen-to-square"></i></span>
            </div>
            <p style="margin-bottom: 12px;">${question.question}</p>
            ${optionsHtml}
        `;
        container.appendChild(questionCard);
    });

    // Add event listener for edit icons using delegation
    container.querySelectorAll('.edit-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const questionId = icon.dataset.id; // Fixed: Get data-id from the clicked icon element itself
            editQuestion(questionId);
        });
    });
}

// Function to populate and show the edit question modal
function editQuestion(questionId) {
    const questionToEdit = questions.find(q => q.id == questionId); // Use == for potential type coercion (e.g. string ID from dataset)
    if (!questionToEdit) {
        alert("Pregunta no encontrada para editar.");
        return;
    }

    document.getElementById('edit-question-id').value = questionToEdit.id;
    document.getElementById('edit-theme').value = questionToEdit.theme;
    document.getElementById('edit-question-text').value = questionToEdit.question;

    // Populate options
    const optionInputs = ['edit-option-a', 'edit-option-b', 'edit-option-c', 'edit-option-d'];
    questionToEdit.options.forEach((option, index) => {
        if (optionInputs[index]) {
            document.getElementById(optionInputs[index]).value = option;
        }
    });
    // Clear any remaining option inputs if the question had fewer than 4 options
    for (let i = questionToEdit.options.length; i < 4; i++) {
        if (optionInputs[i]) {
            document.getElementById(optionInputs[i]).value = '';
        }
    }

    // Populate correct answer dropdown
    const correctAnswerSelect = document.getElementById('edit-correct-answer');
    correctAnswerSelect.innerHTML = '<option value="">Selecciona la correcta</option>'; // Clear existing options

    // Call updateCorrectAnswerOptions to populate the select based on the current options
    updateCorrectAnswerOptions();
    
    // Set the correct answer value after options are populated
    correctAnswerSelect.value = questionToEdit.correctAnswer;

    showEditQuestionModal();
}

// Function to dynamically update correct answer options based on what's in option inputs
function updateCorrectAnswerOptions() {
    const correctAnswerSelect = document.getElementById('edit-correct-answer');
    const currentCorrectAnswer = correctAnswerSelect.value; // Keep track of currently selected correct answer

    correctAnswerSelect.innerHTML = '<option value="">Selecciona la correcta</option>';

    const optionInputs = ['edit-option-a', 'edit-option-b', 'edit-option-c', 'edit-option-d'];
    let hasValidOptions = false;
    optionInputs.forEach(input_id => {
        const optionText = document.getElementById(input_id).value.trim();
        if (optionText) {
            hasValidOptions = true;
            const optElement = document.createElement('option');
            optElement.value = optionText;
            optElement.textContent = optionText;
            correctAnswerSelect.appendChild(optElement);
        }
    });

    // Restore the previously selected correct answer if it's still a valid option
    if (currentCorrectAnswer && correctAnswerSelect.querySelector(`option[value="${currentCorrectAnswer}"]`)) {
        correctAnswerSelect.value = currentCorrectAnswer;
    } else if (hasValidOptions) {
        // If previous correct answer is no longer an option, try to select the first valid one
        // Only if "Selecciona la correcta" is not the only option
        if (correctAnswerSelect.options.length > 1) {
             correctAnswerSelect.selectedIndex = 1; // Select the first actual option
        }
    } else {
        correctAnswerSelect.value = ""; // No valid options, reset selection
    }
}

// Function to save changes from the edit modal
function saveQuestionChanges() {
    const questionId = document.getElementById('edit-question-id').value;
    const theme = document.getElementById('edit-theme').value.trim();
    const questionText = document.getElementById('edit-question-text').value.trim();
    const optionA = document.getElementById('edit-option-a').value.trim();
    const optionB = document.getElementById('edit-option-b').value.trim();
    const optionC = document.getElementById('edit-option-c').value.trim();
    const optionD = document.getElementById('edit-option-d').value.trim();
    const correctAnswer = document.getElementById('edit-correct-answer').value.trim();

    if (!theme || !questionText || !optionA || !optionB || !correctAnswer) {
        alert("Tema, pregunta, al menos dos opciones y la respuesta correcta son obligatorios.");
        return;
    }

    const options = [optionA, optionB, optionC, optionD].filter(opt => opt); // Filter out empty options
    if (options.length < 2) {
        alert("Debe haber al menos dos opciones.");
        return;
    }
    if (!options.includes(correctAnswer)) {
        alert("La respuesta correcta debe ser una de las opciones proporcionadas.");
        return;
    }

    const questionIndex = questions.findIndex(q => q.id == questionId);
    if (questionIndex !== -1) {
        questions[questionIndex].theme = theme;
        questions[questionIndex].question = questionText;
        questions[questionIndex].options = options;
        questions[questionIndex].correctAnswer = correctAnswer;
        
        localStorage.setItem('questions', JSON.stringify(questions));
        hideEditQuestionModal();
        populateQuestionsList(); // Refresh the questions list
        populateThemeList(); // Also update theme list in case a theme name changed or new themes appeared
        alert("Pregunta actualizada correctamente.");
    } else {
        alert("Error: No se pudo encontrar la pregunta para actualizar.");
    }
}

// Rellenar lista de temas
function populateThemeList() {
    const themeListContainer = document.getElementById('theme-list');
    if (!themeListContainer) return; // Defensive check
    themeListContainer.innerHTML = '';
    
    if (questions.length === 0) {
        themeListContainer.innerHTML = '<p>No hay preguntas cargadas. Sube un archivo Excel o carga datos de ejemplo.</p>';
        return;
    }
    
    const themes = {};
    questions.forEach(q => {
        if (!themes[q.theme]) {
            themes[q.theme] = 0;
        }
        themes[q.theme]++;
    });
    
    const totalQuestions = questions.length;

    // "Select All" checkbox
    const allThemesItem = document.createElement('div');
    allThemesItem.className = 'theme-item-checkbox';
    const allThemesId = 'theme-check-all';
    allThemesItem.innerHTML = `
        <input type="checkbox" id="${allThemesId}" data-theme="Todos">
        <label for="${allThemesId}">
            <span><strong>Todos los temas</strong></span>
            <span>${totalQuestions} preguntas</span>
        </label>
    `;
    themeListContainer.appendChild(allThemesItem);

    const allCheckbox = allThemesItem.querySelector('input');
    allCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        themeListContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = isChecked;
        });
    });
    
    Object.keys(themes).sort().forEach(theme => { 
        const count = themes[theme];
        const themeItem = document.createElement('div');
        themeItem.className = 'theme-item-checkbox';
        const themeId = `theme-check-${theme.replace(/\s+/g, '-')}`;
        themeItem.innerHTML = `
            <input type="checkbox" id="${themeId}" data-theme="${theme}">
            <label for="${themeId}">
                <span>${theme}</span>
                <span>${count} preguntas</span>
            </label>
        `;
        themeListContainer.appendChild(themeItem);
    });
}

// Iniciar test aleatorio
function startRandomTest() {
    const questionCount = parseInt(document.getElementById('questions-count-slider').value);
    
    if (questions.length === 0) {
        alert("No hay preguntas cargadas. Por favor, sube un archivo Excel o carga datos de ejemplo.");
        return;
    }

    if (questionCount > questions.length) {
        alert(`Solo hay ${questions.length} preguntas disponibles. Se iniciará el test con todas las preguntas.`);
        // Optionally adjust questionCount to available questions
        // questionCount = questions.length;
    }
    
    // Seleccionar preguntas aleatorias
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, questions.length)); // Ensure we don't ask for more questions than available
    
    startTest(selectedQuestions, "Aleatorio");
    document.getElementById('random-test-options').classList.add('hidden'); // Hide options after starting test
}

// Iniciar test por tema
function startThemeTest() {
    const selectedThemes = [];
    document.querySelectorAll('#theme-list input[type="checkbox"]:checked').forEach(checkbox => {
        const theme = checkbox.dataset.theme;
        if (theme && theme !== 'Todos') { // Exclude the 'Todos' checkbox itself, as its purpose is to check/uncheck others
            selectedThemes.push(theme);
        }
    });
    
    if (selectedThemes.length === 0) {
        alert("Por favor, selecciona al menos un tema.");
        return;
    }
    
    let selectedQuestions;
    // If 'Todos' was checked, it means all individual themes were checked.
    // So, if selectedThemes is empty but 'Todos' was conceptually selected,
    // or if actual themes are selected, filter accordingly.
    const allCheckboxChecked = document.getElementById('theme-check-all') && document.getElementById('theme-check-all').checked;

    if (allCheckboxChecked) {
        selectedQuestions = [...questions];
    } else {
        selectedQuestions = questions.filter(q => selectedThemes.includes(q.theme));
    }
    
    if (selectedQuestions.length === 0) {
        alert("No hay preguntas para los temas seleccionados.");
        return;
    }

    const themeName = selectedThemes.length > 1 ? "Varios temas" : selectedThemes[0];
    
    startTest(selectedQuestions, themeName);
    document.getElementById('theme-selection').classList.add('hidden'); // Hide options after starting test
}

// Iniciar test
function startTest(selectedQuestions, theme) {
    // If a test is in progress, ask the user what to do.
    if (currentTest) {
        if (!confirm("Ya tienes un test en curso. ¿Quieres empezar uno nuevo y descartar el actual?")) {
            return; // User chose not to start a new test
        }
        // If they chose to start a new one, clear the old one
        currentTest = null;
        // localStorage.removeItem('savedTestInProgress'); // This was for a single saved test, now removed.
        // savedTestInProgress = null; // This was for a single saved test, now removed.
    }

    currentTest = {
        questions: selectedQuestions,
        currentIndex: 0,
        answers: [],
        theme: theme,
        startTime: new Date(),
        endTime: null
    };
    
    navigateTo('test-page');
    showQuestion(0);
}

// Mostrar pregunta
function showQuestion(index) {
    if (!currentTest || index < 0 || index >= currentTest.questions.length) return;
    
    currentTest.currentIndex = index;
    const question = currentTest.questions[index];
    
    document.getElementById('current-question').textContent = index + 1;
    document.getElementById('total-questions').textContent = currentTest.questions.length;
    document.getElementById('current-theme').textContent = question.theme;
    document.getElementById('question-text').textContent = question.question;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    // Check if the current question has been answered in this test session
    const existingAnswer = currentTest.answers.find(a => a.questionId === question.id);

    question.options.forEach((optionText, i) => {
        // Generate options as A, B, C, D
        const optionChar = String.fromCharCode(65 + i); 
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.dataset.option = optionChar;
        optionElement.textContent = `${optionChar}. ${optionText}`;
        
        // If the question was already answered, apply styling
        if (existingAnswer) {
            // Disable clicks if already answered
            optionElement.style.pointerEvents = 'none';

            if (existingAnswer.selectedOption === optionChar) {
                optionElement.classList.add(existingAnswer.isCorrect ? 'correct' : 'incorrect');
            } else if (optionText === question.correctAnswer) { // Display correct answer if selected was wrong
                optionElement.classList.add('correct');
            }
        } else {
            // Only add event listener if not yet answered
            optionElement.addEventListener('click', () => selectOption(optionElement, question));
        }
        
        optionsContainer.appendChild(optionElement);
    });
    
    // Manejar botones de navegación
    document.getElementById('prev-question').classList.toggle('hidden', index === 0);
    
    if (index === currentTest.questions.length - 1) {
        document.getElementById('next-question').textContent = 'Finalizar';
    } else {
        document.getElementById('next-question').textContent = 'Siguiente';
    }
}

// Seleccionar opción
function selectOption(optionElement, question) {
    // Check if this question has already been answered within the current test session
    const existingAnswerIndex = currentTest.answers.findIndex(a => a.questionId === question.id);
    if (existingAnswerIndex !== -1) {
        // If already answered, do nothing. This should be prevented by pointerEvents:'none'
        return; 
    }
    
    // Deseleccionar otras opciones y re-enable clicks
    document.querySelectorAll('.options .option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = 'none'; // Disable all options after selection
    });
    
    // Seleccionar esta opción
    optionElement.classList.add('selected');
    
    // Determine if the selected option text matches the correct answer text
    const selectedOptionText = optionElement.textContent.substring(3).trim(); // Remove "A. ", "B. ", etc.
    const isCorrect = selectedOptionText === question.correctAnswer;
    
    // Apply correct/incorrect styling immediately
    if (isCorrect) {
        optionElement.classList.add('correct');
    } else {
        optionElement.classList.add('incorrect');
        // Also show the correct answer
        document.querySelectorAll('.options .option').forEach(opt => {
            const optText = opt.textContent.substring(3).trim();
            if (optText === question.correctAnswer) {
                opt.classList.add('correct');
            }
        });
    }

    // Save answer
    currentTest.answers.push({
        questionId: question.id,
        theme: question.theme,
        selectedOption: optionElement.dataset.option, // Save option letter (A, B, C, D)
        selectedOptionText: selectedOptionText, // Save the actual text of the selected option
        isCorrect: isCorrect,
        timestamp: new Date()
    });
    
    // Update global questions array with statistics (optional, but good for overall stats)
    const questionIndex = questions.findIndex(q => q.id === question.id);
    if (questionIndex !== -1) {
        if (isCorrect) {
            questions[questionIndex].answeredCorrectly = (questions[questionIndex].answeredCorrectly || 0) + 1;
        } else {
            questions[questionIndex].answeredIncorrectly = (questions[questionIndex].answeredIncorrectly || 0) + 1;
        }
        localStorage.setItem('questions', JSON.stringify(questions));
    }
}

// Siguiente pregunta
function nextQuestion() {
    // Ensure an option was selected before moving to the next question, if not already answered
    const currentQuestionId = currentTest.questions[currentTest.currentIndex].id;
    const currentQuestionAnswered = currentTest.answers.some(a => a.questionId === currentQuestionId);

    if (!currentQuestionAnswered && currentTest.currentIndex < currentTest.questions.length - 1) {
        alert("Por favor, selecciona una opción antes de continuar.");
        return;
    }

    if (currentTest.currentIndex === currentTest.questions.length - 1) {
        finishTest();
        return;
    }
    
    showQuestion(currentTest.currentIndex + 1);
}

// Pregunta anterior
function prevQuestion() {
    showQuestion(currentTest.currentIndex - 1);
}

// Finalizar test
function finishTest() {
    currentTest.endTime = new Date();
    
    // Ensure all questions have an answer recorded (if user navigated through without answering)
    // This loop ensures that even if user skips questions with prev/next, they are recorded as incorrect
    currentTest.questions.forEach(q => {
        const alreadyAnswered = currentTest.answers.some(a => a.questionId === q.id);
        if (!alreadyAnswered) {
            // Mark as incorrect if not answered
            currentTest.answers.push({
                questionId: q.id,
                theme: q.theme,
                selectedOption: null, // No option selected
                selectedOptionText: null,
                isCorrect: false, // Automatically incorrect if not answered
                timestamp: new Date()
            });

            // Update global question stats for unanswered
            const questionIndex = questions.findIndex(item => item.id === q.id);
            if (questionIndex !== -1) {
                questions[questionIndex].answeredIncorrectly = (questions[questionIndex].answeredIncorrectly || 0) + 1;
            }
        }
    });

    // Sort answers by question order to maintain consistency
    currentTest.answers.sort((a, b) => {
        const qa = currentTest.questions.findIndex(q => q.id === a.questionId);
        const qb = currentTest.questions.findIndex(q => q.id === b.questionId);
        return qa - qb;
    });

    localStorage.setItem('questions', JSON.stringify(questions)); // Save updated question stats
    
    // Guardar el test en el historial
    testsHistory.push({
        theme: currentTest.theme,
        questions: currentTest.questions, // Store the actual questions used in this test
        answers: currentTest.answers,
        startTime: currentTest.startTime,
        endTime: currentTest.endTime
    });
    
    localStorage.setItem('testsHistory', JSON.stringify(testsHistory));
    
    // Mostrar resultados
    showResults();

    // Clear the current test and any saved single test in progress (now handled by savedTests array)
    currentTest = null;
    // localStorage.removeItem('savedTestInProgress'); // Removed: handled by savedTests array now
    // savedTestInProgress = null; // Removed: handled by savedTests array now
}

// Mostrar resultados
function showResults() {
    // Check if currentTest is null before accessing its properties
    // This check is primarily for situations where finishTest might not have been called correctly,
    // or if `currentTest` was manually cleared before results could be shown.
    // However, for retest functionality, we now rely on `testsHistory`.
    if (!currentTest) {
        console.error("No hay un test en curso para mostrar resultados.");
        // Attempt to load the last test from history for display if currentTest is null,
        // to provide context for retest buttons, but not to set currentTest.
        if (testsHistory.length > 0) {
            // Temporarily use the last test for display, without setting currentTest
            const lastCompletedTestForDisplay = testsHistory[testsHistory.length - 1];
            displayResultSummary(lastCompletedTestForDisplay);
            navigateTo('results-page');
            return;
        } else {
            navigateTo('tests-page'); // Redirect to a safe page if no history
            return;
        }
    }

    displayResultSummary(currentTest);
    navigateTo('results-page');
}

// Helper function to display results, used by showResults and potentially others
function displayResultSummary(testData) {
    const correctAnswers = testData.answers.filter(a => a.isCorrect).length;
    const totalQuestions = testData.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    document.getElementById('final-score').textContent = `${percentage}%`;
    document.getElementById('correct-answers').textContent = correctAnswers;
    document.getElementById('total-answers').textContent = totalQuestions;
    
    // Calcular resultados por tema
    const themeResults = {};
    testData.answers.forEach(answer => {
        if (!themeResults[answer.theme]) {
            themeResults[answer.theme] = { correct: 0, total: 0 };
        }
        
        if (answer.isCorrect) {
            themeResults[answer.theme].correct++;
        }
        themeResults[answer.theme].total++;
    });
    
    const themeResultsContainer = document.getElementById('theme-results');
    themeResultsContainer.innerHTML = '';
    
    Object.keys(themeResults).sort().forEach(theme => { // Sort themes alphabetically
        const result = themeResults[theme];
        const percentage = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
        
        const resultElement = document.createElement('div');
        resultElement.className = 'result-theme';
        resultElement.innerHTML = `
            <span>${theme}</span>
            <span>${result.correct}/${result.total} (${percentage}%)</span>
        `;
        
        themeResultsContainer.appendChild(resultElement);
    });
}
