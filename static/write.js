let editing = null,
  myPosts = [];
function wordCount() {
  const n = $("#body").value.trim().split(/\s+/).filter(Boolean).length;
  $("#word-count").textContent = n + " " + (n === 1 ? "word" : "words");
  $("#reading-time").textContent =
    Math.max(1, Math.ceil(n / 200)) + " min read";
}
function edit(p) {
  editing = p?.id || null;
  $("#post-form").reset();
  if (p) {
    $("#title").value = p.title;
    $("#body").value = p.body;
    $("#post-form").elements.topic.value = p.topic;
  }
  $("#editor-label").textContent = p
    ? p.published
      ? "Edit published article"
      : "Edit draft"
    : "New article";
  $("#editor-message").textContent = "";
  history.replaceState(null, "", editing ? "/write?edit=" + editing : "/write");
  wordCount();
}
async function loadMine() {
  myPosts = await api("/posts?mine=1");
  $("#my-posts").innerHTML = myPosts.length
    ? myPosts
        .map(
          (p) =>
            `<article class="my-post"><h3>${esc(p.title)}</h3><div class="row"><span class="badge">${p.published ? "Published" : "Draft"}</span><div class="my-post-controls"><button class="text-button" data-edit="${p.id}">Edit</button><a href="/read/${p.id}">View</a></div></div></article>`,
        )
        .join("")
    : '<p class="small muted">Your first article will appear here.</p>';
  $$("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        edit(myPosts.find((p) => p.id === Number(b.dataset.edit)));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }),
  );
}
$("#new-article").onclick = () => edit();
$("#body").oninput = wordCount;
$("#post-form").onsubmit = async (e) => {
  e.preventDefault();
  if (!currentUser) return authDialog(() => location.reload());
  const buttons = $$("#post-form [type=submit]");
  buttons.forEach((b) => (b.disabled = true));
  const data = Object.fromEntries(new FormData(e.target));
  data.published = e.submitter?.value === "publish";
  try {
    const p = await api(
      "/posts" + (editing ? "/" + editing : ""),
      editing ? "PUT" : "POST",
      data,
    );
    editing = p.id;
    history.replaceState(null, "", "/write?edit=" + editing);
    $("#editor-label").textContent = p.published
      ? "Edit published article"
      : "Edit draft";
    $("#editor-message").className = "success";
    $("#editor-message").textContent = p.published
      ? "Your article has been published."
      : "Draft saved. Only you can see it.";
    await loadMine();
  } catch (e) {
    $("#editor-message").className = "error";
    $("#editor-message").textContent = e.message;
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
};
(async () => {
  await setupNav();
  if (!currentUser) {
    $("#post-form").inert = true;
    authDialog(() => location.reload());
    $("#editor-message").textContent = "Sign in to start writing.";
    return;
  }
  await loadMine();
  const id = Number(new URLSearchParams(location.search).get("edit"));
  if (id) {
    const p = myPosts.find((p) => p.id === id);
    if (p) edit(p);
    else toast("You can only edit your own articles.");
  }
})().catch((e) => toast(e.message));
