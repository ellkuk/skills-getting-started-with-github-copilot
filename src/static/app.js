document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function _createRemoveButton(activity, email) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.dataset.activity = activity;
    removeButton.dataset.email = email;
    removeButton.setAttribute("aria-label", `Unregister ${email} from ${activity}`);
    removeButton.title = "Unregister participant";
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v6m4-6v6" />
      </svg>
    `;
    return removeButton;
  }

  function _createParticipantRow(activity, email) {
    const participant = document.createElement("li");
    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;
    participant.append(participantEmail, _createRemoveButton(activity, email));
    return participant;
  }

  function _createParticipantsSection(activity, participants) {
    const section = document.createElement("div");
    section.className = "participants-section";
    const heading = document.createElement("h5");
    heading.textContent = "Participants";
    section.appendChild(heading);

    if (participants.length > 0) {
      const list = document.createElement("ul");
      list.className = "participants-list";
      participants.forEach((email) => list.appendChild(_createParticipantRow(activity, email)));
      section.appendChild(list);
    } else {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "participants-empty";
      emptyMessage.textContent = "No participants yet";
      section.appendChild(emptyMessage);
    }

    return section;
  }

  function _createActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";
    const spotsLeft = details.max_participants - details.participants.length;
    activityCard.innerHTML = `
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p><strong>Schedule:</strong> ${details.schedule}</p>
      <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
    `;
    activityCard.appendChild(_createParticipantsSection(name, details.participants));
    return activityCard;
  }

  async function _sendSignupRequest(activity, email, method) {
    const response = await fetch(
      `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
      { method }
    );
    return { response, result: await response.json() };
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load activities");
      }
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        activitiesList.appendChild(_createActivityCard(name, details));

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");
    if (!removeButton) {
      return;
    }

    removeButton.disabled = true;
    const { activity, email } = removeButton.dataset;

    try {
      const { response, result } = await _sendSignupRequest(activity, email, "DELETE");

      if (!response.ok) {
        showMessage(result.detail || "Unable to unregister participant", "error");
        removeButton.disabled = false;
        return;
      }

      showMessage(result.message, "success");
      await fetchActivities();
    } catch (error) {
      showMessage("Failed to unregister participant. Please try again.", "error");
      removeButton.disabled = false;
      console.error("Error unregistering participant:", error);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const { response, result } = await _sendSignupRequest(activity, email, "POST");

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
