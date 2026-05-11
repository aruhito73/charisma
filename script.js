/* ===== CHARISMA — Dynamic Data Loading & Interactivity ===== */

// ===== Data Loading =====
async function loadJSON(url) {
  try {
    const res = await fetch(`${url}?v=${new Date().getTime()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`Failed to load ${url}:`, e.message);
    return null;
  }
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== Squad Rendering =====
function renderSquad(data) {
  const grid = document.getElementById('squadGrid');
  if (!grid || !data?.players) return;

  // Filter out aggregate/header rows
  const validPlayers = data.players.filter(p => p.matches !== undefined || (p.cells && p.cells.length >= 8 && p.cells[2].length <= 3));

  const posMap = {
    'ВР': 'Вратарь',
    'ЛЗ': 'Левый защитник',
    'ЦЗ': 'Центр. защитник',
    'ПЗ': 'Правый защитник',
    'ЦОП': 'Опорник',
    'ЦП': 'Центр. полузащитник',
    'ЛЦП': 'Левый центр. полузащитник',
    'ПЦП': 'Правый центр. полузащитник',
    'ЛП': 'Левый полузащитник',
    'ПП': 'Правый полузащитник',
    'ЦАП': 'Атакующий полузащитник',
    'ЛЦАП': 'Левый атакующий полуз.',
    'ПЦАП': 'Правый атакующий полуз.',
    'ЛФА': 'Левый форвард',
    'ПФА': 'Правый форвард',
    'ЛФД': 'Левый форвард',
    'ЦФД': 'Центр. форвард',
    'ПФД': 'Правый форвард',
    'ФРВ': 'Форвард',
    'ЛФРВ': 'Левый форвард',
    'ПФРВ': 'Правый форвард'
  };

  grid.innerHTML = validPlayers.map(p => {
    const roleClass = p.role === 'manager' ? ' manager' : p.role === 'assistant' ? ' assistant' : '';

    // Parse properties whether they exist directly or inside "cells" array
    const position = p.position || (p.cells ? p.cells[2] : '');
    const positionRu = p.positionRu || posMap[position] || position;
    const matches = p.matches !== undefined ? p.matches : (p.cells ? parseInt(p.cells[3]) || 0 : 0);
    const goals = p.goals !== undefined ? p.goals : (p.cells ? parseInt(p.cells[4]) || 0 : 0);
    const assists = p.assists !== undefined ? p.assists : (p.cells ? parseInt(p.cells[5]) || 0 : 0);
    const ratingStr = p.cells ? p.cells[p.cells.length - 1] : '0';

    // Extract join date from the name string if available
    let joinDateRaw = 'Неизвестно';
    const nameCellStr = p.cells ? p.cells[0] : (p.name || '');
    const dateMatch = nameCellStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dateMatch) {
      joinDateRaw = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
    }

    const isNewPlayer = matches === 0;

    return `
      <div class="player-card${roleClass} reveal">
        <div class="player-avatar">
          ${p.avatar ? `<img src="${p.avatar}" alt="${p.name}" class="avatar-img">` : position}
        </div>
        <div class="position">${positionRu}</div>
        <div class="name">${p.name}</div>
        ${isNewPlayer ? '<div class="gamertag">Новый игрок</div>' : `
        <div class="player-stats">
          <div class="player-stat">
            <div class="player-stat-value">${matches}</div>
            <div class="player-stat-label">Матчи</div>
          </div>
          <div class="player-stat">
            <div class="player-stat-value">${goals}</div>
            <div class="player-stat-label">Голы</div>
          </div>
          <div class="player-stat">
            <div class="player-stat-value">${assists}</div>
            <div class="player-stat-label">Ассисты</div>
          </div>
          <div class="player-stat">
            <div class="player-stat-value" style="font-size: 1rem; margin-top: 4px;">${joinDateRaw}</div>
            <div class="player-stat-label">Дата вступления</div>
          </div>
        </div>
        `}
      </div>
    `;
  }).join('');

  // Update about stats
  const statsEl = document.getElementById('aboutStats');
  if (statsEl && validPlayers) {
    const totalPlayers = validPlayers.length;
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="number">${totalPlayers}</div>
        <div class="label">Игроков</div>
      </div>
      <div class="stat-card" id="trophyCount">
        <div class="number">—</div>
        <div class="label">Трофеев</div>
      </div>
      <div class="stat-card">
        <div class="number">2024</div>
        <div class="label">Основана</div>
      </div>
      <div class="stat-card" id="leaguePosition">
        <div class="number">—</div>
        <div class="label">Место в ПЛ</div>
      </div>
    `;
  }

  initRevealAnimations();
}

// ===== League Table Rendering =====
function renderLeague(data) {
  const tbody = document.getElementById('leagueBody');
  if (!tbody || !data?.standings) return;

  tbody.innerHTML = data.standings.map((row, index) => {
    // Parse new cells format
    const pos = row.position ? row.position.split('\t')[0].trim() : (index + 1).toString();
    const team = row.cells ? row.cells[0] : row.team;
    const games = row.cells ? row.cells[1] : row.games;
    const w = row.cells ? row.cells[2] : row.w;
    const d = row.cells ? row.cells[3] : row.d;
    const l = row.cells ? row.cells[4] : row.l;
    const goals = row.cells ? row.cells[5] : row.goals;
    const pts = row.cells ? row.cells[6] : row.pts;

    const isCharisma = team === 'CHARISMA';
    let rowClass = isCharisma ? ' class="highlight-row"' : '';

    const teamName = isCharisma ? `⚔️ ${team}` : team;

    return `
      <tr${rowClass}>
        <td>${pos}</td>
        <td>${teamName}</td>
        <td>${games}</td>
        <td>${w}</td>
        <td>${d}</td>
        <td>${l}</td>
        <td>${goals}</td>
        <td><strong>${pts}</strong></td>
      </tr>
    `;
  }).join('');

  // Update league position in about stats
  const charisma = data.standings.find(r => (r.cells && r.cells[0] === 'CHARISMA') || r.team === 'CHARISMA');
  if (charisma) {
    const posEl = document.getElementById('leaguePosition');
    const pos = charisma.position ? charisma.position.split('\t')[0].trim() : charisma.pos;
    if (posEl) {
      posEl.querySelector('.number').textContent = pos;
    }
  }

  // Show update time
  if (data.updated) {
    const updatedEl = document.getElementById('leagueUpdated');
    if (updatedEl) {
      updatedEl.textContent = `Обновлено: ${formatDate(data.updated)}`;
    }
  }
}

// ===== Cup Path Rendering =====
function renderCup(data) {
  const container = document.getElementById('cupPath');
  if (!container || !data?.matches) return;

  if (data.matches.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #888;">Матчи кубка еще не начались</div>';
    return;
  }

  container.innerHTML = data.matches.map(m => {
    const isWin = m.result === 'win';
    const matchClass = isWin ? 'won' : 'lost';

    const homeName = m.home === 'CHARISMA' ? `<span class="cup-team winner">${m.home} ⚔️</span>` : `<span class="cup-team ${isWin ? 'opponent' : 'winner'}">${m.home}</span>`;
    const awayName = m.away === 'CHARISMA' ? `<span class="cup-team winner">${m.away} ⚔️</span>` : `<span class="cup-team ${isWin ? 'opponent' : 'winner'}">${m.away}</span>`;

    return `
      <div class="cup-match ${matchClass}">
        <div class="cup-round">${m.round}</div>
        <div class="cup-teams">
          ${homeName}
          <div class="cup-score">${m.scoreHome} : ${m.scoreAway}</div>
          ${awayName}
        </div>
        <div class="cup-result ${isWin ? 'win-badge' : 'loss-badge'}">${isWin ? '✓ Победа' : '✕ Поражение'}</div>
      </div>
    `;
  }).join('');
}

// ===== Schedule Rendering =====
function renderSchedule(data) {
  const container = document.getElementById('scheduleList');
  if (!container || !data?.matches) return;

  // 1. Separate matches into Played and Upcoming
  const pastMatches = [];
  const upcomingMatches = [];

  data.matches.forEach(m => {
    let isPlayed = m.score && m.score !== '-:-' && m.score !== '';
    if (isPlayed) {
      pastMatches.push({ ...m, isPlayed });
    } else {
      upcomingMatches.push({ ...m, isPlayed });
    }
  });

  // Sort upcoming chronologically (forward), past matches reverse chronologically (newest played first)
  // Since we don't have exact Date objects easily parsable from "22 янв. 2026", we rely on the original array order.
  // Original array is chronological. So upcoming is already fine. Past should be reversed so newest is at the top.
  pastMatches.reverse();

  // Combine: Upcoming first, then Past
  const sortedMatches = [...upcomingMatches, ...pastMatches];

  // Logic for display:
  // We want to show at least `minVisible` matches. We prioritize showing all Upcoming matches if there are any.
  // If Upcoming < minVisible, we pad with the most recent Past matches up to minVisible.
  // If Upcoming >= minVisible, we still hide the Past matches behind the toggle.
  const minVisible = 5;
  const visibleCount = minVisible;
  const isExpandable = sortedMatches.length > visibleCount;

  const matchesHTML = sortedMatches.map((m, index) => {
    let resultClass = '';

    if (m.isPlayed) {
      const [h, a] = m.score.split(':').map(Number);
      if (!isNaN(h) && !isNaN(a)) {
        if (m.home.includes('CHARISMA')) {
          resultClass = h > a ? 'win' : (h < a ? 'loss' : 'draw');
        } else if (m.away.includes('CHARISMA')) {
          resultClass = a > h ? 'win' : (a < h ? 'loss' : 'draw');
        }
      }
    }

    const hiddenClass = (index >= visibleCount) ? ' hidden-match' : '';

    return `
      <div class="schedule-match ${resultClass}${hiddenClass}" style="${index >= visibleCount ? 'display: none;' : ''}">
        <div class="schedule-meta">
          <span class="schedule-round">${m.round}</span>
          <span class="schedule-date">${m.date}</span>
        </div>
        <div class="schedule-teams">
          <div class="team ${m.home.includes('CHARISMA') ? 'charisma' : ''}">${m.home}</div>
          <div class="score ${m.isPlayed ? 'played' : 'upcoming'}">${m.score || '-:-'}</div>
          <div class="team ${m.away.includes('CHARISMA') ? 'charisma' : ''}">${m.away}</div>
        </div>
      </div>
    `;
  }).join('');

  let buttonHTML = '';
  if (isExpandable) {
    buttonHTML = `
      <div class="schedule-toggle">
        <button id="toggleScheduleBtn" class="btn btn-outline" style="margin-top: 16px; width: 100%;">Показать все матчи 👇</button>
      </div>
    `;
  }

  container.innerHTML = matchesHTML + buttonHTML;

  if (isExpandable) {
    const btn = document.getElementById('toggleScheduleBtn');
    btn.addEventListener('click', () => {
      const hiddenMatches = container.querySelectorAll('.hidden-match');
      const isExpanded = btn.classList.contains('expanded');

      if (isExpanded) {
        hiddenMatches.forEach(el => el.style.display = 'none');
        btn.textContent = 'Показать все матчи 👇';
        btn.classList.remove('expanded');
        document.getElementById('schedule').scrollIntoView({ behavior: 'smooth' });
      } else {
        hiddenMatches.forEach(el => el.style.display = 'flex');
        btn.textContent = 'Свернуть расписание 👆';
        btn.classList.add('expanded');
      }
    });
  }
}

// ===== Trophies Rendering =====
function renderTrophies(data) {
  const grid = document.getElementById('trophiesGrid');
  if (!grid || !data?.achievements) return;

  grid.innerHTML = data.achievements.map(a => {
    let icon = '🏆';
    let titleUpper = a.title.toUpperCase();
    if (titleUpper.includes('СЕРЕБР')) icon = '🥈';
    else if (titleUpper.includes('БРОНЗ')) icon = '🥉';

    // Fallback descriptions if the site scraper missed them or they don't exist
    let desc = a.description;
    if (!desc && titleUpper.includes('БРОНЗОВЫЙ ТРОФЕЙ КУБКА РОССИИ')) {
      desc = 'Выдается за попадание в ТОП-4 (полуфинал) в Кубке России Cyberfootball.online';
    }
    if (!desc && titleUpper.includes('СЕРЕБРЯНЫЙ КУБОК ПФЛ')) {
      desc = 'Выдается за 2-е место в Профессиональной Футбольной Лиге';
    }

    return `
    <div class="trophy-card reveal">
      <div class="trophy-icon" style="font-family: 'Segoe UI Emoji', sans-serif;">${a.iconHtml ? a.iconHtml : icon}</div>
      <h3>${a.title}</h3>
      ${desc ? `<p>${desc}</p>` : ''}
    </div>
    `;
  }).join('');

  // Update trophy count in about stats
  const countEl = document.getElementById('trophyCount');
  if (countEl) {
    countEl.querySelector('.number').textContent = data.achievements.length;
  }

  initRevealAnimations();
}

// ===== Load All Data =====
async function loadAllData() {
  const [squadData, leagueData, cupData, achievementsData, scheduleData] = await Promise.all([
    loadJSON('data/squad.json'),
    loadJSON('data/league.json'),
    loadJSON('data/cup.json'),
    loadJSON('data/achievements.json'),
    loadJSON('data/schedule.json'),
  ]);

  if (squadData) renderSquad(squadData);
  if (leagueData) renderLeague(leagueData);
  if (cupData) renderCup(cupData);
  if (achievementsData) renderTrophies(achievementsData);
  if (scheduleData) renderSchedule(scheduleData);
}


// ===== Navbar Scroll Effect =====
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ===== Mobile Menu =====
function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    links.classList.toggle('open');
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      toggle.classList.remove('active');
      links.classList.remove('open');
    });
  });
}

// ===== Active Nav Link =====
function initActiveLinks() {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-links a');

  const onScroll = () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

// ===== Reveal Animations =====
function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ===== Particles =====
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      animation-duration: ${Math.random() * 20 + 10}s;
      animation-delay: ${Math.random() * 10}s;
      opacity: ${Math.random() * 0.3 + 0.1};
    `;
    container.appendChild(p);
  }
}

// ===== Contact Form =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.textContent = '✓ Отправлено!';
    btn.style.background = 'linear-gradient(135deg, #66bb6a, #43a047)';
    setTimeout(() => {
      btn.textContent = 'Отправить сообщение';
      btn.style.background = '';
      form.reset();
    }, 3000);
  });
}

// ===== Smooth Scroll =====
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initActiveLinks();
  initRevealAnimations();
  initParticles();
  initContactForm();
  initSmoothScroll();
  loadAllData();
});
