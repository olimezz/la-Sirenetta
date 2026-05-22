document.addEventListener('DOMContentLoaded', () => {
    const NUM_TABLES = 10;
    const container = document.getElementById('tables-container');
    const template = document.getElementById('table-template');
    const activeTimersBadge = document.getElementById('active-timers');
    const finishedContainer = document.getElementById('finished-tables-container');
    
    let audioCtx = null;
    let bgAudio = null;
    let wakeLock = null;

    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log('Wake Lock error:', err);
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            requestWakeLock();
        }
    });
    
    function initAudio() {
        requestWakeLock();
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // HACK per iOS e schermi bloccati: riproduce un audio HTML5 silenzioso in loop.
        // Questo impedisce al browser di sospendere l'esecuzione JavaScript (i timer).
        if (!bgAudio) {
            bgAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
            bgAudio.loop = true;
            bgAudio.play().catch(e => console.log(e));
        } else if (bgAudio.paused) {
            bgAudio.play().catch(e => console.log(e));
        }
    }

    // Assicurati di sbloccare l'audio in continuazione ad ogni tocco
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);

    // State management for all tables
    const tables = [];
    const CIRCUMFERENCE = 2 * Math.PI * 54; // r=54 for the SVG circle

    // Initialize tables
    for (let i = 1; i <= NUM_TABLES; i++) {
        createTableCard(i);
    }

    function createTableCard(id) {
        // Clone template
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.table-card');
        
        // Elements
        const numberEl = card.querySelector('.num');
        const nameInput = card.querySelector('.customer-name');
        const timeText = card.querySelector('.time-text');
        const progressRing = card.querySelector('.ring-progress');
        
        const btn10s = card.querySelector('.btn-10s');
        const btn15 = card.querySelector('.btn-15');
        const btn20 = card.querySelector('.btn-20');
        const btnReset = card.querySelector('.btn-reset');

        numberEl.textContent = id;
        
        // Table state
        const table = {
            id,
            card,
            timeText,
            progressRing,
            btn10s,
            btn15,
            btn20,
            btnReset,
            nameInput,
            status: 'idle', // idle, active, warning, danger
            totalDuration: 0,
            endTime: 0,
            interval: null
        };
        
        tables.push(table);

        // Event listeners
        btn10s.addEventListener('click', () => startTimer(table, 10));
        btn15.addEventListener('click', () => startTimer(table, 15 * 60));
        btn20.addEventListener('click', () => startTimer(table, 20 * 60));
        btnReset.addEventListener('click', () => resetTimer(table));

        container.appendChild(clone);
    }

    function startTimer(table, seconds) {
        initAudio(); // Riprende l'audio context durante l'interazione utente
        // Clear existing interval if any
        if (table.interval) clearInterval(table.interval);

        table.totalDuration = seconds;
        table.endTime = Date.now() + (seconds * 1000);
        
        // Update UI state
        table.btn10s.classList.add('hidden');
        table.btn15.classList.add('hidden');
        table.btn20.classList.add('hidden');
        table.btnReset.classList.remove('hidden');
        
        table.status = 'active';
        updateCardUI(table);
        updateActiveCount();
        sortTables();

        // Timer Loop
        table.interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((table.endTime - now) / 1000));
            
            updateTimeDisplay(table, remaining);
            
            // Status updates
            if (remaining === 0) {
                clearInterval(table.interval);
                table.status = 'finished';
                playAlarmSound();
                table.card.remove();
                createFinishedChip(table);
                updateCardUI(table);
                updateActiveCount();
                sortTables();
            } else if (remaining <= 60 && table.status !== 'warning') {
                table.status = 'warning';
                updateCardUI(table);
            }
        }, 100); // Fast interval for smooth ring update
    }

    function resetTimer(table) {
        if (table.interval) {
            clearInterval(table.interval);
            table.interval = null;
        }
        
        table.status = 'idle';
        table.totalDuration = 0;
        table.endTime = 0;
        
        // Reset UI
        table.timeText.textContent = "00:00";
        table.progressRing.style.strokeDashoffset = 0;
        
        table.btnReset.classList.add('hidden');
        table.btn10s.classList.remove('hidden');
        table.btn15.classList.remove('hidden');
        table.btn20.classList.remove('hidden');
        
        // Keep the name so they don't have to retype if they just want to reset the timer
        // table.nameInput.value = ''; 

        updateCardUI(table);
        updateActiveCount();
        sortTables();
    }

    function updateTimeDisplay(table, remaining) {
        // Format MM:SS
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (table.timeText.textContent !== formatted) {
            table.timeText.textContent = formatted;
        }

        // Update SVG Ring
        if (table.totalDuration > 0) {
            const fraction = remaining / table.totalDuration;
            const offset = CIRCUMFERENCE - (fraction * CIRCUMFERENCE);
            table.progressRing.style.strokeDashoffset = offset;
        }
    }

    function updateCardUI(table) {
        table.card.setAttribute('data-status', table.status);
    }

    function updateActiveCount() {
        const activeCount = tables.filter(t => t.status !== 'idle').length;
        activeTimersBadge.textContent = activeCount;
    }

    function sortTables() {
        tables.sort((a, b) => {
            if (a.status === 'idle' && b.status === 'idle') {
                return a.id - b.id;
            }
            if (a.status === 'idle') return 1;
            if (b.status === 'idle') return -1;
            
            return a.endTime - b.endTime;
        });

        tables.forEach(table => {
            if (table.status !== 'finished') {
                container.appendChild(table.card);
            }
        });
    }

    function createFinishedChip(table) {
        if (document.getElementById(`chip-${table.id}`)) return;

        const chip = document.createElement('div');
        chip.className = 'finished-chip';
        chip.id = `chip-${table.id}`;
        
        const label = document.createElement('span');
        label.textContent = `Tavolo ${table.id}`;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'chip-close';
        closeBtn.innerHTML = '&times;';
        
        closeBtn.addEventListener('click', () => {
            chip.remove();
            resetTimer(table);
        });
        
        chip.appendChild(label);
        chip.appendChild(closeBtn);
        finishedContainer.appendChild(chip);
    }

    function playAlarmSound() {
        try {
            if (!audioCtx) initAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            // Riproduce 4 gruppi di 4 bip (stile vera sveglia digitale, dura circa 5.5 secondi)
            for (let group = 0; group < 4; group++) {
                for (let i = 0; i < 4; i++) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    
                    osc.type = 'square';
                    osc.frequency.value = 800;
                    
                    const startTime = audioCtx.currentTime + (group * 1.5) + (i * 0.25);
                    const duration = 0.12;
                    
                    gain.gain.setValueAtTime(0, startTime);
                    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
                    gain.gain.setValueAtTime(0.3, startTime + duration - 0.01);
                    gain.gain.linearRampToValueAtTime(0, startTime + duration);
                    
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                }
            }
        } catch (e) {
            console.log('Audio API non supportata', e);
        }
    }
});
