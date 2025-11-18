import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rajjvletbhnhwcnaaitv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhamp2bGV0YmhuaHdjbmFhaXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODQ2NjIsImV4cCI6MjA3OTA2MDY2Mn0.NSX98DeUXqnqCN8680ln9XUYG85eyebx7Dsn4KaszB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const listEl = document.getElementById("activity-list");
const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("activity-input");

async function loadActivities() {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

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
  const { data, error } = await supabase
    .from("activities")
    .insert({ text })
    .select()
    .single();

  if (error) {
    console.error("Error adding activity", error);
    return;
  }

  // Optimistic update: prepend new item
  const current = Array.from(listEl.children)
    .map((li) => li.__data)
    .filter(Boolean);
  renderActivities([data, ...current]);
}

async function toggleDone(id, done) {
  const { error } = await supabase
    .from("activities")
    .update({ done })
    .eq("id", id);

  if (error) {
    console.error("Error updating activity", error);
    // You could reload to stay in sync
    loadActivities();
  } else {
    // Update UI class without full reload
    const li = listEl.querySelector(`li[data-id="${id}"]`);
    if (li) {
      const text = li.querySelector(".activity-text");
      if (text) {
        text.classList.toggle("done", done);
      }
    }
  }
}

async function deleteActivity(id) {
  const { error } = await supabase.from("activities").delete().eq("id", id);

  if (error) {
    console.error("Error deleting activity", error);
    return;
  }

  const li = listEl.querySelector(`li[data-id="${id}"]`);
  if (li) {
    li.remove();
  }
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  formEl.querySelector("button").disabled = true;

  try {
    await addActivity(text);
    inputEl.value = "";
  } finally {
    formEl.querySelector("button").disabled = false;
  }
});

// Initial load
loadActivities();
