(function () {
  const STORAGE_KEY = 'taskly.tasks.v1';
  const THEME_KEY = 'taskly.theme.v1';

  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const priorityInput = document.getElementById('priority-input');
  const dueInput = document.getElementById('due-input');
  const errorMsg = document.getElementById('error-msg');
  const list = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const emptyText = document.getElementById('empty-text');
  const filtersWrap = document.getElementById('filters');
  const statTotal = document.getElementById('stat-total');
  const statPending = document.getElementById('stat-pending');
  const statDone = document.getElementById('stat-done');
  const themeToggle = document.getElementById('theme-toggle');

  let tasks = [];
  let currentFilter = 'all';
  let editingId = null;

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Could not load tasks from localStorage:', e);
      tasks = [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Could not save tasks to localStorage:', e);
    }
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️ Light';
      }
    } catch (e) { /* ignore */ }
  }

  themeToggle.addEventListener('click', function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.textContent = '🌙 Dark';
      try { localStorage.setItem(THEME_KEY, 'light'); } catch (e) {}
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.textContent = '☀️ Light';
      try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
    }
  });

  function uid() {
    return 't' + Date.now() + Math.random().toString(16).slice(2);
  }

  function formatDue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    let visible = tasks;
    if (currentFilter === 'active') visible = tasks.filter(t => !t.done);
    if (currentFilter === 'completed') visible = tasks.filter(t => t.done);

    list.innerHTML = '';

    if (visible.length === 0) {
      emptyState.style.display = 'block';
      if (tasks.length === 0) {
        emptyText.textContent = 'Nothing here yet — add your first task above.';
      } else if (currentFilter === 'active') {
        emptyText.textContent = 'No active tasks — nice work!';
      } else {
        emptyText.textContent = 'No completed tasks yet.';
      }
    } else {
      emptyState.style.display = 'none';
    }

    visible.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');
      li.dataset.id = task.id;

      if (editingId === task.id) {
        li.innerHTML = `
          <div class="task-body" style="width:100%;">
            <div class="edit-row">
              <input type="text" class="edit-input" value="${escapeHtml(task.title)}" maxlength="120">
              <button type="button" class="save">Save</button>
              <button type="button" class="cancel">Cancel</button>
            </div>
          </div>
        `;
      } else {
        li.innerHTML = `
          <button class="check" aria-label="Toggle complete" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
          <div class="task-body">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">
              <span class="badge ${task.priority}">${task.priority}</span>
              ${task.due ? `<span class="due">Due ${formatDue(task.due)}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="icon-btn edit" aria-label="Edit task" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
            </button>
            <button class="icon-btn del" aria-label="Delete task" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
            </button>
          </div>
        `;
      }
      list.appendChild(li);
    });

    statTotal.textContent = tasks.length;
    statPending.textContent = tasks.filter(t => !t.done).length;
    statDone.textContent = tasks.filter(t => t.done).length;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const title = input.value.trim();

    if (!title) {
      errorMsg.textContent = 'Give your task a name before adding it.';
      input.focus();
      return;
    }
    if (title.length < 2) {
      errorMsg.textContent = 'Task name is too short.';
      return;
    }

    errorMsg.textContent = '';
    tasks.unshift({
      id: uid(),
      title: title,
      priority: priorityInput.value,
      due: dueInput.value || '',
      done: false,
      createdAt: Date.now()
    });
    saveTasks();
    input.value = '';
    dueInput.value = '';
    priorityInput.value = 'medium';
    input.focus();
    render();
  });

  input.addEventListener('input', function () {
    if (errorMsg.textContent) errorMsg.textContent = '';
  });

  list.addEventListener('click', function (e) {
    const li = e.target.closest('.task');
    if (!li) return;
    const id = li.dataset.id;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (e.target.closest('.check')) {
      task.done = !task.done;
      saveTasks();
      render();
    } else if (e.target.closest('.edit')) {
      editingId = id;
      render();
      const editInput = li.parentElement ? null : null;
      const newLi = list.querySelector(`.task[data-id="${id}"]`);
      const ei = document.querySelector(`.task[data-id="${id}"] .edit-input`);
      if (ei) { ei.focus(); ei.select(); }
    } else if (e.target.closest('.del')) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    } else if (e.target.closest('.save')) {
      const ei = li.querySelector('.edit-input');
      const newTitle = ei.value.trim();
      if (newTitle.length >= 2) {
        task.title = newTitle;
        saveTasks();
      }
      editingId = null;
      render();
    } else if (e.target.closest('.cancel')) {
      editingId = null;
      render();
    }
  });

  list.addEventListener('keydown', function (e) {
    if (e.target.classList.contains('edit-input') && e.key === 'Enter') {
      e.preventDefault();
      const saveBtn = e.target.closest('.edit-row').querySelector('.save');
      if (saveBtn) saveBtn.click();
    }
    if (e.target.classList.contains('edit-input') && e.key === 'Escape') {
      editingId = null;
      render();
    }
  });

  filtersWrap.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    [...filtersWrap.children].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });

  loadTheme();
  loadTasks();
  render();
})();
