document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // STORAGE KEYS
    // =========================

    const KEYS = {
        entries: "lifeTrackerEntries",
        habits: "lifeTrackerHabits",
        goals: "lifeTrackerGoals",
        tasks: "lifeTrackerTasks"
    };


    // =========================
    // GENERIC HELPERS
    // =========================

    function getData(key) {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    }

    function setData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function todayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function formatPeso(amount) {
        return "₱" + Number(amount).toLocaleString("en-PH", {
            minimumFractionDigits: 2
        });
    }

    function toggleForm(formEl) {
        formEl.style.display =
            formEl.style.display === "block" ? "none" : "block";
    }

    let toastTimer = null;
    function showToast(text) {
        const toast = document.getElementById("toast");
        toast.textContent = text;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 2200);
    }


    // =========================
    // TABS
    // =========================

    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll("[data-tab-content]");

    function goToTab(tabId) {
        tabContents.forEach(function (section) {
            section.hidden = section.id !== tabId;
        });
        tabButtons.forEach(function (btn) {
            btn.classList.toggle("active", btn.dataset.tab === tabId);
        });
    }

    tabButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            goToTab(btn.dataset.tab);
        });
    });

    document.querySelectorAll("[data-goto]").forEach(function (card) {
        card.addEventListener("click", function () {
            goToTab(card.dataset.goto);
        });
    });


    // =========================================================
    // MONEY
    // =========================================================

    const addEntryBtn = document.getElementById("addEntryBtn");
    const entryForm = document.getElementById("entryForm");
    const saveEntryBtn = document.getElementById("saveEntryBtn");
    const entryDate = document.getElementById("entryDate");
    const transactionList = document.getElementById("transactionList");

    entryDate.value = todayStr();

    function updateMoneySummary() {
        const entries = getData(KEYS.entries);

        let totalIncome = 0;
        let totalExpense = 0;

        entries.forEach(function (entry) {
            if (entry.type === "income") totalIncome += entry.amount;
            if (entry.type === "expense") totalExpense += entry.amount;
        });

        const balance = totalIncome - totalExpense;

        document.getElementById("balanceAmount").textContent = formatPeso(balance);
        document.getElementById("incomeAmount").textContent = formatPeso(totalIncome);
        document.getElementById("expenseAmount").textContent = formatPeso(totalExpense);
    }

    function renderTransactions() {
        const entries = getData(KEYS.entries).slice().reverse();

        transactionList.innerHTML = "";

        if (entries.length === 0) {
            transactionList.innerHTML = `<p class="empty-message">No transactions yet. Add your first entry above.</p>`;
            return;
        }

        entries.forEach(function (entry) {
            const row = document.createElement("div");
            row.classList.add("transaction");

            const sign = entry.type === "income" ? "+" : "-";
            const typeClass = entry.type === "income" ? "income" : "expense";

            row.innerHTML = `
                <div class="transaction-info">
                    <h3>${entry.category}</h3>
                    <p>${entry.description || "No description"} • ${entry.date}</p>
                </div>
                <div class="transaction-right">
                    <span class="${typeClass}">${sign} ${formatPeso(entry.amount)}</span>
                    <button class="delete-btn" data-id="${entry.id}">Delete</button>
                </div>
            `;

            transactionList.appendChild(row);
        });

        transactionList.querySelectorAll(".delete-btn").forEach(function (button) {
            button.addEventListener("click", function () {
                deleteTransaction(Number(button.dataset.id));
            });
        });
    }

    function deleteTransaction(id) {
        const entries = getData(KEYS.entries).filter(e => e.id !== id);
        setData(KEYS.entries, entries);
        renderTransactions();
        updateMoneySummary();
        showToast("Transaction deleted. 🗑️");
    }

    addEntryBtn.addEventListener("click", function () {
        toggleForm(entryForm);
    });

    saveEntryBtn.addEventListener("click", function () {
        const type = document.getElementById("entryType").value;
        const amount = document.getElementById("entryAmount").value;
        const category = document.getElementById("entryCategory").value;
        const description = document.getElementById("entryDescription").value;
        const date = document.getElementById("entryDate").value || todayStr();

        if (amount === "" || Number(amount) <= 0) {
            showToast("Please enter a valid amount.");
            return;
        }

        const entries = getData(KEYS.entries);
        entries.push({
            id: Date.now(),
            type: type,
            amount: Number(amount),
            category: category,
            description: description,
            date: date
        });
        setData(KEYS.entries, entries);

        document.getElementById("entryAmount").value = "";
        document.getElementById("entryDescription").value = "";

        showToast("Entry saved successfully! ✅");
        updateMoneySummary();
        renderTransactions();
        updateOverview();
    });


    // =========================================================
    // HABITS
    // =========================================================

    const addHabitBtn = document.getElementById("addHabitBtn");
    const habitForm = document.getElementById("habitForm");
    const saveHabitBtn = document.getElementById("saveHabitBtn");
    const habitList = document.getElementById("habitList");

    function computeStreak(completedDates) {
        const dateSet = new Set(completedDates);
        let streak = 0;
        let cursor = new Date();

        // If not done today yet, streak counts consecutive PRIOR days.
        if (!dateSet.has(todayStr())) {
            cursor.setDate(cursor.getDate() - 1);
        }

        while (true) {
            const y = cursor.getFullYear();
            const m = String(cursor.getMonth() + 1).padStart(2, "0");
            const d = String(cursor.getDate()).padStart(2, "0");
            const key = `${y}-${m}-${d}`;

            if (dateSet.has(key)) {
                streak++;
                cursor.setDate(cursor.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    function renderHabits() {
        const habits = getData(KEYS.habits);
        habitList.innerHTML = "";

        if (habits.length === 0) {
            habitList.innerHTML = `<p class="empty-message">No habits yet. Add one to start building your streak.</p>`;
            return;
        }

        const today = todayStr();

        habits.forEach(function (habit) {
            const doneToday = habit.completedDates.includes(today);
            const streak = computeStreak(habit.completedDates);

            const row = document.createElement("div");
            row.classList.add("habit-row");

            row.innerHTML = `
                <label class="habit-check">
                    <input type="checkbox" data-id="${habit.id}" ${doneToday ? "checked" : ""}>
                    <span class="habit-name ${doneToday ? "done" : ""}">${habit.name}</span>
                </label>
                <span class="streak">🔥 ${streak}</span>
                <button class="delete-btn" data-id="${habit.id}">Delete</button>
            `;

            habitList.appendChild(row);
        });

        habitList.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
            box.addEventListener("change", function () {
                toggleHabitToday(Number(box.dataset.id));
            });
        });

        habitList.querySelectorAll(".delete-btn").forEach(function (button) {
            button.addEventListener("click", function () {
                deleteHabit(Number(button.dataset.id));
            });
        });
    }

    function toggleHabitToday(id) {
        const habits = getData(KEYS.habits);
        const habit = habits.find(h => h.id === id);
        if (!habit) return;

        const today = todayStr();
        const idx = habit.completedDates.indexOf(today);

        if (idx === -1) {
            habit.completedDates.push(today);
        } else {
            habit.completedDates.splice(idx, 1);
        }

        setData(KEYS.habits, habits);
        renderHabits();
        updateOverview();
    }

    function deleteHabit(id) {
        const habits = getData(KEYS.habits).filter(h => h.id !== id);
        setData(KEYS.habits, habits);
        renderHabits();
        updateOverview();
        showToast("Habit deleted. 🗑️");
    }

    addHabitBtn.addEventListener("click", function () {
        toggleForm(habitForm);
    });

    saveHabitBtn.addEventListener("click", function () {
        const nameInput = document.getElementById("habitName");
        const name = nameInput.value.trim();

        if (name === "") {
            showToast("Please enter a habit name.");
            return;
        }

        const habits = getData(KEYS.habits);
        habits.push({
            id: Date.now(),
            name: name,
            completedDates: []
        });
        setData(KEYS.habits, habits);

        nameInput.value = "";
        showToast("Habit added! ✅");
        renderHabits();
        updateOverview();
    });


    // =========================================================
    // GOALS
    // =========================================================

    const addGoalBtn = document.getElementById("addGoalBtn");
    const goalForm = document.getElementById("goalForm");
    const saveGoalBtn = document.getElementById("saveGoalBtn");
    const goalList = document.getElementById("goalList");

    function renderGoals() {
        const goals = getData(KEYS.goals);
        goalList.innerHTML = "";

        if (goals.length === 0) {
            goalList.innerHTML = `<p class="empty-message">No goals yet. Set one to start saving toward it.</p>`;
            return;
        }

        goals.forEach(function (goal) {
            const pct = goal.target > 0
                ? Math.min(100, Math.round((goal.current / goal.target) * 100))
                : 0;
            const complete = pct >= 100;

            const card = document.createElement("div");
            card.classList.add("goal-card");

            card.innerHTML = `
                <div class="goal-top">
                    <h3>${goal.name}</h3>
                    <span class="goal-amounts">${formatPeso(goal.current)} / ${formatPeso(goal.target)}</span>
                </div>
                <div class="goal-bar-track">
                    <div class="goal-bar-fill ${complete ? "complete" : ""}" style="width:${pct}%"></div>
                </div>
                <div class="goal-meta">
                    <span class="goal-deadline">${goal.deadline ? "Due " + goal.deadline : "No deadline"} • ${pct}%${complete ? " • Reached! 🎉" : ""}</span>
                    <div class="goal-actions">
                        <input type="number" class="goal-fund-input" data-id="${goal.id}" placeholder="Amount" min="0" step="0.01">
                        <button class="fund-btn" data-id="${goal.id}">Add funds</button>
                        <button class="delete-btn" data-id="${goal.id}">Delete</button>
                    </div>
                </div>
            `;

            goalList.appendChild(card);
        });

        goalList.querySelectorAll(".fund-btn").forEach(function (button) {
            button.addEventListener("click", function () {
                const id = Number(button.dataset.id);
                const input = goalList.querySelector(`.goal-fund-input[data-id="${id}"]`);
                const amount = Number(input.value);

                if (!amount || amount <= 0) {
                    showToast("Enter a valid amount to add.");
                    return;
                }

                addFundsToGoal(id, amount);
            });
        });

        goalList.querySelectorAll(".delete-btn").forEach(function (button) {
            button.addEventListener("click", function () {
                deleteGoal(Number(button.dataset.id));
            });
        });
    }

    function addFundsToGoal(id, amount) {
        const goals = getData(KEYS.goals);
        const goal = goals.find(g => g.id === id);
        if (!goal) return;

        goal.current += amount;
        setData(KEYS.goals, goals);
        showToast(`Added ${formatPeso(amount)} to "${goal.name}". 🎯`);
        renderGoals();
        updateOverview();
    }

    function deleteGoal(id) {
        const goals = getData(KEYS.goals).filter(g => g.id !== id);
        setData(KEYS.goals, goals);
        renderGoals();
        updateOverview();
        showToast("Goal deleted. 🗑️");
    }

    addGoalBtn.addEventListener("click", function () {
        toggleForm(goalForm);
    });

    saveGoalBtn.addEventListener("click", function () {
        const nameInput = document.getElementById("goalName");
        const targetInput = document.getElementById("goalTarget");
        const deadlineInput = document.getElementById("goalDeadline");

        const name = nameInput.value.trim();
        const target = Number(targetInput.value);

        if (name === "" || !target || target <= 0) {
            showToast("Please enter a goal name and a valid target amount.");
            return;
        }

        const goals = getData(KEYS.goals);
        goals.push({
            id: Date.now(),
            name: name,
            target: target,
            current: 0,
            deadline: deadlineInput.value || ""
        });
        setData(KEYS.goals, goals);

        nameInput.value = "";
        targetInput.value = "";
        deadlineInput.value = "";

        showToast("Goal added! 🎯");
        renderGoals();
        updateOverview();
    });


    // =========================================================
    // TASKS
    // =========================================================

    const addTaskBtn = document.getElementById("addTaskBtn");
    const taskForm = document.getElementById("taskForm");
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    const taskList = document.getElementById("taskList");

    function renderTasks() {
        const tasks = getData(KEYS.tasks);
        taskList.innerHTML = "";

        if (tasks.length === 0) {
            taskList.innerHTML = `<p class="empty-message">No tasks yet. Add one to get organized.</p>`;
            return;
        }

        // Incomplete first, newest first within each group
        const sorted = tasks.slice().sort(function (a, b) {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return b.id - a.id;
        });

        sorted.forEach(function (task) {
            const row = document.createElement("div");
            row.classList.add("task-row");

            row.innerHTML = `
                <label class="task-check">
                    <input type="checkbox" data-id="${task.id}" ${task.done ? "checked" : ""}>
                    <span class="task-text-wrap">
                        <span class="task-text ${task.done ? "done" : ""}">${task.text}</span>
                        ${task.due ? `<span class="task-due">Due ${task.due}</span>` : ""}
                    </span>
                </label>
                <button class="delete-btn" data-id="${task.id}">Delete</button>
            `;

            taskList.appendChild(row);
        });

        taskList.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
            box.addEventListener("change", function () {
                toggleTaskDone(Number(box.dataset.id));
            });
        });

        taskList.querySelectorAll(".delete-btn").forEach(function (button) {
            button.addEventListener("click", function () {
                deleteTask(Number(button.dataset.id));
            });
        });
    }

    function toggleTaskDone(id) {
        const tasks = getData(KEYS.tasks);
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        task.done = !task.done;
        setData(KEYS.tasks, tasks);
        renderTasks();
        updateOverview();
    }

    function deleteTask(id) {
        const tasks = getData(KEYS.tasks).filter(t => t.id !== id);
        setData(KEYS.tasks, tasks);
        renderTasks();
        updateOverview();
        showToast("Task deleted. 🗑️");
    }

    addTaskBtn.addEventListener("click", function () {
        toggleForm(taskForm);
    });

    saveTaskBtn.addEventListener("click", function () {
        const textInput = document.getElementById("taskText");
        const dueInput = document.getElementById("taskDue");

        const text = textInput.value.trim();

        if (text === "") {
            showToast("Please enter a task.");
            return;
        }

        const tasks = getData(KEYS.tasks);
        tasks.push({
            id: Date.now(),
            text: text,
            done: false,
            due: dueInput.value || ""
        });
        setData(KEYS.tasks, tasks);

        textInput.value = "";
        dueInput.value = "";

        showToast("Task added! ✅");
        renderTasks();
        updateOverview();
    });


    // =========================================================
    // OVERVIEW SUMMARY
    // =========================================================

    function updateOverview() {
        updateMoneySummary();

        const habits = getData(KEYS.habits);
        const today = todayStr();
        const doneToday = habits.filter(h => h.completedDates.includes(today)).length;
        document.getElementById("habitsSummary").textContent = `${doneToday} / ${habits.length}`;

        const goals = getData(KEYS.goals);
        document.getElementById("goalsSummary").textContent = goals.length;

        const tasks = getData(KEYS.tasks);
        const doneTasks = tasks.filter(t => t.done).length;
        document.getElementById("tasksSummary").textContent = `${doneTasks} / ${tasks.length}`;
    }


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    renderTransactions();
    renderHabits();
    renderGoals();
    renderTasks();
    updateOverview();

});
