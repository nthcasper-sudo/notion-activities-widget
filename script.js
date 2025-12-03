import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rajjvletbhnhwcnaaitv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhamp2bGV0YmhuaHdjbmFhaXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODQ2NjIsImV4cCI6MjA3OTA2MDY2Mn0.NSX98DeUXqnqCN8680ln9XUYG85eyebx7Dsn4KaszB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const listEl = document.getElementById("activity-list");
const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("activity-input");
const appEl = document.querySelector(".app");
const addButtonEl = formEl.querySelector('button[type="submit"]');
const cursor = document.getElementById("cursor");

let isLoading = false;

// emails loaded from Supabase settings table
let personAEmail = null;
let personBEmail = null;

async function loadSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("person_a_email, person_b_email")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Error loading settings", error);
    return;
  }

  console.log("Loaded settings:", data);

  personAEmail = data?.person_a_email || null;
  personBEmail = data?.person_b_email || null;
}

async function loadActivities() {
  if (isLoading) return;
  isLoading = true;

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  isLoading = false;

  if (error) {
    console.error("Error loading activities", error);
    listEl.innerHTML = "<li>Could not load activities.</li>";
    return;
  }

  renderActivities(data);
}

function renderActivities(activities) {
  listEl.innerHTML = "";

  const total = activities.length;

  activities.forEach((item, index) => {
    const li = document.createElement("li");
    li.dataset.id = item.id;

    // Numbering (07., 06., 05., etc)
    const number = document.createElement("span");
    number.className = "activity-number";
    const displayNumber = total - index;
    number.textContent = displayNumber.toString().padStart(2, "0") + ".";

    // Activity text only
    const text = document.createElement("span");
    text.className = "activity-text";
    text.textContent = item.text;

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // don't trigger calendar when deleting
      deleteActivity(item.id);
    });

    li.appendChild(number);
    li.appendChild(text);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  });
}

async function addActivity(text) {
  const { error } = await supabase.from("activities").insert({ text });

  if (error) {
    console.error("Error adding activity", error);
    return;
  }

  // Reload full list so both sides stay in sync
  await loadActivities();
}

async function toggleDone(id, done) {
  const { error } = await supabase
    .from("activities")
    .update({ done })
    .eq("id", id);

  if (error) {
    console.error("Error updating activity", error);
  }

  // Reload to stay synced with any other changes
  await loadActivities();
}

async function deleteActivity(id) {
  const { error } = await supabase.from("activities").delete().eq("id", id);

  if (error) {
    console.error("Error deleting activity", error);
    return;
  }

  // Reload list after delete
  await loadActivities();
}

// tiny heart animation when you add an activity
function spawnHeart() {
  if (!appEl || !addButtonEl) return;

  const heart = document.createElement("span");
  heart.className = "heart-pop";
  heart.textContent = "❤";

  const buttonRect = addButtonEl.getBoundingClientRect();
  const appRect = appEl.getBoundingClientRect();

  const x = buttonRect.left + buttonRect.width / 2 - appRect.left;
  const y = buttonRect.top - appRect.top;

  heart.style.left = `${x}px`;
  heart.style.top = `${y}px`;

  appEl.appendChild(heart);

  heart.addEventListener("animationend", () => {
    heart.remove();
  });
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  const button = formEl.querySelector("button");
  button.disabled = true;

  try {
    await addActivity(text);
    inputEl.value = "";
    spawnHeart();
  } finally {
    button.disabled = false;
  }
});

// open google calendar helper
function openCalendarWithTitle(title) {
  if (!title) return;

  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const textParam = `&text=${encodeURIComponent(title)}`;

  let url = base + textParam;

  // if settings loaded correctly, add both as guests
  if (personAEmail && personBEmail) {
    // format: &add=email1,email2
    const guestsParam = `&add=${encodeURIComponent(
      `${personAEmail},${personBEmail}`
    )}`;
    url += guestsParam;

    console.log("Calendar URL:", url);
  } else {
    console.warn("Guests not set, opening calendar without guests", {
      personAEmail,
      personBEmail,
    });
  }

  window.open(url, "_blank");
}

// custom cursor follow
window.addEventListener("mousemove", (e) => {
  if (!cursor) return;
  cursor.style.top = e.clientY + "px";
  cursor.style.left = e.clientX + "px";
});

// hover ONLY on .activity-text
listEl.addEventListener("mouseover", (e) => {
  const textEl = e.target.closest(".activity-text");
  if (textEl && cursor) {
    cursor.classList.add("cursor-copy");
    cursor.textContent = "CAL";
  }
});

listEl.addEventListener("mouseout", (e) => {
  const textEl = e.target.closest(".activity-text");
  if (textEl && cursor) {
    cursor.classList.remove("cursor-copy");
    cursor.textContent = "";
  }
});

// click anywhere in li opens Google Calendar
listEl.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;

  const text = li.querySelector(".activity-text")?.textContent.trim();
  if (!text) return;

  openCalendarWithTitle(text);
});

// initial loads
loadSettings();
loadActivities();

// auto refresh every second
setInterval(loadActivities, 1000);
