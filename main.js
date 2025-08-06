let slsData = null;
let isAdmin = false;

// Load data from localStorage or JSON
async function loadData() {
  const stored = localStorage.getItem("slsData");
  if (stored) {
    slsData = JSON.parse(stored);
  } else {
    const resp = await fetch("data/default-data.json");
    slsData = await resp.json();
  }
}

// Save to localStorage and re-render all
function saveAndRerender() {
  localStorage.setItem("slsData", JSON.stringify(slsData));
  renderAll();
}

// Check admin code
function initAdmin() {
  const adminBtn = document.getElementById("admin-btn");
  if (!adminBtn) return;
  
  adminBtn.onclick = () => {
    if (isAdmin) {
      isAdmin = false;
      renderAll();
      adminBtn.textContent = "Admin Login";
      return;
    }
    
    const code = prompt("Enter admin code");
    if (code === "azurial123") {
      isAdmin = true;
      renderAll();
      adminBtn.textContent = "Admin Logout";
    }
  };
}

// Render every section
function renderAll() {
  renderLeague();
  renderPlayers();
  renderFixtures();
  renderNews();
}

// ===== League =====
function renderLeague() {
  const tbody = document.getElementById("league-table");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  // Sort teams by points, then GD, then GF
  const sortedTeams = [...slsData.teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  
  sortedTeams.forEach((team, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>
        ${team.logo ? `<img src="${team.logo}" alt="${team.name}" class="team-logo">` : ''}
        ${team.name}
      </td>
      <td>${team.played}</td>
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td>${team.gf}</td>
      <td>${team.ga}</td>
      <td>${team.gd}</td>
      <td><strong>${team.points}</strong></td>
      <td>${isAdmin ? `<button onclick="openTeamForm(${slsData.teams.findIndex(t => t.name === team.name)})">✎</button>` : ""}</td>
    `;
    tbody.appendChild(tr);
  });
  
  // Add team button
  const actionsContainer = document.getElementById("table-actions");
  if (actionsContainer) {
    actionsContainer.innerHTML = isAdmin ? 
      `<button onclick="openTeamForm()" class="admin-action-btn">Add Team</button>` : 
      "";
  }
}

function openTeamForm(idx) {
  const isEdit = idx !== undefined;
  const team = isEdit ? slsData.teams[idx] : { name: "", logo: "", played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  
  const form = document.createElement("form");
  form.className = "card mb-4";
  form.innerHTML = `
    <h3 class="text-xl font-semibold mb-4">${isEdit ? "Edit" : "Add"} Team</h3>
    <input name="name" value="${team.name}" placeholder="Team name" required class="mb-3">
    <input name="logo" value="${team.logo || ''}" placeholder="Logo URL" class="mb-3">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label>Played</label>
        <input name="played" type="number" value="${team.played}" min="0" class="mb-3">
      </div>
      <div>
        <label>Wins</label>
        <input name="wins" type="number" value="${team.wins}" min="0" class="mb-3">
      </div>
      <div>
        <label>Draws</label>
        <input name="draws" type="number" value="${team.draws}" min="0" class="mb-3">
      </div>
      <div>
        <label>Losses</label>
        <input name="losses" type="number" value="${team.losses}" min="0" class="mb-3">
      </div>
      <div>
        <label>Goals For</label>
        <input name="gf" type="number" value="${team.gf}" min="0" class="mb-3">
      </div>
      <div>
        <label>Goals Against</label>
        <input name="ga" type="number" value="${team.ga}" min="0" class="mb-3">
      </div>
    </div>
    <div class="flex gap-2 mt-4">
      <button type="submit" class="admin-action-btn">Save</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </div>
  `;
  
  form.onsubmit = e => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const updated = {
      name: formData.get("name"),
      logo: formData.get("logo"),
      played: parseInt(formData.get("played")),
      wins: parseInt(formData.get("wins")),
      draws: parseInt(formData.get("draws")),
      losses: parseInt(formData.get("losses")),
      gf: parseInt(formData.get("gf")),
      ga: parseInt(formData.get("ga")),
      gd: parseInt(formData.get("gf")) - parseInt(formData.get("ga")),
      points: (parseInt(formData.get("wins")) * 3) + parseInt(formData.get("draws"))
    };
    
    if (isEdit) {
      slsData.teams[idx] = updated;
    } else {
      slsData.teams.push(updated);
    }
    
    saveAndRerender();
    form.remove();
  };
  
  form.querySelector(".cancel-btn").onclick = () => form.remove();
  
  const container = document.querySelector("#league-table").parentNode;
  container.insertBefore(form, container.firstChild);
}

// ===== Players =====
function renderPlayers() {
  const sections = [
    { id: "goals-list", key: "goals", title: "Goals", container: ".goals-actions" },
    { id: "assists-list", key: "assists", title: "Assists", container: ".assists-actions" },
    { id: "tackles-list", key: "tackles", title: "Tackles", container: ".tackles-actions" },
    { id: "saves-list", key: "saves", title: "Saves", container: ".saves-actions" }
  ];
  
  sections.forEach(section => {
    const container = document.getElementById(section.id);
    if (!container) return;
    
    container.innerHTML = "";
    
    // Admin actions
    const actionsContainer = document.querySelector(section.container);
    if (actionsContainer) {
      actionsContainer.innerHTML = isAdmin ? 
        `<button onclick="openPlayerForm('${section.key}')" class="admin-action-btn">Add Player</button>` : 
        "";
    }
    
    // Filter players with stats in this category
    const playersWithStats = slsData.players.filter(p => p[section.key] > 0);
    
    // Sort and display
    playersWithStats
      .sort((a, b) => b[section.key] - a[section.key])
      .slice(0, 8) // Show top 8
      .forEach((player, index) => {
        const div = document.createElement("div");
        div.className = "leaderboard-item";
        div.innerHTML = `
          <div>
            <div class="font-semibold">${index+1}. ${player.name}</div>
            <div class="text-sm text-gray-400">${player.team}</div>
          </div>
          <div class="text-xl font-bold">${player[section.key]}</div>
          ${isAdmin ? `<button onclick="openPlayerForm('${section.key}', ${slsData.players.indexOf(player)})">✎</button>` : ""}
        `;
        container.appendChild(div);
      });
    
    // Add "no data" message if empty
    if (playersWithStats.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-gray-500">No ${section.title.toLowerCase()} data available</div>`;
    }
  });
}

function openPlayerForm(category, idx) {
  const isEdit = idx !== undefined;
  const player = isEdit ? slsData.players[idx] : { name: "", team: "", goals: 0, assists: 0, tackles: 0, saves: 0 };
  
  const form = document.createElement("form");
  form.className = "card mb-4";
  form.innerHTML = `
    <h3 class="text-xl font-semibold mb-4">${isEdit ? "Edit" : "Add"} Player</h3>
    <input name="name" value="${player.name}" placeholder="Player name" required class="mb-3">
    <input name="team" value="${player.team}" placeholder="Team" required class="mb-3">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label>Goals</label>
        <input name="goals" type="number" value="${player.goals}" min="0" class="mb-3">
      </div>
      <div>
        <label>Assists</label>
        <input name="assists" type="number" value="${player.assists}" min="0" class="mb-3">
      </div>
      <div>
        <label>Tackles</label>
        <input name="tackles" type="number" value="${player.tackles}" min="0" class="mb-3">
      </div>
      <div>
        <label>Saves</label>
        <input name="saves" type="number" value="${player.saves}" min="0" class="mb-3">
      </div>
    </div>
    <div class="flex gap-2 mt-4">
      <button type="submit" class="admin-action-btn">Save</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </div>
  `;
  
  form.onsubmit = e => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const updated = {
      name: formData.get("name"),
      team: formData.get("team"),
      goals: parseInt(formData.get("goals")),
      assists: parseInt(formData.get("assists")),
      tackles: parseInt(formData.get("tackles")),
      saves: parseInt(formData.get("saves"))
    };
    
    if (isEdit) {
      slsData.players[idx] = updated;
    } else {
      slsData.players.push(updated);
    }
    
    saveAndRerender();
    form.remove();
  };
  
  form.querySelector(".cancel-btn").onclick = () => form.remove();
  
  // Find the container for the category we're editing
  const containerId = category ? `${category}-list` : "goals-list";
  const container = document.getElementById(containerId);
  if (container) {
    container.parentNode.insertBefore(form, container);
  }
}

// ===== Fixtures =====
function renderFixtures() {
  // Upcoming matches
  const upcomingContainer = document.getElementById("upcoming-list");
  if (upcomingContainer) {
    upcomingContainer.innerHTML = "";
    
    // Admin actions
    const actionsContainer = document.querySelector(".upcoming-actions");
    if (actionsContainer) {
      actionsContainer.innerHTML = isAdmin ? 
        `<button onclick="openFixtureForm(false)" class="admin-action-btn">Add Fixture</button>` : 
        "";
    }
    
    const upcoming = slsData.fixtures.filter(f => !f.played);
    
    if (upcoming.length === 0) {
      upcomingContainer.innerHTML = `<div class="text-center py-4 text-gray-500">No upcoming matches</div>`;
    } else {
      upcoming.forEach((fixture, index) => {
        const div = document.createElement("div");
        div.className = "fixture-item";
        div.innerHTML = `
          <div class="text-right">${fixture.home}</div>
          <div class="text-center">
            <div>${formatDate(fixture.date)}</div>
            <div class="text-xs text-gray-400">${fixture.time || "TBD"}</div>
          </div>
          <div>${fixture.away}</div>
          ${isAdmin ? `<button onclick="openFixtureForm(true, ${index})">✎</button>` : ""}
        `;
        upcomingContainer.appendChild(div);
      });
    }
  }
  
  // Past results
  const resultsContainer = document.getElementById("results-list");
  if (resultsContainer) {
    resultsContainer.innerHTML = "";
    
    // Admin actions
    const actionsContainer = document.querySelector(".results-actions");
    if (actionsContainer) {
      actionsContainer.innerHTML = isAdmin ? 
        `<button onclick="openFixtureForm(true)" class="admin-action-btn">Add Result</button>` : 
        "";
    }
    
    const results = slsData.fixtures.filter(f => f.played);
    
    if (results.length === 0) {
      resultsContainer.innerHTML = `<div class="text-center py-4 text-gray-500">No results available</div>`;
    } else {
      results.forEach((fixture, index) => {
        const div = document.createElement("div");
        div.className = "fixture-item";
        div.innerHTML = `
          <div class="text-right">${fixture.home}</div>
          <div class="text-center font-bold text-xl">${fixture.score || "TBD"}</div>
          <div>${fixture.away}</div>
          ${isAdmin ? `<button onclick="openFixtureForm(true, ${index + slsData.fixtures.filter(f => !f.played).length})">✎</button>` : ""}
        `;
        resultsContainer.appendChild(div);
      });
    }
  }
}

function openFixtureForm(isResult, idx) {
  const isEdit = idx !== undefined;
  const fixture = isEdit ? slsData.fixtures[idx] : { 
    home: "", 
    away: "", 
    date: new Date().toISOString().split('T')[0], 
    time: "20:00",
    score: "",
    played: isResult
  };
  
  const form = document.createElement("form");
  form.className = "card mb-4";
  form.innerHTML = `
    <h3 class="text-xl font-semibold mb-4">${isEdit ? "Edit" : "Add"} ${isResult ? "Result" : "Fixture"}</h3>
    <input name="home" value="${fixture.home}" placeholder="Home Team" required class="mb-3">
    <input name="away" value="${fixture.away}" placeholder="Away Team" required class="mb-3">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label>Date</label>
        <input name="date" type="date" value="${fixture.date}" required class="mb-3">
      </div>
      <div>
        <label>Time</label>
        <input name="time" type="time" value="${fixture.time || "20:00"}" class="mb-3">
      </div>
    </div>
    ${isResult ? `
      <div>
        <label>Score (e.g., 2-1)</label>
        <input name="score" value="${fixture.score || ""}" placeholder="Score" class="mb-3">
      </div>
    ` : ''}
    <div class="flex gap-2 mt-4">
      <button type="submit" class="admin-action-btn">Save</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </div>
  `;
  
  form.onsubmit = e => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const updated = {
      home: formData.get("home"),
      away: formData.get("away"),
      date: formData.get("date"),
      time: formData.get("time"),
      score: formData.get("score") || "",
      played: isResult
    };
    
    if (isEdit) {
      slsData.fixtures[idx] = updated;
    } else {
      slsData.fixtures.push(updated);
    }
    
    saveAndRerender();
    form.remove();
  };
  
  form.querySelector(".cancel-btn").onclick = () => form.remove();
  
  const container = isResult ? 
    document.getElementById("results-list") : 
    document.getElementById("upcoming-list");
  
  if (container) {
    container.parentNode.insertBefore(form, container);
  }
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return "TBD";
  const options = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// ===== News =====
function renderNews() {
  const feed = document.getElementById("news-feed");
  if (!feed) return;
  
  feed.innerHTML = "";
  
  // Admin actions
  const actionsContainer = document.getElementById("news-actions");
  if (actionsContainer) {
    actionsContainer.innerHTML = isAdmin ? 
      `<button onclick="openNewsForm()" class="admin-action-btn">Add News</button>` : 
      "";
  }
  
  // Add news items
  slsData.news.forEach((post, index) => {
    const div = document.createElement("div");
    div.className = "news-item";
    div.innerHTML = `
      ${post.image ? `<img src="${post.image}" alt="${post.title}">` : ""}
      <div class="flex justify-between items-start">
        <div>
          <div class="text-sm text-gray-400 mb-1">${post.date}</div>
          <h3 class="text-xl font-bold mb-2">${post.title}</h3>
          <p class="text-gray-300">${post.body}</p>
        </div>
        ${isAdmin ? `<button onclick="openNewsForm(${index})">✎</button>` : ""}
      </div>
    `;
    feed.appendChild(div);
  });
  
  // Add "no news" message if empty
  if (slsData.news.length === 0) {
    feed.innerHTML = `<div class="text-center py-8 text-gray-500">No news available</div>`;
  }
}

function openNewsForm(idx) {
  const isEdit = idx !== undefined;
  const post = isEdit ? slsData.news[idx] : { 
    title: "", 
    body: "", 
    image: "", 
    date: new Date().toISOString().split('T')[0] 
  };
  
  const form = document.createElement("form");
  form.className = "card mb-4";
  form.innerHTML = `
    <h3 class="text-xl font-semibold mb-4">${isEdit ? "Edit" : "Add"} News</h3>
    <input name="title" value="${post.title}" placeholder="Title" required class="mb-3">
    <input name="date" type="date" value="${post.date}" required class="mb-3">
    <input name="image" value="${post.image}" placeholder="Image URL" class="mb-3">
    <textarea name="body" placeholder="News content" required rows="4" class="mb-3">${post.body}</textarea>
    <div class="flex gap-2 mt-4">
      <button type="submit" class="admin-action-btn">Publish</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </div>
  `;
  
  form.onsubmit = e => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const updated = {
      title: formData.get("title"),
      date: formData.get("date"),
      body: formData.get("body"),
      image: formData.get("image")
    };
    
    if (isEdit) {
      slsData.news[idx] = updated;
    } else {
      slsData.news.unshift(updated);
    }
    
    saveAndRerender();
    form.remove();
  };
  
  form.querySelector(".cancel-btn").onclick = () => form.remove();
  
  const container = document.getElementById("news-feed");
  if (container) {
    container.parentNode.insertBefore(form, container);
  }
}

// Initialize
window.onload = async () => {
  await loadData();
  initAdmin();
  renderAll();
  
  // Add admin action button styles
  const style = document.createElement("style");
  style.textContent = `
    .admin-action-btn {
      background: rgba(56, 189, 248, 0.3);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.875rem;
    }
    
    .admin-action-btn:hover {
      background: rgba(56, 189, 248, 0.5);
    }
    
    .cancel-btn {
      background: rgba(100, 116, 139, 0.3);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.875rem;
    }
    
    .cancel-btn:hover {
      background: rgba(100, 116, 139, 0.5);
    }
  `;
  document.head.appendChild(style);
};