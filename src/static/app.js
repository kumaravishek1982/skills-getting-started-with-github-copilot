document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const emailInput = document.getElementById("email");
  const messageBox = document.getElementById("message");

  function showMessage(text, type = "info") {
    messageBox.className = `message ${type}`;
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
    setTimeout(() => messageBox.classList.add("hidden"), 4000);
  }

  async function fetchActivities() {
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      renderActivities(data);
      populateSelect(data);
    } catch (err) {
      activitiesList.innerHTML = `<p class="error">Could not load activities.</p>`;
      console.error(err);
    }
  }

  function renderActivities(data) {
    activitiesList.innerHTML = "";
    Object.entries(data).forEach(([name, info]) => {
      const card = document.createElement("div");
      card.className = "activity-card";

      card.innerHTML = `
        <h4>${escapeHtml(name)} ${info.participants.length >= info.max_participants ? '<span class="badge-full">Full</span>' : ''}</h4>
        <p class="desc">${escapeHtml(info.description)}</p>
        <p class="schedule"><strong>Schedule:</strong> ${escapeHtml(info.schedule)}</p>
        <div class="participants-section">
          <strong>Participants (${info.participants.length}/${info.max_participants}):</strong>
          ${renderParticipantsList(info.participants)}
        </div>
      `;

      activitiesList.appendChild(card);
    });
  }

  function renderParticipantsList(participants) {
    if (!participants || participants.length === 0) {
      return `<p class="no-participants">No participants yet.</p>`;
    }
    const items = participants.map(p => `<li class="participant-item">${escapeHtml(p)}</li>`).join("");
    return `<ul class="participants-list">${items}</ul>`;
  }

  function populateSelect(data) {
    // Keep the default option; remove others
    const currentVal = activitySelect.value || "";
    activitySelect.querySelectorAll("option[data-generated]").forEach(o => o.remove());
    Object.keys(data).forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      opt.setAttribute("data-generated", "1");
      activitySelect.appendChild(opt);
    });
    // try to keep previous selection
    if (currentVal) activitySelect.value = currentVal;
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const activityName = activitySelect.value;
    if (!email || !activityName) {
      showMessage("Please enter your email and select an activity.", "error");
      return;
    }

    try {
      const res = await fetch(`/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Signup failed" }));
        throw new Error(err.detail || "Signup failed");
      }
      const data = await res.json();
      showMessage(data.message || "Signed up successfully!", "success");
      emailInput.value = "";
      await fetchActivities();
    } catch (err) {
      showMessage(err.message || "Error during signup", "error");
      console.error(err);
    }
  });

  // Basic HTML-escaping to avoid rendering user data as HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Initial load
  fetchActivities();
});
