let posts = [],
  topic = "All";
const minutes = (p) =>
  Math.max(1, Math.ceil(p.body.trim().split(/\s+/).length / 200));
function excerpt(body) {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length <= 155
    ? clean
    : clean.slice(0, 155).replace(/\s+\S*$/, "") + "…";
}
function render() {
  const q = $("#search").value.toLowerCase(),
    rows = posts.filter(
      (p) =>
        (topic === "All" || p.topic === topic) &&
        `${p.title} ${p.body} ${p.author}`.toLowerCase().includes(q),
    );
  $("#feed").innerHTML = rows.length
    ? rows
        .map(
          (p) =>
            `<a href="/read/${p.id}" class="article-row"><time class="article-date">${dateLabel(p.created)}<span>${p.created.slice(0, 4)}</span></time><div><h2>${esc(p.title)}</h2><p>${esc(excerpt(p.body))}</p><div class="article-meta"><span>${esc(p.author)}</span><span>·</span><span class="topic">${esc(p.topic)}</span><span>·</span><span>${minutes(p)} min read</span></div></div></a>`,
        )
        .join("")
    : '<div class="empty"><p>No articles found. Try another topic or search.</p></div>';
  $("#article-count").textContent = posts.length;
}
$$("[data-topic]").forEach(
  (b) =>
    (b.onclick = () => {
      topic = b.dataset.topic;
      $$("[data-topic]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      render();
    }),
);
$("#search").oninput = render;
(async () => {
  await setupNav();
  posts = await api("/posts");
  render();
})().catch((e) => {
  $("#feed").innerHTML =
    '<p class="error">Could not load articles. Please reload.</p>';
  toast(e.message);
});
