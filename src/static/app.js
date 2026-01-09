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
      card.setAttribute('data-activity', name);

      card.innerHTML = `
        <h4>${escapeHtml(name)} ${info.participants.length >= info.max_participants ? '<span class="badge-full">Full</span>' : ''}</h4>
        <p class="desc">${escapeHtml(info.description)}</p>
        <p class="schedule"><strong>Schedule:</strong> ${escapeHtml(info.schedule)}</p>
          <div class="participants-section">
            <strong>Participants (${info.participants.length}/${info.max_participants}):</strong>
            ${renderParticipantsList(info.participants, name)}
          </div>
      `;

      activitiesList.appendChild(card);
        // Attach remove handlers for participant remove buttons
        card.querySelectorAll('.remove-btn').forEach(b => {
          b.addEventListener('click', handleRemoveParticipant);
        });
    });
  }

  // Update the participants list in the DOM immediately after signup
  function updateLocalParticipants(activityName, email) {
    const card = activitiesList.querySelector(`[data-activity="${activityName}"]`);
    if (!card) return;
    const list = card.querySelector('.participants-list');
    // if no list, replace "No participants yet." with a new list
    if (!list) {
      const section = card.querySelector('.participants-section');
      if (!section) return;
      section.querySelector('.no-participants')?.remove();
      const ul = document.createElement('ul');
      ul.className = 'participants-list';
      section.appendChild(ul);
    }
    const targetList = card.querySelector('.participants-list');
    // Avoid duplicates
    if (Array.from(targetList.querySelectorAll('.participant-item')).some(li => li.textContent.includes(email))) return;
    const li = document.createElement('li');
    li.className = 'participant-item';
    li.innerHTML = `${escapeHtml(email)} <button class="remove-btn" data-email="${escapeHtml(email)}" data-activity="${escapeHtml(activityName)}" aria-label="Remove participant">✖</button>`;
    targetList.appendChild(li);
    // attach handler
    li.querySelector('.remove-btn')?.addEventListener('click', handleRemoveParticipant);
    // update count text
    const strong = card.querySelector('.participants-section strong');
    if (strong) {
      const m = strong.textContent.match(/Participants \((\d+)\/(\d+)\):/);
      if (m) {
        const current = parseInt(m[1], 10) + 1;
        strong.textContent = `Participants (${current}/${m[2]}):`;
      }
    }
  }

    function renderParticipantsList(participants, activityName) {
    if (!participants || participants.length === 0) {
      return `<p class="no-participants">No participants yet.</p>`;
    }
      const items = participants.map(p =>
        `<li class="participant-item">${escapeHtml(p)} <button class="remove-btn" data-email="${escapeHtml(p)}" data-activity="${escapeHtml(activityName)}" aria-label="Remove participant">✖</button></li>`
      ).join("");
      return `<ul class="participants-list">${items}</ul>`;
  }

    async function handleRemoveParticipant(e) {
      e.preventDefault();
      const btn = e.currentTarget;
      const email = btn.getAttribute('data-email');
      const activityName = btn.getAttribute('data-activity');
      if (!email || !activityName) return;
      if (!confirm(`Remove ${email} from ${activityName}?`)) return;
      try {
        const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participant?email=${encodeURIComponent(email)}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Remove failed' }));
          throw new Error(err.detail || 'Remove failed');
        }
        const data = await res.json();
        showMessage(data.message || 'Participant removed', 'success');
        await fetchActivities();
      } catch (err) {
        showMessage(err.message || 'Error removing participant', 'error');
        console.error(err);
      }
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
      // update UI immediately, then refresh from server to keep in sync
      updateLocalParticipants(activityName, email);
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
