const postId = Number(document.body.dataset.post);
let post;
async function load() {
  try {
    const data = await api("/posts/" + postId);
    post = data.post;
    document.title = post.title + " · Notes";
    $("#article").innerHTML =
      `<p class="article-topic">${esc(post.topic)}${post.published ? "" : " · Private draft"}</p><h1>${esc(post.title)}</h1><p class="byline">${esc(post.author)} · ${dateLabel(post.created)} · ${Math.max(1, Math.ceil(post.body.split(/\s+/).length / 200))} min read</p><div class="article-body"></div>`;
    $(".article-body").textContent = post.body;
    $("#owner-actions").innerHTML =
      currentUser?.id === post.owner_id
        ? `<a href="/write?edit=${post.id}" class="text-button">Edit article</a><button class="text-button" id="delete-post">Delete article</button>`
        : "";
    if ($("#delete-post"))
      $("#delete-post").onclick = async () => {
        if (!confirm("Delete this article and its comments?")) return;
        try {
          await api("/posts/" + post.id, "DELETE");
          location.href = "/";
        } catch (e) {
          toast(e.message);
        }
      };
    $("#comment-count").textContent =
      data.comments.length +
      " " +
      (data.comments.length === 1 ? "comment" : "comments");
    $("#comments").innerHTML = data.comments.length
      ? data.comments
          .map(
            (c) =>
              `<article class="comment"><header><span>${esc(c.author)}</span><time>${dateLabel(c.created)}</time>${currentUser?.id === c.owner_id ? `<button data-delete="${c.id}">Delete</button>` : ""}</header><p>${esc(c.body)}</p></article>`,
          )
          .join("")
      : '<p class="small muted">No comments yet.</p>';
    $$("[data-delete]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (!confirm("Delete your comment?")) return;
          try {
            await api("/comments/" + b.dataset.delete, "DELETE");
            load();
          } catch (e) {
            toast(e.message);
          }
        }),
    );
    $("#comment-form-container").innerHTML = !post.published
      ? '<p class="signin-prompt">Comments will be available when you publish.</p>'
      : currentUser
        ? '<form id="comment-form"><label>Your comment<textarea name="body" required maxlength="2000" rows="3" placeholder="Add to the conversation…"></textarea></label><p class="error" role="alert"></p><button class="button primary" type="submit">Post comment</button></form>'
        : '<p class="signin-prompt"><button class="subtle-link" id="comment-signin">Sign in</button> to join the conversation.</p>';
    if ($("#comment-signin"))
      $("#comment-signin").onclick = () =>
        authDialog(() => {
          setupNav();
          load();
        });
    if ($("#comment-form"))
      $("#comment-form").onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target,
          b = f.querySelector("button");
        b.disabled = true;
        try {
          await api(
            "/posts/" + postId + "/comments",
            "POST",
            Object.fromEntries(new FormData(f)),
          );
          await load();
        } catch (e) {
          f.querySelector(".error").textContent = e.message;
        } finally {
          b.disabled = false;
        }
      };
  } catch (e) {
    $("#article").innerHTML = `<p class="error">${esc(e.message)}</p>`;
    $(".comments").hidden = true;
  }
}
setupNav()
  .then(load)
  .catch((e) => toast(e.message));
