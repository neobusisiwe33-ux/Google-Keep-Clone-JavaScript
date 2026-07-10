// Google Keep Clone

let notes = [];
let labels = [];
let currentView = 'notes';
let editingNoteId = null;
let lastDeletedNote = null;
let currentNoteColor = 'default';

//  Browser storage
if (localStorage.getItem('keepNotes')) {
    notes = JSON.parse(localStorage.getItem('keepNotes'));
}
if (localStorage.getItem('keepLabels')) {
    labels = JSON.parse(localStorage.getItem('keepLabels'));
}

// GET HTML ELEMENTS

const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const addNoteBtn = document.getElementById('add-note-btn');
const notesContainer = document.getElementById('notes-container');
const pinnedNotesContainer = document.getElementById('pinned-notes-container');
const emptyState = document.getElementById('empty-state');
const emptyMessage = document.getElementById('empty-message');
const searchInput = document.getElementById('search-input');
const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
const editModal = document.getElementById('edit-modal');
const editNoteTitle = document.getElementById('edit-note-title');
const editNoteContent = document.getElementById('edit-note-content');
const modalClose = document.querySelector('.modal-close');
const modalDate = document.getElementById('modal-date');
const colorModal = document.getElementById('color-modal');
const colorModalClose = document.querySelector('.color-modal-close');
const labelModal = document.getElementById('label-modal');
const labelModalClose = document.querySelector('.label-modal-close');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastUndo = document.getElementById('toast-undo');
const noteInputContainer = document.getElementById('note-input-container');
const noteActions = document.querySelector('.note-actions');
const labelsList = document.getElementById('labels-list');
const labelCheckboxes = document.getElementById('label-checkboxes');
const newLabelInput = document.getElementById('new-label-input');
const createLabelBtn = document.getElementById('create-label-btn');
const sectionTitle = document.getElementById('section-title');


// HELPER FUNCTIONS

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

function showToast(message, showUndo = false) {
    toastMessage.textContent = message;
    toastUndo.style.display = showUndo ? 'inline' : 'none';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function saveNotes() {
    localStorage.setItem('keepNotes', JSON.stringify(notes));
}

function saveLabels() {
    localStorage.setItem('keepLabels', JSON.stringify(labels));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// NOTE FUNCTIONS

function createNote(title, content, color = 'default') {
    const note = {
        id: generateId(),
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        trashed: false,
        pinned: false,
        color: color,
        labels: []
    };

    notes.unshift(note);
    saveNotes();
    return note;
}

function updateNote(id, title, content) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.title = title.trim();
        note.content = content.trim();
        note.updatedAt = new Date().toISOString();
        saveNotes();
    }
}

function togglePin(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.pinned = !note.pinned;
        note.updatedAt = new Date().toISOString();
        saveNotes();
        showToast(note.pinned ? 'Note pinned' : 'Note unpinned');
        renderNotes();
    }
}

function toggleArchive(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.archived = !note.archived;
        note.pinned = false;
        note.updatedAt = new Date().toISOString();
        saveNotes();
        showToast(note.archived ? 'Note archived' : 'Note unarchived');
        renderNotes();
    }
}

function toggleTrash(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        if (note.trashed) {
            note.trashed = false;
            showToast('Note restored');
        } else {
            note.trashed = true;
            note.pinned = false;
            lastDeletedNote = JSON.parse(JSON.stringify(note));
            showToast('Note deleted', true);
        }
        note.updatedAt = new Date().toISOString();
        saveNotes();
        renderNotes();
    }
}

function deleteNotePermanently(id) {
    notes = notes.filter(n => n.id !== id);
    saveNotes();
    renderNotes();
}

function setNoteColor(id, color) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.color = color;
        note.updatedAt = new Date().toISOString();
        saveNotes();
        renderNotes();
    }
}

function undoDelete() {
    if (lastDeletedNote) {
        const note = notes.find(n => n.id === lastDeletedNote.id);
        if (note) {
            note.trashed = false;
        } else {
            notes.unshift(lastDeletedNote);
        }
        lastDeletedNote = null;
        saveNotes();
        renderNotes();
        showToast('Note restored');
    }
}

// LABEL FUNCTIONS

function createLabel(name) {
    const label = {
        id: generateId(),
        name: name.trim()
    };
    labels.push(label);
    saveLabels();
    renderLabels();
    return label;
}

function deleteLabel(id) {
    labels = labels.filter(l => l.id !== id);
    notes.forEach(note => {
        note.labels = note.labels.filter(l => l !== id);
    });
    saveLabels();
    saveNotes();
    renderLabels();
    renderNotes();
}

function toggleNoteLabel(noteId, labelId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        const index = note.labels.indexOf(labelId);
        if (index > -1) {
            note.labels.splice(index, 1);
        } else {
            note.labels.push(labelId);
        }
        note.updatedAt = new Date().toISOString();
        saveNotes();
        renderNotes();
    }
}

// DISPLAY FUNCTIONS

function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note.id;
    card.dataset.color = note.color;
    if (note.pinned) card.classList.add('pinned');

    let titleHtml = note.title ? `<h3 class="note-title">${escapeHtml(note.title)}</h3>` : '';
    let contentHtml = note.content ? `<p class="note-content">${escapeHtml(note.content)}</p>` : '';

    let labelsHtml = '';
    if (note.labels.length > 0) {
        labelsHtml = '<div class="note-labels">';
        note.labels.forEach(labelId => {
            const label = labels.find(l => l.id === labelId);
            if (label) {
                labelsHtml += `<span class="note-label">${escapeHtml(label.name)}</span>`;
            }
        });
        labelsHtml += '</div>';
    }

    card.innerHTML =
        titleHtml +
        contentHtml +
        labelsHtml +
        `<p class="note-date">${formatDate(note.updatedAt)}</p>` +
        '<div class="note-actions-menu">' +
        '<button class="btn-icon pin" data-tooltip="Pin note"><span class="material-icons">push_pin</span></button>' +
        '<button class="btn-icon archive" data-tooltip="Archive"><span class="material-icons">archive</span></button>' +
        '<button class="btn-icon delete" data-tooltip="Delete"><span class="material-icons">delete</span></button>' +
        '</div>';

    const pinBtn = card.querySelector('.pin');
    const archiveBtn = card.querySelector('.archive');
    const deleteBtn = card.querySelector('.delete');

    pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePin(note.id);
    });

    archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleArchive(note.id);
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTrash(note.id);
    });

    card.addEventListener('click', () => {
        openEditModal(note.id);
    });

    return card;
}

function renderNotes() {
    const searchTerm = searchInput.value.toLowerCase();

    let filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm);

        if (currentView === 'notes') {
            return matchesSearch && !note.archived && !note.trashed;
        } else if (currentView === 'archive') {
            return matchesSearch && note.archived && !note.trashed;
        } else if (currentView === 'trash') {
            return matchesSearch && note.trashed;
        } else if (currentView.startsWith('label:')) {
            const labelId = currentView.split(':')[1];
            return matchesSearch && !note.archived && !note.trashed && note.labels.includes(labelId);
        }
        return matchesSearch && !note.archived && !note.trashed;
    });

    // Separate pinned and unpinned notes
    const pinnedNotes = filteredNotes.filter(n => n.pinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

    // Clear containers
    notesContainer.innerHTML = '';
    pinnedNotesContainer.innerHTML = '';

    // Show/hide pinned section
    if (pinnedNotes.length > 0 && currentView === 'notes') {
        pinnedNotesContainer.classList.remove('hidden');
        pinnedNotesContainer.innerHTML = '<div class="section-label">PINNED</div>';
        pinnedNotes.forEach(note => {
            pinnedNotesContainer.appendChild(createNoteCard(note));
        });
    } else {
        pinnedNotesContainer.classList.add('hidden');
    }

    // Show unpinned notes
    unpinnedNotes.forEach(note => {
        notesContainer.appendChild(createNoteCard(note));
    });

    // Update empty state
    const totalNotes = pinnedNotes.length + unpinnedNotes.length;
    if (totalNotes === 0) {
        emptyState.classList.remove('hidden');
        notesContainer.classList.add('hidden');

        if (searchTerm) {
            emptyMessage.textContent = 'No notes found matching "' + searchTerm + '"';
        } else if (currentView === 'archive') {
            emptyMessage.textContent = 'Your archive is empty';
        } else if (currentView === 'trash') {
            emptyMessage.textContent = 'Trash is empty';
        } else {
            emptyMessage.textContent = 'Notes you add appear here';
        }
    } else {
        emptyState.classList.add('hidden');
        notesContainer.classList.remove('hidden');
    }
}

function renderLabels() {
    labelsList.innerHTML = '';
    labels.forEach(label => {
        const labelItem = document.createElement('div');
        labelItem.className = 'label-item';
        labelItem.innerHTML = `
            <span class="material-icons">label</span>
            <span>${escapeHtml(label.name)}</span>
        `;
        labelItem.addEventListener('click', () => {
            currentView = 'label:' + label.id;
            updateSidebarActive();
            sectionTitle.textContent = label.name;
            renderNotes();
        });
        labelsList.appendChild(labelItem);
    });
}

function updateSidebarActive() {
    sidebarNavItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === currentView ||
            (currentView.startsWith('label:') && item.dataset.view === 'notes')) {
            item.classList.add('active');
        }
    });
}

function renderLabelCheckboxes() {
    labelCheckboxes.innerHTML = '';
    labels.forEach(label => {
        const checkboxItem = document.createElement('label');
        checkboxItem.className = 'label-checkbox-item';

        const isChecked = editingNoteId ?
            notes.find(n => n.id === editingNoteId)?.labels.includes(label.id) : false;

        checkboxItem.innerHTML = `
            <input type="checkbox" value="${label.id}" ${isChecked ? 'checked' : ''}>
            <span>${escapeHtml(label.name)}</span>
        `;

        checkboxItem.querySelector('input').addEventListener('change', (e) => {
            if (editingNoteId) {
                toggleNoteLabel(editingNoteId, label.id);
            }
        });

        labelCheckboxes.appendChild(checkboxItem);
    });
}
// MODAL FUNCTIONS

function openEditModal(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        editingNoteId = id;
        editNoteTitle.value = note.title;
        editNoteContent.value = note.content;
        modalDate.textContent = formatDate(note.updatedAt);

        // Update modal action buttons
        const pinBtn = editModal.querySelector('[data-action="pin"]');
        const archiveBtn = editModal.querySelector('[data-action="archive"]');
        const deleteBtn = editModal.querySelector('[data-action="delete"]');

        pinBtn.querySelector('.material-icons').textContent = note.pinned ? 'push_pin' : 'push_pin';
        archiveBtn.querySelector('.material-icons').textContent = note.archived ? 'unarchive' : 'archive';

        editModal.classList.add('active');
        editNoteTitle.focus();
        renderLabelCheckboxes();
    }
}

function closeEditModal() {
    editModal.classList.remove('active');
    editingNoteId = null;
    editNoteTitle.value = '';
    editNoteContent.value = '';
}

function openColorModal() {
    colorModal.classList.add('active');
}

function closeColorModal() {
    colorModal.classList.remove('active');
}

function openLabelModal() {
    labelModal.classList.add('active');
    renderLabelCheckboxes();
}

function closeLabelModal() {
    labelModal.classList.remove('active');
}

// EVENT LISTENERS


// Note input expansion
noteContentInput.addEventListener('focus', () => {
    noteActions.classList.remove('note-actions-hidden');
    noteContentInput.rows = 3;
});

noteContentInput.addEventListener('blur', () => {
    if (!noteContentInput.value && !noteTitleInput.value) {
        noteActions.classList.add('note-actions-hidden');
        noteContentInput.rows = 1;
    }
});

// Add note
addNoteBtn.addEventListener('click', () => {
    const title = noteTitleInput.value;
    const content = noteContentInput.value;

    if (title.trim() || content.trim()) {
        createNote(title, content, currentNoteColor);
        showToast('Note created');

        noteTitleInput.value = '';
        noteContentInput.value = '';
        noteActions.classList.add('note-actions-hidden');
        noteContentInput.rows = 1;
        currentNoteColor = 'default';

        renderNotes();
    }
});

// Search
searchInput.addEventListener('input', renderNotes);

// Sidebar navigation
sidebarNavItems.forEach(item => {
    item.addEventListener('click', () => {
        currentView = item.dataset.view;
        updateSidebarActive();

        const titles = {
            'notes': 'Notes',
            'reminders': 'Reminders',
            'archive': 'Archive',
            'trash': 'Trash'
        };
        sectionTitle.textContent = titles[currentView] || 'Notes';

        renderNotes();
    });
});

// Modal actions
editModal.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (editingNoteId) {
            switch(action) {
                case 'pin':
                    togglePin(editingNoteId);
                    break;
                case 'archive':
                    toggleArchive(editingNoteId);
                    closeEditModal();
                    break;
                case 'delete':
                    toggleTrash(editingNoteId);
                    closeEditModal();
                    break;
                case 'color':
                    openColorModal();
                    break;
                case 'label':
                    openLabelModal();
                    break;
            }
        }
    });
});

// Color selection
colorModal.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        const color = option.dataset.color;
        if (editingNoteId) {
            setNoteColor(editingNoteId, color);
            closeColorModal();
        }
        currentNoteColor = color;
        closeColorModal();
    });
});

// Create label
createLabelBtn.addEventListener('click', () => {
    const name = newLabelInput.value.trim();
    if (name) {
        createLabel(name);
        newLabelInput.value = '';
        renderLabelCheckboxes();
    }
});

// Note action buttons
document.querySelectorAll('.color-picker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editingNoteId) {
            openColorModal();
        } else {
            openColorModal();
        }
    });
});

// Modal close buttons
modalClose.addEventListener('click', closeEditModal);
colorModalClose.addEventListener('click', closeColorModal);
labelModalClose.addEventListener('click', closeLabelModal);

// Close modals when clicking outside
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
});
colorModal.addEventListener('click', (e) => {
    if (e.target === colorModal) closeColorModal();
});
labelModal.addEventListener('click', (e) => {
    if (e.target === labelModal) closeLabelModal();
});

// Auto-save on edit
editNoteTitle.addEventListener('input', () => {
    if (editingNoteId) {
        updateNote(editingNoteId, editNoteTitle.value, editNoteContent.value);
        renderNotes();
    }
});

editNoteContent.addEventListener('input', () => {
    if (editingNoteId) {
        updateNote(editingNoteId, editNoteTitle.value, editNoteContent.value);
        renderNotes();
    }
});

// Toast undo
toastUndo.addEventListener('click', undoDelete);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditModal();
        closeColorModal();
        closeLabelModal();
    }

    if (e.key === 'Enter' && e.ctrlKey) {
        if (editModal.classList.contains('active')) {
            closeEditModal();
        } else if (document.activeElement === noteContentInput) {
            addNoteBtn.click();
        }
    }
});


function init() {
    renderLabels();
    renderNotes();

    if (notes.length === 0) {
        const sampleNotes = [
            {
                id: generateId(),
                title: 'Welcome to Keep Clone!',
                content: 'This is a Google Keep-inspired note-taking app. You can create, edit, pin, archive, and color-code your notes.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                archived: false,
                trashed: false,
                pinned: true,
                color: 'yellow',
                labels: []
            },
            {
                id: generateId(),
                title: 'Try these features:',
                content: 'Click on a note to edit it\nUse the palette icon to change colors\nPin important notes to the top\nArchive notes you want to keep but hide\nCreate labels to organize your notes',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 86400000).toISOString(),
                archived: false,
                trashed: false,
                pinned: false,
                color: 'blue',
                labels: []
            }
        ];

        notes = sampleNotes;
        saveNotes();
        renderNotes();
    }
}

init();
