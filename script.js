document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            if (username && password) {
                localStorage.setItem('userRole', role);
                window.location.href = 'home.html';
            } else {
                loginError.textContent = 'Please enter a valid username and password.';
            }
        });
    }

    const userRole = localStorage.getItem('userRole');

    if (userRole) {
        const userRoleSpan = document.getElementById('user-role');
        if (userRoleSpan) userRoleSpan.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);

        const navLinks = document.getElementById('nav-links');
        if (navLinks) {
            if (userRole === 'admin') {
                navLinks.innerHTML = `
                    <li><a href="schedule.html">Manage Schedule</a></li>
                    <li><a href="attendance.html">Track Attendance</a></li>
                    <li><a href="announcements.html">Announcements</a></li>
                `;
            } else if (userRole === 'faculty') {
                navLinks.innerHTML = `
                    <li><a href="schedule.html">Create Time Table</a></li>
                    <li><a href="attendance.html">Input Attendance</a></li>
                    <li><a href="announcements.html">Announcements</a></li>
                `;
            } else if (userRole === 'student') {
                navLinks.innerHTML = `
                    <li><a href="schedule.html">View Time Table</a></li>
                    <li><a href="attendance.html">View Attendance</a></li>
                    <li><a href="announcements.html">Announcements</a></li>
                `;
            }
        }
    }

    const scheduleContent = document.getElementById('schedule-content');
    const scheduleForm = document.getElementById('schedule-form');
    const scheduleFormContainer = document.getElementById('schedule-form-container');
    const downloadCalendarBtn = document.getElementById('download-calendar');

    if (scheduleContent) {
        const schedule = JSON.parse(localStorage.getItem('schedule')) || [];
        renderSchedule(schedule);

        if (userRole === 'admin' || userRole === 'faculty') {
            scheduleFormContainer.style.display = 'block';

            scheduleForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const course = document.getElementById('course').value;
                const day = document.getElementById('day').value;
                const time = document.getElementById('time').value;

                const newScheduleItem = { course, day, time };
                const conflict = checkForConflict(schedule, newScheduleItem);

                if (conflict) {
                    const resolveManually = confirm("Scheduling conflict detected. Would you like to resolve it manually? Click 'Cancel' to resolve automatically.");
                    if (resolveManually) {
                        alert("Please adjust the schedule manually to resolve the conflict.");
                    } else {
                        const adjustedTime = adjustTime(schedule, newScheduleItem);
                        newScheduleItem.time = adjustedTime;
                        alert(`Conflict resolved automatically. The new time for the course is ${adjustedTime}.`);
                    }
                }

                schedule.push(newScheduleItem);
                localStorage.setItem('schedule', JSON.stringify(schedule)); // Save updated schedule
                renderSchedule(schedule); // Re-render the schedule
                scheduleForm.reset();
            });
        }
    }

    if (downloadCalendarBtn) {
        downloadCalendarBtn.addEventListener('click', () => {
            const schedule = JSON.parse(localStorage.getItem('schedule')) || [];
            const icsFileContent = generateICSFile(schedule);
            downloadICSFile(icsFileContent);
        });
    }

    function renderSchedule(schedule) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

        let table = '<table><tr><th>Time</th>';

        days.forEach(day => {
            table += `<th>${day}</th>`;
        });

        table += '</tr>';

        times.forEach(time => {
            table += `<tr><td>${time}</td>`;
            days.forEach(day => {
                const course = schedule.find(item => item.day === day && item.time === time);
                table += `<td>${course ? `${course.course} ${userRole === 'admin' || userRole === 'faculty' ? `<button onclick="editSchedule('${day}', '${time}')">Edit</button>` : ''}` : ''}</td>`;
            });
            table += '</tr>';
        });

        table += '</table>';
        scheduleContent.innerHTML = table;
    }

    function checkForConflict(schedule, newScheduleItem) {
        return schedule.some(item => item.day === newScheduleItem.day && item.time === newScheduleItem.time);
    }

    function adjustTime(schedule, newScheduleItem) {
        const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        for (let i = 0; i < times.length; i++) {
            if (!schedule.some(item => item.day === newScheduleItem.day && item.time === times[i])) {
                return times[i];
            }
        }
        return newScheduleItem.time;
    }

    function generateICSFile(schedule) {
        let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\n';

        schedule.forEach(item => {
            const startTime = formatTimeForICS(item.time);
            const endTime = formatTimeForICS(incrementTime(item.time));
            const dayOfWeek = getICSWeekday(item.day);

            icsContent += `
BEGIN:VEVENT
SUMMARY:${item.course}
DTSTART;TZID=America/New_York:${dayOfWeek}T${startTime}00
DTEND;TZID=America/New_York:${dayOfWeek}T${endTime}00
RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek}
END:VEVENT
`;
        });

        icsContent += 'END:VCALENDAR';
        return icsContent;
    }

    function formatTimeForICS(time) {
        return time.replace(':', '') + '00';
    }

    function incrementTime(time) {
        const [hours, minutes] = time.split(':').map(Number);
        let newHours = hours + 1;
        if (newHours < 10) {
            newHours = '0' + newHours;
        }
        return `${newHours}:${minutes}`;
    }

    function getICSWeekday(day) {
        switch (day) {
            case 'Monday':
                return 'MO';
            case 'Tuesday':
                return 'TU';
            case 'Wednesday':
                return 'WE';
            case 'Thursday':
                return 'TH';
            case 'Friday':
                return 'FR';
            default:
                return '';
        }
    }

    function downloadICSFile(content) {
        const blob = new Blob([content], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schedule.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.editSchedule = function(day, time) {
        const schedule = JSON.parse(localStorage.getItem('schedule')) || [];
        const item = schedule.find(item => item.day === day && item.time === time);

        if (item) {
            const newCourse = prompt("Edit the course name:", item.course);
            if (newCourse !== null) {
                item.course = newCourse;
                localStorage.setItem('schedule', JSON.stringify(schedule));
                renderSchedule(schedule);
            }
        }
    };

    const attendanceContent = document.getElementById('attendance-content');
    const attendanceForm = document.getElementById('attendance-form');
    const attendanceFormContainer = document.getElementById('attendance-form-container');

    if (attendanceContent) {
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        renderAttendance(attendance);

        if (userRole === 'admin' || userRole === 'faculty') {
            attendanceFormContainer.style.display = 'block';

            attendanceForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const student = document.getElementById('student').value;
                const date = document.getElementById('date').value;
                const status = document.getElementById('status').value;

                const newAttendanceRecord = { student, date, status };
                attendance.push(newAttendanceRecord);
                localStorage.setItem('attendance', JSON.stringify(attendance));
                renderAttendance(attendance);
                attendanceForm.reset();
            });
        }
    }

    function renderAttendance(attendance) {
        if (attendance.length === 0) {
            attendanceContent.textContent = 'No attendance records available.';
            return;
        }

        let table = '<table class="attendance-table"><tr><th>Student</th><th>Date</th><th>Status</th></tr>';

        attendance.forEach(record => {
            table += `<tr><td>${record.student}</td><td>${record.date}</td><td>${record.status}</td></tr>`;
        });

        table += '</table>';
        attendanceContent.innerHTML = table;
    }

    const announcementContent = document.getElementById('announcement-content');
    const announcementForm = document.getElementById('announcement-form');
    const announcementFormContainer = document.getElementById('announcement-form-container');

    if (announcementContent) {
        const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
        renderAnnouncements(announcements);

        if (userRole === 'admin') {
            announcementFormContainer.style.display = 'block';

            announcementForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const announcementText = document.getElementById('announcement-text').value;

                const newAnnouncement = { text: announcementText, date: new Date().toLocaleString() };
                announcements.push(newAnnouncement);
                localStorage.setItem('announcements', JSON.stringify(announcements));
                renderAnnouncements(announcements);
                announcementForm.reset();
            });
        }
    }

    function renderAnnouncements(announcements) {
        if (announcements.length === 0) {
            announcementContent.textContent = 'No announcements available.';
            return;
        }

        let list = '<ul>';

        announcements.forEach((announcement, index) => {
            list += `
                <li>
                    ${announcement.date}: ${announcement.text}
                    ${userRole === 'admin' ? `<button onclick="editAnnouncement(${index})">Edit</button><button onclick="deleteAnnouncement(${index})">Delete</button>` : ''}
                </li>`;
        });

        list += '</ul>';
        announcementContent.innerHTML = list;
    }

    window.editAnnouncement = function (index) {
        const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
        const announcement = announcements[index];

        const newText = prompt("Edit the announcement:", announcement.text);
        if (newText !== null) {
            announcement.text = newText;
            announcements[index] = announcement;
            localStorage.setItem('announcements', JSON.stringify(announcements));
            renderAnnouncements(announcements);
        }
    };

    window.deleteAnnouncement = function (index) {
        const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
        
        if (index >= 0 && index < announcements.length) {
            announcements.splice(index, 1);
            localStorage.setItem('announcements', JSON.stringify(announcements));
            renderAnnouncements(announcements);
        } else {
            console.error('Invalid index for announcement deletion.');
        }
    };
});
