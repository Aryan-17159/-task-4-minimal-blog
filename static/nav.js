async function setupNav() {
  await sessionReady();
  $("#account-link").textContent = currentUser ? "Sign out" : "Sign in";
  $("#account-link").onclick = async () => {
    if (currentUser) {
      await api("/logout", "POST", {});
      location.href = "/";
    } else authDialog();
  };
  ["write-link", "aside-write"].forEach((id) => {
    const a = $("#" + id);
    if (a)
      a.onclick = (e) => {
        if (!currentUser) {
          e.preventDefault();
          authDialog(() => (location.href = "/write"));
        }
      };
  });
  return currentUser;
}
