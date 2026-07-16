(function(){
  const STORAGE_KEY = 'preflight-todos';
  let tasks = [];
  let filter = 'all';
  let selectedPriority = 'mid';

  const newTask = document.getElementById('newTask');
  const newDue = document.getElementById('newDue');
  const addBtn = document.getElementById('addBtn');
  const flagSelect = document.getElementById('flagSelect');
  const list = document.getElementById('list');
  const emptyState = document.getElementById('emptyState');
  const runwayTrack = document.getElementById('runwayTrack');
  const runwayCount = document.getElementById('runwayCount');
  const tabs = document.querySelectorAll('.tab');
  const clock = document.getElementById('clock');

  function uid(){ return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  function todayStr(){
    const d = new Date();
    return d.toISOString().slice(0,10);
  }

  function fmtDue(dateStr){
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function isOverdue(dateStr, done){
    if (!dateStr || done) return false;
    return dateStr < todayStr();
  }

  async function loadTasks(){
    try {
      const res = await window.storage.get(STORAGE_KEY, false);
      if (res && res.value) tasks = JSON.parse(res.value);
    } catch(e) {
      tasks = [];
    }
    render();
  }

  async function persist(){
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(tasks), false);
    } catch(e) {
      console.error('Could not save checklist', e);
    }
  }

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function render(){
    const total = tasks.length;
    const doneCount = tasks.filter(t => t.done).length;
    runwayCount.textContent = doneCount + ' / ' + total + ' complete';

    const segCount = 24;
    const filledSegs = total === 0 ? 0 : Math.round((doneCount / total) * segCount);
    runwayTrack.innerHTML = '';
    for (let i=0;i<segCount;i++){
      const seg = document.createElement('div');
      seg.className = 'runway-seg' + (i < filledSegs ? ' filled' : '');
      runwayTrack.appendChild(seg);
    }

    let visible = tasks;
    if (filter === 'active') visible = tasks.filter(t => !t.done);
    if (filter === 'done') visible = tasks.filter(t => t.done);

    visible = visible.slice().sort((a,b) => a.done === b.done ? b.createdAt - a.createdAt : (a.done ? 1 : -1));

    list.innerHTML = visible.map((t, i) => rowHtml(t, i+1)).join('');
    emptyState.style.display = visible.length === 0 ? 'block' : 'none';

    attachHandlers();
  }

  function rowHtml(t, idx){
    const overdue = isOverdue(t.due, t.done);
    return `
    <div class="row ${t.done ? 'done' : ''}" data-id="${t.id}">
      <span class="idx">${String(idx).padStart(3,'0')}</span>
      <div class="switch ${t.done ? 'on' : ''}" data-action="toggle" role="checkbox" aria-checked="${t.done}" tabindex="0">
        <div class="knob"></div>
      </div>
      <div class="row-body">
        <div class="row-text">${escapeHtml(t.text)}</div>
        <div class="row-meta">
          <span class="flag-dot ${t.priority}"></span>
          ${t.due ? `<span class="due-badge ${overdue ? 'overdue' : ''}">${overdue ? 'overdue · ' : ''}${fmtDue(t.due)}</span>` : ''}
        </div>
      </div>
      <button class="del-btn" data-action="delete" title="Remove">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>`;
  }

  function attachHandlers(){
    document.querySelectorAll('.row').forEach(row => {
      const id = row.dataset.id;
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const toggle = () => {
        task.done = !task.done;
        persist(); render();
      };
      const sw = row.querySelector('[data-action="toggle"]');
      sw.addEventListener('click', toggle);
      sw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== id);
        persist(); render();
      });
    });
  }

  flagSelect.querySelectorAll('.flag-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      selectedPriority = opt.dataset.p;
      flagSelect.querySelectorAll('.flag-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  function addTask(){
    const text = newTask.value.trim();
    if (!text) return;
    tasks.push({
      id: uid(),
      text: text,
      priority: selectedPriority,
      due: newDue.value || null,
      done: false,
      createdAt: Date.now()
    });
    persist();
    newTask.value = '';
    newDue.value = '';
    newTask.focus();
    render();
  }

  addBtn.addEventListener('click', addTask);
  newTask.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filter = tab.dataset.filter;
      render();
    });
  });

  function updateClock(){
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    clock.textContent = hh + ':' + mm + ' LCL';
  }
  updateClock();
  setInterval(updateClock, 15000);

  loadTasks();
})();