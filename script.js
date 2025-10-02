let currentUser = null;
let selectedDate = null;
let selectedTime = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let lastAction = null;
let lastActionTimeout = null;
let notificationStack = [];
let notificationCount = 0;
let currentPage = 1;
const appointmentsPerPage = 10;
let isViewingUpcoming = true;
let currentUserPage = 1;
const userAppointmentsPerPage = 5;

let adminSelectedDate = null;
let adminCurrentMonth = new Date().getMonth();
let adminCurrentYear = new Date().getFullYear();

let users = JSON.parse(localStorage.getItem('users')) || [
    { id: 'admin', name: 'Admin', isAdmin: true }
];
let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
let closedDays = JSON.parse(localStorage.getItem('closedDays')) || [];
let lastClientId = parseInt(localStorage.getItem('lastClientId')) || 0;

function showSection(sectionId) {
    document.querySelectorAll('section').forEach(section => section.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    if (sectionId === 'user-section') {
        loadCalendar();
    } else if (sectionId === 'my-appointments') {
        loadUserAppointments();
    } else if (sectionId === 'admin-section') {
        loadAdminPanel();
    } else if (sectionId === 'work-hours-section') {
        loadWorkHours();
    }
}

function showAdminSection(sectionId) {
    document.querySelectorAll('.admin-subsection').forEach(section => section.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    if (sectionId === 'appointments-list') {
        loadAdminPanel();
    } else if (sectionId === 'stats') {
        loadStats();
    } else if (sectionId === 'closed-days-history') {
        loadClosedDaysHistory();
    } else if (sectionId === 'client-list') {
        loadClientList();
    } else if (sectionId === 'work-hours-section') {
        loadWorkHours();
    }
}

function updateNavButtons() {
    const isLoggedIn = currentUser !== null;
    const isAdmin = isLoggedIn && currentUser.isAdmin;

    document.getElementById('main-nav').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('reserve-button').classList.toggle('hidden', !isLoggedIn || isAdmin);
    document.getElementById('my-appointments-button').classList.toggle('hidden', !isLoggedIn || isAdmin);
    document.getElementById('logout-button').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('work-hours-button').classList.toggle('hidden', !isAdmin);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    document.querySelectorAll('section').forEach(section => section.classList.add('hidden'));
    document.getElementById('auth-section').classList.remove('hidden');
    updateNavButtons();
    showNotification('Sesión cerrada', 'success');
    updateNameHeader();
}

function handleLogout() {
    logout();
    showSection('auth-section');
}

function loadCalendar() {
    const calendarHeader = document.getElementById('calendar-header');
    const calendar = document.getElementById('calendar');
    calendarHeader.innerHTML = '';
    calendar.innerHTML = '';

    document.getElementById('hoyes').textContent = new Date().toLocaleDateString();
    document.getElementById('current-month').textContent = new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long' });
    document.getElementById('current-year').textContent = currentYear;
    document.getElementById('current-year').textContent = currentYear;

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; 
    daysOfWeek.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        calendarHeader.appendChild(dayElement);
    });

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        
        const currentDate = i - startingDay + 1;
        if (currentDate > 0 && currentDate <= daysInMonth) {
            dayElement.textContent = currentDate;
            const date = new Date(currentYear, currentMonth, currentDate);
            const dayOfWeek = date.getDay();
            const isOpen = dayOfWeek >= 1 && dayOfWeek <= 6; // Lunes a Sábado
            const isClosed = closedDays.includes(date.toISOString().split('T')[0]);
            const isPast = date < today;

            // Añadir esta condición para marcar el día actual
            if (date.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }

            if (!isOpen || isClosed) {
                dayElement.classList.add('closed');
                dayElement.title = 'Cerrado';
            } else if (isPast) {
                dayElement.classList.add('past');
            } else {
                dayElement.addEventListener('click', () => selectDate(date));
            }

            if (isPast) {
                dayElement.classList.add('past');
            }

            if (date.toDateString() === selectedDate?.toDateString()) {
                dayElement.classList.add('selected');
            }
        } else {
            dayElement.classList.add('other-month');
            dayElement.textContent = currentDate <= 0 ? lastDay.getDate() + currentDate : currentDate - daysInMonth;
        }

        calendar.appendChild(dayElement);
    }
    checkIfClosed(); // Añade esta línea al final de la función loadCalendar
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    loadCalendar();
}

function selectDate(date) {
    selectedDate = date;
    document.querySelectorAll('.day').forEach(day => day.classList.remove('selected'));
    event.target.classList.add('selected');
    loadTimeSlots();
    const scrollToPosition = document.querySelector('#time-slots').offsetTop;
        window.scrollTo({
            top: scrollToPosition,
            behavior: 'smooth'
        });
}

function loadTimeSlots() {
    const slotsContainer = document.getElementById('slots');
    slotsContainer.innerHTML = '';
    document.getElementById('time-slots').classList.remove('hidden');

    const startTime = new Date(selectedDate);
    startTime.setHours(16, 0, 0, 0);
    const endTime = new Date(selectedDate);
    endTime.setHours(20, 40, 0, 0);

    const now = new Date();

    while (startTime <= endTime) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add('time-slot');
        const timeString = startTime.toTimeString().substr(0, 5);
        timeSlot.textContent = timeString;

        const isBooked = appointments.some(app => 
            app.date === selectedDate.toISOString().split('T')[0] && app.time === timeString
        );

        const isPast = selectedDate.toDateString() === now.toDateString() && startTime < now;

        if (isBooked || isPast) {
            timeSlot.classList.add(isBooked ? 'booked' : 'past');
            timeSlot.title = isBooked ? 'No disponible' : 'Hora pasada';
        } else {
            timeSlot.addEventListener('click', () => selectTimeSlot(timeString));
        }

        slotsContainer.appendChild(timeSlot);
        startTime.setMinutes(startTime.getMinutes() + 20);
    }
}

function selectTimeSlot(time) {
    selectedTime = time;
    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
    event.target.classList.add('selected');
    confirmReserva(); // Llamar a confirmReserva directamente después de seleccionar un horario
}

function showConfirmationModal() {
    const modal = document.getElementById('confirmReserva');
    const dateSpan = document.getElementById('confirm-date');
    const timeSpan = document.getElementById('confirm-time');

    dateSpan.textContent = selectedDate.toLocaleDateString();
    timeSpan.textContent = selectedTime;

    modal.classList.remove('hidden');
}

function closeConfirmationModal() {
    document.getElementById('confirmReserva').classList.add('hidden');
}

function confirmAppointment() {
    const appointment = {
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        userId: currentUser.id,
        name: currentUser.name
    };
    appointments.push(appointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));

    closeConfirmationModal();
    showNotification('Turno reservado con éxito', 'success');
    loadCalendar();
    loadTimeSlots();
    if (!currentUser.isAdmin) {
        loadUserAppointments(); // Actualizar la lista de turnos del usuario
    } else {
        loadAdminPanel(); // Actualizar el panel de administrador si es un admin
    }
}

function cancelAppointment(date, time) {
    appointments = appointments.filter(app => 
        !(app.date === date && app.time === time && app.userId === currentUser.id)
    );
    localStorage.setItem('appointments', JSON.stringify(appointments));
    closeCancelConfirmationModal();
    loadUserAppointments();
    showNotification('Turno cancelado', 'success');
}

loadUserAppointments

function loadAdminPanel() {
    loadAdminCalendar()
    const appointmentsTable = document.querySelector('#appointments-table tbody');
    const paginationContainer = document.getElementById('pagination-container');
    appointmentsTable.innerHTML = '';
    paginationContainer.innerHTML = '';

    // Sort appointments by date and time
    const sortedAppointments = appointments.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
    });

    const totalPages = Math.ceil(sortedAppointments.length / appointmentsPerPage);
    const startIndex = (currentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    const currentAppointments = sortedAppointments.slice(startIndex, endIndex);

    if (currentAppointments.length === 0) {
        appointmentsTable.innerHTML = '<tr><td colspan="4">No hay turnos reservados.</td></tr>';
    } else {
        currentAppointments.forEach(app => {
            const row = document.createElement('tr');
            const date = new Date(app.date + 'T' + app.time);
            row.innerHTML = `
                <td>${date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                <td>${app.time}</td>
                <td>${app.name}</td>
                <td>
                    <button class="confirm-reserva-no" onclick="showCancelAppointmentAdminConfirmation('${app.date}', '${app.time}', '${app.userId}')">Cancelar</button>
                </td>
            `;
            appointmentsTable.appendChild(row);
        });
    }

    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Anterior';
        prevButton.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                loadAdminPanel();
            }
        };
        prevButton.disabled = currentPage === 1;

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Siguiente';
        nextButton.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadAdminPanel();
            }
        };
        nextButton.disabled = currentPage === totalPages;

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextButton);
    }

    const scrollButton = document.querySelector('#botonadminp');
    scrollButton.addEventListener('click', () => {
        const scrollToPosition = document.querySelector('#appointments-list').offsetTop;
        window.scrollTo({
            top: scrollToPosition,
            behavior: 'smooth'
        });
    });
}

function cancelAppointmentAdmin(date, time, userId) {
    appointments = appointments.filter(app => 
        !(app.date === date && app.time === time && app.userId === userId)
    );
    localStorage.setItem('appointments', JSON.stringify(appointments));
    loadAdminPanel();
    showNotification('Turno cancelado', 'success');
}

function closeDay() {
    const date = document.getElementById('close-date').value;
    if (date) {
        if (closedDays.includes(date)) {
            showNotification('Este día ya está cerrado', 'error');
            return;
        }
        
        closedDays.push(date);
        localStorage.setItem('closedDays', JSON.stringify(closedDays));
        
        // Cancelar turnos existentes para ese día y notificar a los clientes
        const cancelledAppointments = appointments.filter(app => app.date === date);
        appointments = appointments.filter(app => app.date !== date);
        
        cancelledAppointments.forEach(app => {
            // En una aplicación real, aquí se enviaría un email al cliente
            console.log(`Notificación para ${app.name}: Tu turno del ${app.date} a las ${app.time} ha sido cancelado porque la peluquería estará cerrada ese día.`);
        });
        
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        showNotification('Día cerrado exitosamente y turnos cancelados. Los clientes han sido notificados.', 'success');
        loadAdminPanel();
        loadCalendar();
        loadClosedDaysHistory();
    }
}

function loadClosedDaysHistory() {
    const closedDaysList = document.getElementById('closed-days-list');
    closedDaysList.innerHTML = '';
    
    if (closedDays.length === 0) {
        closedDaysList.innerHTML = '<li>No hay días cerrados en el historial.</li>';
    } else {
        closedDays.forEach(day => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                ${day}
                <button onclick="showReopenDayConfirmation('${day}')" class="reopen-day-btn">
                    <i class="fas fa-door-open"></i> Reabrir
                </button>
            `;
            closedDaysList.appendChild(listItem);
        });
    }
    const scrollToPosition = document.querySelector('#closed-days-history').offsetTop;

    window.scrollTo({
        top: scrollToPosition,
        behavior: 'smooth'
      });
}

function reopenDay(date) {
    closedDays = closedDays.filter(day => day !== date);
    localStorage.setItem('closedDays', JSON.stringify(closedDays));
    showNotification(`El día ${date} ha sido reabierto`, 'success');
    loadClosedDaysHistory();
    loadCalendar();
}

function loadStats() {
    const ctx = document.getElementById('appointmentsChart').getContext('2d');
    const appointmentCounts = {};
    
    appointments.forEach(app => {
        const date = new Date(app.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        appointmentCounts[monthYear] = (appointmentCounts[monthYear] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(appointmentCounts),
            datasets: [{
                label: 'Número de Reservas',
                data: Object.values(appointmentCounts),
                backgroundColor: 'rgba(108, 99, 255, 0.5)',
                borderColor: 'rgba(108, 99, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
    const scrollToPosition = document.querySelector('#stats').offsetTop;

    window.scrollTo({
        top: scrollToPosition,
        behavior: 'smooth'
      });
}

function showNotification(message, type, undoAction = null) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    if (undoAction) {
        const undoButton = document.createElement('button');
        undoButton.textContent = 'Deshacer';
        undoButton.className = 'undo-button';
        undoButton.onclick = () => {
            undoAction();
            notification.remove();
            clearTimeout(lastActionTimeout);
        };
        notification.appendChild(undoButton);

        lastAction = undoAction;
    }

    document.body.appendChild(notification);

    lastActionTimeout = setTimeout(() => {
        notification.remove();
        lastAction = null;
    }, 10000);
}

function loadClientList() {
    const clientsTable = document.querySelector('#clients-table tbody');
    clientsTable.innerHTML = '';
    
    // Filtrar usuarios no administradores y ordenarlos por ID de menor a mayor
    const sortedUsers = users
        .filter(user => !user.isAdmin)
        .sort((a, b) => {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            return idA - idB;
        });
    
    sortedUsers.forEach(user => {
        const row = document.createElement('tr');
        const [name, lastname] = user.name.split(' ');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${name}</td>
            <td>${lastname || ''}</td>
            <td>${user.contact || 'No disponible'}</td>
            <td class="edieli">
                <button class="edit-client-btn" onclick="showEditClientModal('${user.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="delete-client-btn" onclick="confirmDeleteClient('${user.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </td>
        `;
        clientsTable.appendChild(row);
    });
    const scrollButton = document.querySelector('#botonadmin'); // Ajusta el selector según el botón

// Agrega un evento de clic al botón
scrollButton.addEventListener('click', () => {
  // Calcula la posición de desplazamiento de la lista de clientes
  const scrollToPosition = document.querySelector('#client-list').offsetTop;

  // Realiza el desplazamiento suave a la posición calculada
  window.scrollTo({
    top: scrollToPosition,
    behavior: 'smooth'
  });
});
}


function confirmDeleteClient(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const modal = document.createElement('div');
    modal.className = 'confirm-delete-modal';
    modal.innerHTML = `
        <div class="confirm-delete-content">
            <h2>Confirmar Eliminación</h2>
            <p>¿Estás seguro de que deseas eliminar al cliente "${user.name}"?</p>
            <div class="confirm-delete-buttons">
                <button class="confirm-delete-yes" onclick="deleteClient('${userId}')">Eliminar</button>
                <button class="confirm-delete-no" onclick="closeDeleteModal()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function closeDeleteModal() {
    const modal = document.querySelector('.confirm-delete-modal');
    if (modal) {
        modal.remove();
    }
}

function insertClientAtOriginalPosition(client) {
    const index = users.findIndex(user => parseInt(user.id) > parseInt(client.id));
    if (index === -1) {
        users.push(client);
    } else {
        users.splice(index, 0, client);
    }
}

function deleteClient(userId) {
    const deletedUserIndex = users.findIndex(user => user.id === userId);
    const deletedUser = users[deletedUserIndex];
    const deletedAppointments = appointments.filter(app => app.userId === userId);

    users = users.filter(user => user.id !== userId);
    appointments = appointments.filter(app => app.userId !== userId);

    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('appointments', JSON.stringify(appointments));

    closeDeleteModal();
    loadClientList();
    loadAdminPanel(); // Refresh appointments list

    showNotification('Cliente eliminado con éxito', 'success', () => {
        insertClientAtOriginalPosition(deletedUser, deletedUserIndex);
        appointments = appointments.concat(deletedAppointments);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('appointments', JSON.stringify(appointments));
        loadClientList();
        loadAdminPanel();
    });
}

function animateLogo() {
    const logoContainer = document.querySelector('.logo-container');
    logoContainer.classList.add('animate');
}

function checkExistingClient(name, lastname) {
    return users.some(user => 
        user.name.toLowerCase() === `${name} ${lastname}`.toLowerCase()
    );
}

function generateClientId() {
    let name = document.getElementById('new-client-name').value.trim();
    let lastname = document.getElementById('new-client-lastname').value.trim();
    const contact = document.getElementById('new-client-contact').value.trim();
    const errorMessageElement = document.getElementById('error-message');
    const generatedIdElement = document.getElementById('generated-id');

    // Capitalize the first letter of name and lastname
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    lastname = lastname.charAt(0).toUpperCase() + lastname.slice(1).toLowerCase();

    if (name && lastname) {
        if (checkExistingClient(name, lastname)) {
            errorMessageElement.textContent = 'Ya existe un cliente con ese nombre y apellido.';
            errorMessageElement.classList.remove('hidden');
            generatedIdElement.classList.add('hidden');
        } else {
            lastClientId++;
            const id = lastClientId.toString().padStart(3, '0');
            const newUser = { 
                id, 
                name: `${name} ${lastname}`, 
                isAdmin: false,
                contact: contact
            };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('lastClientId', lastClientId.toString());
            
            document.getElementById('new-client-id').textContent = id;
            generatedIdElement.classList.remove('hidden');
            errorMessageElement.classList.add('hidden');
            showNotification('ID de cliente generado con éxito', 'success');
            
            // Clear input fields after successful creation
            document.getElementById('new-client-name').value = '';
            document.getElementById('new-client-lastname').value = '';
            document.getElementById('new-client-contact').value = '';
        }
    } else {
        errorMessageElement.textContent = 'Por favor, ingrese el nombre y apellido del cliente';
        errorMessageElement.classList.remove('hidden');
        generatedIdElement.classList.add('hidden');
    }
}

function updateNameHeader() {
    const idheader = document.getElementById('id-header');
    const nameHeader = document.getElementById('name-header');
    idheader.textContent = currentUser ? currentUser.id : '';
    nameHeader.textContent = currentUser ? currentUser.name : '';
}

function login() {
    const id = document.getElementById('login-id').value;
    
    if (id === 'admin') {
        currentUser = { id: 'admin', name: 'Admin', isAdmin: true };
    } else {
        currentUser = users.find(u => u.id === id);
    }
    
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('auth-section').classList.add('hidden');
        updateNavButtons();
        updateNameHeader();
        
        if (currentUser.isAdmin) {
            showSection('admin-section');
        } else {
            showSection('user-section');
        }

        showNotification(`Bienvenido, ${currentUser.name}!`, 'success');
    } else {
        showNotification('ID de cliente inválido', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const workHoursButton = document.getElementById('work-hours-button');
    workHoursButton.addEventListener('click', toggleWorkHours);

    document.getElementById('logout-button').addEventListener('click', handleLogout);

    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateNavButtons();
        updateNameHeader();
        
        if (currentUser.isAdmin) {
            showSection('admin-section');
        } else {
            showSection('user-section');
        }
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
    }
    if (currentUser && currentUser.isAdmin) {
        loadAdminPanel();
    }
    
    updateNavButtons();
    setTimeout(animateLogo, 500);
    loadCalendar();
});

function searchDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const searchDate = new Date(year, month - 1, day);  // month is 0-indexed in JavaScript Date
    
    if (!isNaN(searchDate.getTime())) {
        currentMonth = searchDate.getMonth();
        currentYear = searchDate.getFullYear();
        selectedDate = searchDate;
        loadCalendar();
        loadTimeSlots();
    } else {
        showNotification('Fecha inválida', 'error');
    }
}

function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    selectedDate = today;
    loadCalendar();
    loadTimeSlots();
}

function confirmReserva() {
    const modal = document.createElement('div');
    modal.className = 'confirm-reserva-modal';
    modal.innerHTML = `
        <div class="modal-reserva-content">
            <h2> Confirmar Turno</h2>
            <p>Deseas reservar el turno para el <span id="confirm-date">${selectedDate.toLocaleDateString()}</span> a las <span id="confirm-time">${selectedTime}</span>?</p>
            <div class="modal-buttons">
                <button onclick="confirmAppointment(), closeReservaConfirmationModal()" class="confirm-reserva-yes"><i class="fas fa-check"></i>Confirmar</button>
                <button onclick="closeReservaConfirmationModal()" class="confirm-reserva-no"><i class="fas fa-times"></i>Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}
function closeReservaConfirmationModal() {
    const modal = document.querySelector('.confirm-reserva-modal');
    if (modal) {
        modal.remove();
    }
}

function showCancelConfirmation(date, time) {
    const modal = document.createElement('div');
    modal.className = 'cancel-confirmation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2> Confirmar Cancelación</h2>
            <p>¿Estás seguro de cancelar tu turno para el <span>${date}</span> a las <span>${time}</span>?</p>
            <div class="modal-buttons">
                <button onclick="cancelAppointment('${date}', '${time}'), closeConfirmationModal()" class="confirm-cancel"><i class="fas fa-check"></i>Cancelar</button>
                <button onclick="closeCancelConfirmationModal()" class="cancel-action"><i class="fas fa-times"></i> Conservar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}
function closeCancelConfirmationModal() {
    const modal = document.querySelector('.cancel-confirmation-modal');
    if (modal) {
        modal.remove();
    }
}

function showCancelAppointmentAdminConfirmation(date, time, userId) {
    const user = users.find(u => u.id === userId);
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2> Confirmar Cancelación de Turno</h2>
            <p>¿Estás seguro de cancelar el turno para el <span>${date}</span> a las <span>${time}</span>, del cliente ${user.name}, ID ${userId}?</p>
            <div class="modal-buttons">
                <button onclick="cancelAppointmentAdmin('${date}', '${time}', '${userId}'), closeConfirmationModal()" class="confirm-action"><i class="fas fa-check"></i>Cancelar</button>
                <button onclick="closeConfirmationModal()" class="cancel-action"><i class="fas fa-times"></i>Conservar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}


function showCloseDayConfirmation() {
    const date = document.getElementById('close-date').value;
    if (!date) {
        showNotification('Por favor, selecciona una fecha', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2> Confirmar Cierre de Día</h2>
            <p>¿Estás seguro que deseas cerrar el día <span>${date}</span>? Todos los turnos para este día serán cancelados.</p>
            <div class="modal-buttons">
                <button onclick="closeDay('${date}'), closeConfirmationModal()" class="confirm-action"><i class="fas fa-check"></i>Cerrar</button>
                <button onclick="closeConfirmationModal()" class="cancel-action"><i class="fas fa-times"></i>Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}


function showReopenDayConfirmation(date) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2> Confirmar Reapertura de Día</h2>
            <p>¿Estás seguro que deseas reabrir el día <span>${date}</span>?</p>
            <div class="modal-buttons">
                <button onclick="reopenDay('${date}'), closeConfirmationModal()" class="confirm-action"><i class="fas fa-check"></i>Reabrir</button>
                <button onclick="closeConfirmationModal()" class="cancel-action"><i class="fas fa-times"></i> Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function closeConfirmationModal() {
    const modal = document.querySelector('.confirmation-modal');
    if (modal) {
        modal.remove();
    }
}

function showEditClientModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const [name, lastname] = user.name.split(' ');

    const modal = document.createElement('div');
    modal.className = 'edit-client-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Editar Cliente</h2>
            <form id="edit-client-form">
                <div>
                    <label for="edit-client-name">Nombre:</label>
                    <input type="text" id="edit-client-name" value="${name}" required>
                </div>
                <div>
                    <label for="edit-client-lastname">Apellido:</label>
                    <input type="text" id="edit-client-lastname" value="${lastname || ''}" required>
                </div>
                <div>
                    <label for="edit-client-contact">Contacto:</label>
                    <input type="text" id="edit-client-contact" value="${user.contact || ''}">
                </div>
                <div class="modal-buttons">
                    <button type="submit" class="confirm-edit"><i class="fas fa-check"></i>Guardar Cambios</button>
                    <button type="button" class="cancel-edit" onclick="closeEditClientModal()"><i class="fas fa-times"></i>Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    document.getElementById('edit-client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        updateClient(userId);
    });
}

function closeEditClientModal() {
    const modal = document.querySelector('.edit-client-modal');
    if (modal) {
        modal.remove();
    }
}

function updateClient(userId) {
    const name = document.getElementById('edit-client-name').value;
    const lastname = document.getElementById('edit-client-lastname').value;
    const contact = document.getElementById('edit-client-contact').value;

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        const oldUser = {...users[userIndex]};
        users[userIndex].name = `${name} ${lastname}`.trim();
users[userIndex].contact = contact;
        localStorage.setItem('users', JSON.stringify(users));
        closeEditClientModal();
        loadClientList();

        showNotification('Cliente actualizado con éxito', 'success', () => {
            users[userIndex] = oldUser;
            localStorage.setItem('users', JSON.stringify(users));
            loadClientList();
        });
    } else {
        showNotification('Error al actualizar el cliente', 'error');
    }
}

// marcar botones activos
const adminButtons = document.querySelectorAll('.botonadmin, .nav-button');

adminButtons.forEach(button => {
  button.addEventListener('click', () => {
    adminButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
  });
});

function checkIfClosed() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const closedDays = JSON.parse(localStorage.getItem('closedDays') || '[]');
    const todayString = today.toISOString().split('T')[0];
  
    // Verifica si es domingo (0) o un día manualmente cerrado
    const isClosed = dayOfWeek === 0 || closedDays.includes(todayString);
  
    const estaCerradoElement = document.getElementById('estacerrado');
    if (estaCerradoElement) {
      if (isClosed) {
        estaCerradoElement.textContent = 'Hoy está cerrado';
        estaCerradoElement.style.color = '#ee1d23';
        estaCerradoElement.style.textDecoration = 'underline';

      } else {
        estaCerradoElement.textContent = ''; // No muestra nada si está abierto
      }
    }
  
    // Actualiza el elemento 'hoyes' con el formato dd/mm/aaaa
    const hoyEsElement = document.getElementById('hoyes');
    if (hoyEsElement) {
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0
      const year = today.getFullYear();
      hoyEsElement.textContent = `Hoy ${day}/${month}/${year}`;
    }
  }

  document.addEventListener('DOMContentLoaded', checkIfClosed);

function openDateModal() {
    const modal = document.getElementById('dateModal');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    // Populate month select
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    monthSelect.innerHTML = months.map((month, index) => 
        `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${month}</option>`
    ).join('');

    // Populate year select (10 years before and after current year)
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 21}, (_, i) => currentYear - 10 + i);
    yearSelect.innerHTML = years.map(year => 
        `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
    ).join('');

    modal.style.display = 'block';
}

function closeDateModal() {
    document.getElementById('dateModal').style.display = 'none';
}

function applyDateSelection() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    currentMonth = parseInt(monthSelect.value);
    currentYear = parseInt(yearSelect.value);

    loadCalendar();
    closeDateModal();
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    loadCalendar();
}

function loadUserAppointments() {
    const appointmentsList = document.getElementById('user-appointments-list');
    const paginationContainer = document.getElementById('user-appointments-pagination');
    appointmentsList.innerHTML = '';
    paginationContainer.innerHTML = '';

    const toggleOptions = document.querySelectorAll('.toggle-option');
    const toggleUnderline = document.querySelector('.toggle-underline');

    toggleOptions.forEach(option => {
        option.addEventListener('click', () => {
            const isUpcoming = option.dataset.option === 'upcoming';
            if (isViewingUpcoming !== isUpcoming) {
                isViewingUpcoming = isUpcoming;
                toggleOptions.forEach(opt => opt.classList.toggle('active'));
                toggleUnderline.classList.toggle('right');
                currentUserPage = 1;
                loadUserAppointments();
            }
        });
    });

    // Set initial active state
    toggleOptions[isViewingUpcoming ? 0 : 1].classList.add('active');
    toggleUnderline.classList.toggle('right', !isViewingUpcoming);

    const now = new Date();
    const userAppointments = appointments.filter(app => app.userId === currentUser.id);

    const sortedAppointments = userAppointments.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
    });

    const filteredAppointments = isViewingUpcoming
        ? sortedAppointments.filter(app => new Date(app.date + 'T' + app.time) >= now)
        : sortedAppointments.filter(app => new Date(app.date + 'T' + app.time) < now);

    if (filteredAppointments.length === 0) {
        appointmentsList.innerHTML = `<p>No hay turnos ${isViewingUpcoming ? 'reservados' : 'en el historial'}.</p>`;
    } else {
        if (isViewingUpcoming) {
            // Pagination for upcoming appointments
            const totalPages = Math.ceil(filteredAppointments.length / userAppointmentsPerPage);
            const startIndex = (currentUserPage - 1) * userAppointmentsPerPage;
            const endIndex = startIndex + userAppointmentsPerPage;
            const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

            currentAppointments.forEach(app => {
                const appElement = createAppointmentElement(app, now);
                appointmentsList.appendChild(appElement);
            });

            // Create pagination for upcoming appointments
            createPagination(totalPages, paginationContainer);
        } else {
            // Show only the last 5 past appointments
            const pastAppointments = filteredAppointments.slice(-5);
            pastAppointments.forEach(app => {
                const appElement = createAppointmentElement(app, now);
                appointmentsList.appendChild(appElement);
            });
        }
    }
}

function createAppointmentElement(app, now) {
    const appElement = document.createElement('div');
    appElement.classList.add('appointment-item');
    const appointmentDate = new Date(app.date + 'T' + app.time);
    const isPast = appointmentDate < now;
    const isCancelled = closedDays.includes(app.date);
    
    if (isPast) {
        appElement.classList.add('past');
    }
    
    // Formatear la fecha como día/mes/año
    const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    appElement.innerHTML = `
        <span>Fecha: ${formattedDate} Hora: ${app.time} ${isCancelled ? '<span class="cancelled">(CANCELADO)</span>' : ''}</span>
        ${!isPast && !isCancelled && isViewingUpcoming ? `<button onclick="showCancelConfirmation('${app.date}', '${app.time}')">Cancelar</button>` : ''}
    `;
    return appElement;
}

function createPagination(totalPages, paginationContainer) {
    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Anterior';
        prevButton.onclick = () => {
            if (currentUserPage > 1) {
                currentUserPage--;
                loadUserAppointments();
            }
        };
        prevButton.disabled = currentUserPage === 1;

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Siguiente';
        nextButton.onclick = () => {
            if (currentUserPage < totalPages) {
                currentUserPage++;
                loadUserAppointments();
            }
        };
        nextButton.disabled = currentUserPage === totalPages;

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Página ${currentUserPage} de ${totalPages}`;

        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextButton);
    }
}

function toggleWorkHours() {
    const header = document.getElementById('main-header');
    const workHoursSection = document.getElementById('work-hours-section');
    const mainContent = document.querySelector('main.secc');
    
    header.style.display = 'none';
    workHoursSection.classList.remove('hidden');
    
    // Ocultar todas las otras secciones
    const allSections = mainContent.querySelectorAll('section:not(#work-hours-section)');
    allSections.forEach(section => section.classList.add('hidden'));
    
    loadWorkHours();
}

function toggleWorkHours() {
    const header = document.getElementById('main-header');
    const workHoursSection = document.getElementById('work-hours-section');
    const mainContent = document.querySelector('main.secc');
    
    header.style.display = 'none';
    workHoursSection.classList.remove('hidden');
    
    // Hide all other sections
    const allSections = mainContent.querySelectorAll('section:not(#work-hours-section)');
    allSections.forEach(section => section.classList.add('hidden'));
    
    loadWorkHours();
}

function loadWorkHours() {
    const todayAppointmentsList = document.getElementById('today-appointments-list');
    todayAppointmentsList.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const todayAppointments = appointments.filter(app => app.date === today)
        .sort((a, b) => a.time.localeCompare(b.time));

    if (todayAppointments.length === 0) {
        todayAppointmentsList.innerHTML = '<p>No hay turnos para hoy.</p>';
    } else {
        todayAppointments.forEach(app => {
            const appElement = document.createElement('div');
            appElement.classList.add('appointment-item-today');
            
            // Check if this appointment is the current one
            if (isCurrentAppointment(app.time)) {
                appElement.classList.add('current');
            }
            
            appElement.innerHTML = `
                <p class="horahoradetrabajo"><strong>${app.time}</strong></p>
                <p class="clientehoradetrabajo">${app.name}</p>
            `;
            todayAppointmentsList.appendChild(appElement);
        });
    }

    // Set up an interval to update the current appointment every minute
    setInterval(updateCurrentAppointment, 60000);
}

function isCurrentAppointment(appointmentTime) {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const [appHour, appMinute] = appointmentTime.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);

    // Check if the current time is within the 20-minute window of the appointment
    if (appHour === currentHour) {
        return currentMinute >= appMinute && currentMinute < appMinute + 20;
    } else if (appHour + 1 === currentHour) {
        return appMinute + 20 > 60 && currentMinute < (appMinute + 20) % 60;
    }
    return false;
}

function updateCurrentAppointment() {
    const appointmentItems = document.querySelectorAll('.appointment-item-today');
    appointmentItems.forEach(item => {
        const timeElement = item.querySelector('.horahoradetrabajo strong');
        if (timeElement) {
            const appointmentTime = timeElement.textContent;
            if (isCurrentAppointment(appointmentTime)) {
                item.classList.add('current');
            } else {
                item.classList.remove('current');
            }
        }
    });
}


function loadAdminCalendar() {
    const calendarHeader = document.getElementById('admin-calendar-header');
    const calendar = document.getElementById('admin-calendar');
    calendarHeader.innerHTML = '';
    calendar.innerHTML = '';

    document.getElementById('admin-hoyes').textContent = new Date().toLocaleDateString();
    document.getElementById('admin-current-month').textContent = new Date(adminCurrentYear, adminCurrentMonth).toLocaleString('es-ES', { month: 'long' });
    document.getElementById('admin-current-year').textContent = adminCurrentYear;

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        calendarHeader.appendChild(dayElement);
    });

    const firstDay = new Date(adminCurrentYear, adminCurrentMonth, 1);
    const lastDay = new Date(adminCurrentYear, adminCurrentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        
        const currentDate = i - startingDay + 1;
        if (currentDate > 0 && currentDate <= daysInMonth) {
            const date = new Date(adminCurrentYear, adminCurrentMonth, currentDate);
            if (appointments.some(app => app.date === date.toISOString().split('T')[0])) {
                dayElement.classList.add('has-appointment');
            }
            dayElement.textContent = currentDate;
            const dayOfWeek = date.getDay();
            const isOpen = dayOfWeek >= 1 && dayOfWeek <= 6; // Lunes a Sábado
            const isClosed = closedDays.includes(date.toISOString().split('T')[0]);

            if (date.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }

            if (!isOpen || isClosed) {
                dayElement.classList.add('closed');
                dayElement.title = 'Cerrado';
            } else {
                dayElement.addEventListener('click', () => adminSelectDate(date));
            }

            if (date.toDateString() === adminSelectedDate?.toDateString()) {
                dayElement.classList.add('selected');
            }
        } else {
            dayElement.classList.add('other-month');
            dayElement.textContent = currentDate <= 0 ? lastDay.getDate() + currentDate : currentDate - daysInMonth;
        }

        calendar.appendChild(dayElement);
    }
}
function adminSelectDate(date) {
    adminSelectedDate = date;
    document.querySelectorAll('#admin-calendar .day').forEach(day => day.classList.remove('selected'));
    event.target.classList.add('selected');
    loadAdminTimeSlots();
}
function loadAdminTimeSlots() {
    const slotsContainer = document.getElementById('admin-slots');
    slotsContainer.innerHTML = '';
    document.getElementById('admin-time-slots').classList.remove('hidden');

    const startTime = new Date(adminSelectedDate);
    startTime.setHours(16, 0, 0, 0);
    const endTime = new Date(adminSelectedDate);
    endTime.setHours(20, 40, 0, 0);

    const now = new Date();

    while (startTime <= endTime) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add('admin-time-slot');
        const timeString = startTime.toTimeString().substr(0, 5);
        timeSlot.textContent = timeString;

        const appointment = appointments.find(app => 
            app.date === adminSelectedDate.toISOString().split('T')[0] && app.time === timeString
        );

        if (appointment) {
            timeSlot.classList.add('occupied');
            timeSlot.classList.add('tooltip');
            const tooltipText = document.createElement('span');
            tooltipText.classList.add('tooltiptext');
            tooltipText.innerHTML = `Cliente: ${appointment.name}<br>ID: ${appointment.userId}`;
            timeSlot.appendChild(tooltipText);

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancelar';
            cancelButton.onclick = (e) => {
                e.stopPropagation();
                showCancelAppointmentAdminConfirmation(appointment.date, appointment.time, appointment.userId);
            };
            timeSlot.appendChild(cancelButton);
        } else if (adminSelectedDate.toDateString() === now.toDateString() && startTime < now) {
            timeSlot.classList.add('attended');
        } else {
            timeSlot.classList.add('free');
        }

        slotsContainer.appendChild(timeSlot);
        startTime.setMinutes(startTime.getMinutes() + 20);
    }
}
function adminChangeMonth(delta) {
    adminCurrentMonth += delta;
    if (adminCurrentMonth < 0) {
        adminCurrentMonth = 11;
        adminCurrentYear--;
    } else if (adminCurrentMonth > 11) {
        adminCurrentMonth = 0;
        adminCurrentYear++;
    }
    loadAdminCalendar();
}
function adminGoToToday() {
    const today = new Date();
    adminCurrentMonth = today.getMonth();
    adminCurrentYear = today.getFullYear();
    adminSelectedDate = today;
    loadAdminCalendar();
    loadAdminTimeSlots();
}
function openAdminDateModal() {
    const modal = document.getElementById('adminDateModal');
    const monthSelect = document.getElementById('adminMonthSelect');
    const yearSelect = document.getElementById('adminYearSelect');

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    monthSelect.innerHTML = months.map((month, index) => 
        `<option value="${index}" ${index === adminCurrentMonth ? 'selected' : ''}>${month}</option>`
    ).join('');

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 21}, (_, i) => currentYear - 10 + i);
    yearSelect.innerHTML = years.map(year => 
        `<option value="${year}" ${year === adminCurrentYear ? 'selected' : ''}>${year}</option>`
    ).join('');

    modal.style.display = 'block';
}
function closeAdminDateModal() {
    document.getElementById('adminDateModal').style.display = 'none';
}
function applyAdminDateSelection() {
    const monthSelect = document.getElementById('adminMonthSelect');
    const yearSelect = document.getElementById('adminYearSelect');
    
    adminCurrentMonth = parseInt(monthSelect.value);
    adminCurrentYear = parseInt(yearSelect.value);

    loadAdminCalendar();
    closeAdminDateModal();
}