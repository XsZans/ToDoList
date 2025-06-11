document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const taskDate = document.getElementById('taskDate');
    const taskTime = document.getElementById('taskTime');
    const taskPriority = document.getElementById('taskPriority');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const currentDateElement = document.getElementById('currentDate');
    const totalTasksElement = document.getElementById('totalTasks');
    const completedTasksElement = document.getElementById('completedTasks');
    const pendingTasksElement = document.getElementById('pendingTasks');
    const datePicker = document.getElementById('datePicker');
    const notificationBell = document.getElementById('notificationBell');
    const notificationBadge = document.getElementById('notificationBadge');

    // Edit Modal Elements
    const editTaskModal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    const editTaskInput = document.getElementById('editTaskInput');
    const editTaskDate = document.getElementById('editTaskDate');
    const editTaskTime = document.getElementById('editTaskTime');
    const editTaskPriority = document.getElementById('editTaskPriority');
    const editTaskId = document.getElementById('editTaskId');
    const saveEditBtn = document.getElementById('saveEditBtn');

    // Initialize date pickers
    const datePickerInstance = flatpickr("#datePicker", {
        dateFormat: "Y-m-d",
        defaultDate: "today",
        onChange: function (selectedDates, dateStr) {
            currentDate = dateStr;
            updateCurrentDateDisplay();
            renderTasks();
            updateNotificationBadge();
        }
    });

    const taskDateInstance = flatpickr("#taskDate", {
        dateFormat: "Y-m-d",
        minDate: "today"
    });

    const taskTimeInstance = flatpickr("#taskTime", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        defaultHour: 12,
        defaultMinute: 0
    });

    const editTaskDateInstance = flatpickr("#editTaskDate", {
        dateFormat: "Y-m-d"
    });

    const editTaskTimeInstance = flatpickr("#editTaskTime", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K"
    });

    // Current date
    let currentDate = new Date().toISOString().split('T')[0];
    updateCurrentDateDisplay();

    // Tasks array
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Initialize the app
    renderTasks();
    updateStats();
    updateNotificationBadge();
    showDailyReminder();

    // Event Listeners
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') addTask();
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            renderTasks();
        });
    });

    saveEditBtn.addEventListener('click', saveEditedTask);

    // Notification bell click event
    notificationBell.addEventListener('click', function () {
        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = tasks.filter(task => task.date === today && !task.completed);

        if (todaysTasks.length > 0) {
            const taskList = todaysTasks.map(task => {
                let taskInfo = `• ${task.text}`;
                if (task.time) taskInfo += ` (${task.time})`;
                return taskInfo;
            }).join('<br>');

            Swal.fire({
                title: `Today's Tasks (${todaysTasks.length})`,
                html: taskList,
                icon: 'info',
                confirmButtonText: 'Got it!',
                footer: 'Complete your tasks to keep your productivity high!'
            });
        } else {
            Swal.fire({
                title: 'No Tasks Today',
                text: 'You have no pending tasks for today.',
                icon: 'info',
                confirmButtonText: 'Okay'
            });
        }
    });

    // Functions
    function updateCurrentDateDisplay() {
        const dateObj = new Date(currentDate);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = dateObj.toLocaleDateString('en-US', options);
    }

    function updateNotificationBadge() {
        const today = new Date().toISOString().split('T')[0];
        const todaysTasksCount = tasks.filter(task =>
            task.date === today && !task.completed
        ).length;

        notificationBadge.textContent = todaysTasksCount;
        notificationBadge.style.display = todaysTasksCount > 0 ? 'flex' : 'none';
    }

    function addTask() {
        const taskText = taskInput.value.trim();
        const taskDueDate = taskDateInstance.input.value || currentDate;
        const taskDueTime = taskTimeInstance.input.value || "11:59 PM";
        const priority = taskPriority.value;

        if (taskText) {
            const newTask = {
                id: Date.now(),
                text: taskText,
                completed: false,
                date: taskDueDate,
                time: taskDueTime,
                priority: priority,
                createdAt: new Date().toISOString()
            };

            tasks.push(newTask);
            saveTasks();
            renderTasks();
            updateStats();
            updateNotificationBadge();

            // Reset input
            taskInput.value = '';
            taskDateInstance.clear();
            taskTimeInstance.clear();
            taskInput.focus();

            // Show success notification
            Swal.fire({
                icon: 'success',
                title: 'Task Added',
                text: 'Your new task has been added successfully!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        } else {
            // Show error notification
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Task text cannot be empty!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }
    }

    function renderTasks() {
        // Get active filter
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        // Filter tasks based on active filter
        let filteredTasks = [...tasks];

        if (activeFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        } else if (activeFilter === 'pending') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (activeFilter === 'today') {
            filteredTasks = tasks.filter(task => task.date === currentDate);
        } else if (activeFilter === 'overdue') {
            const today = new Date(currentDate);
            filteredTasks = tasks.filter(task =>
                !task.completed && new Date(task.date) < today && task.date !== currentDate
            );
        }

        // Sort tasks: high priority first, then overdue, then by date, then by time, then by creation time
        filteredTasks.sort((a, b) => {
            // Priority sorting (high > medium > low)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }

            // Overdue tasks first
            const aIsOverdue = !a.completed && new Date(a.date) < new Date(currentDate) && a.date !== currentDate;
            const bIsOverdue = !b.completed && new Date(b.date) < new Date(currentDate) && b.date !== currentDate;

            if (aIsOverdue && !bIsOverdue) return -1;
            if (!aIsOverdue && bIsOverdue) return 1;

            // Then sort by date
            if (a.date < b.date) return -1;
            if (a.date > b.date) return 1;

            // Then sort by time
            const timeToMinutes = (timeStr) => {
                if (!timeStr) return 1440; // Default to end of day if no time
                const [time, period] = timeStr.split(' ');
                const [hours, minutes] = time.split(':').map(Number);
                let total = hours % 12 * 60 + minutes;
                if (period === 'PM') total += 720; // Add 12 hours in minutes
                return total;
            };

            const aTime = timeToMinutes(a.time);
            const bTime = timeToMinutes(b.time);
            if (aTime < bTime) return -1;
            if (aTime > bTime) return 1;

            // Then sort by creation time (newest first)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Render tasks
        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                        <div class="empty-state">
                            <i class="far fa-smile"></i>
                            <h4>No tasks found</h4>
                            <p>Try changing your filters or add a new task</p>
                        </div>
                    `;
        } else {
            taskList.innerHTML = '';

            filteredTasks.forEach(task => {
                const taskDateObj = new Date(task.date);
                const today = new Date(currentDate);

                const isOverdue = !task.completed && taskDateObj < today && task.date !== currentDate;
                const isToday = task.date === currentDate;

                const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
                let formattedDate = isToday ? 'Today' : taskDateObj.toLocaleDateString('en-US', dateOptions);

                if (isOverdue) {
                    formattedDate = 'Overdue';
                }

                // Format date and time display
                let dateTimeDisplay = formattedDate;
                if (task.time) {
                    dateTimeDisplay += `, ${task.time}`;
                }

                const taskItem = document.createElement('li');
                taskItem.className = `task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} ${isToday ? 'today' : ''}`;
                taskItem.dataset.id = task.id;

                taskItem.innerHTML = `
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                            <span class="priority-indicator priority-${task.priority}"></span>
                            <p class="task-text">${task.text}</p>
                            <span class="task-date">${dateTimeDisplay}</span>
                            <div class="task-actions">
                                <button class="task-btn edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="task-btn delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        `;

                taskList.appendChild(taskItem);

                // Add event listeners to the new task
                const checkbox = taskItem.querySelector('.task-checkbox');
                const editBtn = taskItem.querySelector('.edit-btn');
                const deleteBtn = taskItem.querySelector('.delete-btn');

                checkbox.addEventListener('change', toggleTaskStatus);
                editBtn.addEventListener('click', openEditModal);
                deleteBtn.addEventListener('click', () => deleteTask(task.id));
            });
        }
    }

    function toggleTaskStatus(e) {
        const taskId = parseInt(e.target.closest('.task-item').dataset.id);
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex !== -1) {
            tasks[taskIndex].completed = e.target.checked;
            saveTasks();
            renderTasks();
            updateStats();
            updateNotificationBadge();

            // Show notification
            const status = e.target.checked ? 'completed' : 'marked as pending';
            Swal.fire({
                icon: 'success',
                title: 'Task Updated',
                text: `Task has been ${status}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }
    }

    function openEditModal(e) {
        const taskId = parseInt(e.target.closest('.task-item').dataset.id);
        const task = tasks.find(task => task.id === taskId);

        if (task) {
            editTaskInput.value = task.text;
            editTaskDateInstance.setDate(task.date);
            editTaskTimeInstance.setDate(`1970-01-01 ${task.time}`); // Using a dummy date with the time
            editTaskPriority.value = task.priority;
            editTaskId.value = taskId;
            editTaskModal.show();
        }
    }

    function saveEditedTask() {
        const taskId = parseInt(editTaskId.value);
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        const newText = editTaskInput.value.trim();

        if (taskIndex !== -1 && newText) {
            tasks[taskIndex].text = newText;
            tasks[taskIndex].date = editTaskDateInstance.input.value;
            tasks[taskIndex].time = editTaskTimeInstance.input.value;
            tasks[taskIndex].priority = editTaskPriority.value;
            saveTasks();
            renderTasks();
            updateNotificationBadge();
            editTaskModal.hide();

            // Show success notification
            Swal.fire({
                icon: 'success',
                title: 'Task Updated',
                text: 'Your task has been updated successfully!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        } else if (!newText) {
            // Show error notification
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Task text cannot be empty!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }
    }

    function deleteTask(taskId) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                tasks = tasks.filter(task => task.id !== taskId);
                saveTasks();
                renderTasks();
                updateStats();
                updateNotificationBadge();

                Swal.fire(
                    'Deleted!',
                    'Your task has been deleted.',
                    'success'
                );
            }
        });
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;

        totalTasksElement.textContent = total;
        completedTasksElement.textContent = completed;
        pendingTasksElement.textContent = pending;
    }

    function showDailyReminder() {
        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = tasks.filter(task => task.date === today && !task.completed);

        if (todaysTasks.length > 0) {
            const taskList = todaysTasks.map(task => {
                let taskInfo = `• ${task.text}`;
                if (task.time) taskInfo += ` (${task.time})`;
                return taskInfo;
            }).join('<br>');

            Swal.fire({
                title: `You have ${todaysTasks.length} task(s) today!`,
                html: taskList,
                icon: 'info',
                confirmButtonText: 'Got it!',
                footer: 'Complete your tasks to keep your productivity high!'
            });
        }
    }

    function checkOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        const overdueTasks = tasks.filter(task =>
            !task.completed && new Date(task.date) < new Date(today) && task.date !== today
        );

        if (overdueTasks.length > 0) {
            const taskList = overdueTasks.map(task => {
                let taskInfo = `• ${task.text} (due ${task.date})`;
                if (task.time) taskInfo += ` at ${task.time}`;
                return taskInfo;
            }).join('<br>');

            Swal.fire({
                title: `You have ${overdueTasks.length} overdue task(s)!`,
                html: taskList,
                icon: 'warning',
                confirmButtonText: 'I\'ll take care of them',
                footer: 'Don\'t let tasks pile up!'
            });
        }
    }

    // Run overdue check
    checkOverdueTasks();
});