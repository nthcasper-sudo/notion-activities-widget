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

let isLoading = false;

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

  activities.forEach((item) => {
    const li = document.createElement("li");
    li.dataset.id = item.id;

    const main = document.createElement("div");
    main.className = "activity-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;

    const text = document.createElement("span");
    text.className = "activity-text" + (item.done ? " done" : "");
    text.textContent = item.text;

    checkbox.addEventListener("change", () =>
      toggleDone(item.id, checkbox.checked)
    );

    main.appendChild(checkbox);
    main.appendChild(text);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteActivity(item.id));

    li.appendChild(main);
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

// initial load
loadActivities();

// auto refresh every second
setInterval(loadActivities, 1000);
