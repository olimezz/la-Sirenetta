document.addEventListener('DOMContentLoaded', () => {
    const NUM_TABLES = 10;
    const container = document.getElementById('tables-container');
    const template = document.getElementById('table-template');
    const activeTimersBadge = document.getElementById('active-timers');
    
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
        btn15.addEventListener('click', () => startTimer(table, 15 * 60));
        btn20.addEventListener('click', () => startTimer(table, 20 * 60));
        btnReset.addEventListener('click', () => resetTimer(table));

        container.appendChild(clone);
    }

    function startTimer(table, seconds) {
        // Clear existing interval if any
        if (table.interval) clearInterval(table.interval);

        table.totalDuration = seconds;
        table.endTime = Date.now() + (seconds * 1000);
        
        // Update UI state
        table.btn15.classList.add('hidden');
        table.btn20.classList.add('hidden');
        table.btnReset.classList.remove('hidden');
        
        table.status = 'active';
        updateCardUI(table);
        updateActiveCount();

        // Timer Loop
        table.interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((table.endTime - now) / 1000));
            
            updateTimeDisplay(table, remaining);
            
            // Status updates
            if (remaining === 0) {
                clearInterval(table.interval);
                table.status = 'danger';
                updateCardUI(table);
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
        table.btn15.classList.remove('hidden');
        table.btn20.classList.remove('hidden');
        
        // Keep the name so they don't have to retype if they just want to reset the timer
        // table.nameInput.value = ''; 

        updateCardUI(table);
        updateActiveCount();
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
});
