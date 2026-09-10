function storageGet(k) {
  try { return localStorage.getItem(k); } catch (err) { return null; }
}
function storageSet(k, v) {
  try { localStorage.setItem(k, v); } catch (err) {}
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

/* Story text lives in story.js. Use the Writer page to change it. */

function story() {
  try {
    var raw = storageGet("cof-story-v1");
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.chapters) return parsed;
    }
  } catch (err) {}
  return window.STORY || { site: { name: "Chains of Fate", tagline: "", book: { slug: "chosen", title: "Chosen", volume: "", blurb: "" } }, chapters: [] };
}
function saveStoryData(s) {
  storageSet("cof-story-v1", JSON.stringify(s));
}
function downloadStoryFile() {
  var text = "window.STORY = " + JSON.stringify(story(), null, 2) + ";\n";
  var blob = new Blob([text], { type: "text/javascript" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "story.js";
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
}
var SITE = story().site;
var chapters = story().chapters;
function refreshGlobals() {
  var s = story();
  SITE = s.site;
  chapters = s.chapters;
}

function liveChapters() {
  var out = [];
  for (var i = 0; i < chapters.length; i++) if (chapters[i].status === "live") out.push(chapters[i]);
  return out;
}
function byId(id) {
  for (var i = 0; i < chapters.length; i++) if (chapters[i].id === id) return chapters[i];
  return null;
}
function arcsList() {
  var seen = {};
  var out = [];
  for (var i = 0; i < chapters.length; i++) {
    var a = chapters[i].arc;
    if (!seen[a]) { seen[a] = true; out.push(a); }
  }
  return out;
}
function commentKey(id) { return "cof-comments:" + id; }
function loadComments(id) {
  try {
    var raw = storageGet(commentKey(id));
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return parsed && parsed.length ? parsed : [];
  } catch (err) { return []; }
}
function saveComment(id, name, body) {
  var all = loadComments(id);
  all.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    name: (name || "Anonymous").replace(/^\s+|\s+$/g, "").slice(0, 40) || "Anonymous",
    body: body.replace(/^\s+|\s+$/g, "").slice(0, 2000),
    at: Date.now()
  });
  storageSet(commentKey(id), JSON.stringify(all));
  return all;
}
function applyTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  storageSet("cof-theme", dark ? "dark" : "light");
}
function parseHash() {
  var h = (location.hash || "#/").replace(/^#/, "");
  var parts = h.split("/").filter(function (p) { return p; });
  if (parts[0] === "book") return { page: "book" };
  if (parts[0] === "write") return { page: "write", id: parts[1] || "" };
  if (parts[0] === "about") return { page: "about" };
  if (parts[0] === "read" && parts[1]) return { page: "read", id: parts[1] };
  return { page: "home" };
}
function shell(inner) {
  var dark = storageGet("cof-theme") === "dark";
  return '<div class="wrap"><header><div class="bar">' +
    '<a class="brand" href="#/">' + escapeHtml(SITE.name) + '</a>' +
    '<div class="tools"><nav>' +
    '<a href="#/">Library</a>' +
    '<a href="#/book">' + escapeHtml(SITE.book.title) + '</a>' +
    '<a href="#/about">About</a>' + (window.LAUNCH ? '' : '<a href="#/write">Writer</a>') + '</nav>' +
    '<label class="theme">Light <input id="theme-slider" type="range" min="0" max="1" step="1" value="' +
    (dark ? "1" : "0") + '" aria-label="Dark mode" /> Dark</label></div></div></header>' +
    '<main>' + inner + '</main>' +
    '<footer>' + escapeHtml(SITE.name) + ' \u00b7 chapters drop one at a time \u00b7 arcs end soft</footer></div>';
}
function homePage() {
  var L = liveChapters();
  var latest = L[L.length - 1];
  var soon = 0;
  for (var i = 0; i < chapters.length; i++) if (chapters[i].status === "soon") soon++;
  var latestBtn = latest ? '<a class="btn btn-ghost" href="#/read/' + latest.id + '">Latest live chapter</a>' : "";
  return '<p class="kicker">' + escapeHtml(SITE.tagline) + '</p>' +
    '<h1>' + escapeHtml(SITE.name) + '</h1>' +
    '<p class="lede">Read like a light novel: one chapter, then the next. When an arc rests, a wire stays live. The rewrite of the full manuscript is not here yet \u2014 these pages are the house it will live in.</p>' +
    '<article class="card"><p class="tiny">' + escapeHtml(SITE.book.volume) + '</p>' +
    '<h2 style="margin-top:0.5rem">' + escapeHtml(SITE.book.title) + '</h2>' +
    '<p class="muted">' + escapeHtml(SITE.book.blurb) + '</p>' +
    '<div class="actions"><a class="btn" href="#/book">Open the table of contents</a>' + latestBtn + '</div>' +
    '<p class="muted" style="margin-top:1rem;font-size:0.9rem">' + L.length + ' live \u00b7 ' + soon + ' listed as coming</p></article>';
}
function bookPage() {
  var arcs = arcsList();
  var html = '<p class="tiny">' + escapeHtml(SITE.book.volume) + '</p><h1>' + escapeHtml(SITE.book.title) + '</h1><p class="lede">' + escapeHtml(SITE.book.blurb) + '</p>';
  for (var a = 0; a < arcs.length; a++) {
    html += '<section class="arc"><h2>' + escapeHtml(arcs[a]) + '</h2><ol style="list-style:none;padding:0;margin:0">';
    for (var i = 0; i < chapters.length; i++) {
      var c = chapters[i];
      if (c.arc !== arcs[a]) continue;
      var action = c.status === "live" ? '<a href="#/read/' + c.id + '">Read</a>' : '<span class="muted">Coming</span>';
      html += '<li class="row"><div><h3>' + c.number + '. ' + escapeHtml(c.title) + '</h3><p class="muted" style="margin:0.35rem 0 0;font-size:0.9rem">' + escapeHtml(c.teaser) + '</p></div>' + action + '</li>';
    }
    html += '</ol></section>';
  }
  return html;
}
function aboutPage() {
  return '<h1>How this house works</h1><div class="muted" style="margin-top:1.5rem">' +
    '<p>' + escapeHtml(SITE.name) + ' is a serial light novel site. Each chapter is a full scene, not a recap. They go up one by one. An arc can rest without pretending the story is over.</p>' +
    '<p>Comments do not use accounts. You type a display name each time. On this copy, they stay in the browser on this computer.</p></div>';
}
function commentsBlock(id) {
  var items = loadComments(id).slice().reverse();
  var list = "";
  if (!items.length) list = '<li class="muted" style="font-size:0.9rem">No comments on this chapter yet.</li>';
  else for (var i = 0; i < items.length; i++) {
    var c = items[i];
    list += '<li><p class="cname">' + escapeHtml(c.name) + '</p><p class="cbody">' + escapeHtml(c.body) + '</p><p class="cwhen">' + escapeHtml(new Date(c.at).toLocaleString()) + '</p></li>';
  }
  return '<section class="comments"><h2>Comments</h2>' +
    '<p class="muted" style="font-size:0.9rem">No accounts. Type a name and leave a note. Names are not verified.</p>' +
    '<form id="c-form"><label for="c-name">Name</label>' +
    '<input id="c-name" type="text" maxlength="40" />' +
    '<label for="c-body">Comment</label>' +
    '<textarea id="c-body" maxlength="2000"></textarea>' +
    '<p class="err" id="c-err" hidden></p>' +
    '<button class="btn" type="submit" style="margin-top:1rem">Post</button></form>' +
    '<ul class="clist">' + list + '</ul></section>';
}
function readPage(id) {
  var chapter = byId(id);
  if (!chapter) return '<h1>Chapter missing</h1><p><a href="#/">Library</a></p>';
  if (chapter.status !== "live") {
    return '<p class="tiny">' + escapeHtml(chapter.arc) + '</p><h1>' + chapter.number + '. ' + escapeHtml(chapter.title) + '</h1>' +
      '<p class="lede">' + escapeHtml(chapter.teaser) + '</p>' +
      '<p class="muted">This chapter is listed so the spine is honest. It is not written into the house yet.</p>' +
      '<p style="margin-top:2rem"><a href="#/book">Back to contents</a></p>';
  }
  var L = liveChapters();
  var idx = -1;
  for (var i = 0; i < L.length; i++) if (L[i].id === id) idx = i;
  var prev = idx > 0 ? L[idx - 1] : null;
  var next = idx >= 0 && idx < L.length - 1 ? L[idx + 1] : null;
  var paras = "";
  for (var p = 0; p < chapter.body.length; p++) paras += "<p>" + escapeHtml(chapter.body[p]) + "</p>";
  var left = prev ? '<a href="#/read/' + prev.id + '">\u2190 ' + prev.number + '. ' + escapeHtml(prev.title) + '</a>' : '<span class="muted">Start of the live run</span>';
  var right = next ? '<a href="#/read/' + next.id + '">' + next.number + '. ' + escapeHtml(next.title) + ' \u2192</a>' : '<span class="muted">Caught up</span>';
  return '<p class="tiny">' + escapeHtml(chapter.arc) + '</p><h1>' + chapter.number + '. ' + escapeHtml(chapter.title) + '</h1>' +
    '<p class="muted" style="font-size:0.9rem">' + escapeHtml(chapter.teaser) + '</p>' +
    '<article style="margin-top:2.5rem">' + paras + '</article>' +
    '<nav class="chapter-nav">' + left + right + '</nav>' + commentsBlock(chapter.id);
}

function writerPage() {
  var list = "";
  for (var i = 0; i < chapters.length; i++) {
    var c = chapters[i];
    list += '<li><button type="button" class="pick" data-id="' + escapeHtml(c.id) + '">' +
      c.number + ". " + escapeHtml(c.title || "Untitled") +
      ' <span class="tiny">' + (c.status === "live" ? "Live" : "Coming") + "</span></button></li>";
  }
  return '<p class="kicker">Writer</p><h1>Add a chapter without code</h1>' +
    '<p class="lede">Fill the form. Save. It shows up in the library on this computer. To put that text on a host or another PC, download story.js and replace the one in this folder.</p>' +
    '<div class="actions">' +
    '<button type="button" class="btn" id="w-new">New chapter</button>' +
    '<button type="button" class="btn btn-ghost" id="w-dl">Download story.js</button>' +
    '<button type="button" class="btn btn-ghost" id="w-reset">Reset to sample</button></div>' +
    '<p class="muted" id="w-note" style="margin-top:0.75rem"></p>' +
    '<div class="writer">' +
    '<ol class="w-list">' + (list || "<li class=muted>No chapters yet.</li>") + "</ol>" +
    '<form id="w-form" class="w-form">' +
    '<label>Title<input id="w-title" type="text" /></label>' +
    '<label>Arc (same wording groups chapters)<input id="w-arc" type="text" /></label>' +
    '<label>Number<input id="w-num" type="number" /></label>' +
    '<label>Status<select id="w-status"><option value="live">Live (readers can open it)</option><option value="soon">Coming (listed only)</option></select></label>' +
    '<label>One-line hook<input id="w-teaser" type="text" /></label>' +
    '<label>Chapter text (blank line starts a new paragraph)<textarea id="w-body"></textarea></label>' +
    '<input type="hidden" id="w-id" />' +
    '<div class="actions"><button class="btn" type="submit">Save chapter</button>' +
    '<button class="btn btn-ghost" type="button" id="w-del">Remove</button></div>' +
    "</form></div>";
}
function fillWriter(c) {
  document.getElementById("w-id").value = c.id;
  document.getElementById("w-title").value = c.title || "";
  document.getElementById("w-arc").value = c.arc || "";
  document.getElementById("w-num").value = c.number || 1;
  document.getElementById("w-status").value = c.status === "soon" ? "soon" : "live";
  document.getElementById("w-teaser").value = c.teaser || "";
  document.getElementById("w-body").value = (c.body || []).join("\n\n");
}
function bindWriter() {
  var note = document.getElementById("w-note");
  function say(t) { if (note) note.textContent = t; }
  var picks = document.querySelectorAll(".pick");
  for (var i = 0; i < picks.length; i++) {
    picks[i].addEventListener("click", function () {
      var id = this.getAttribute("data-id");
      var c = byId(id);
      if (c) fillWriter(c);
    });
  }
  if (chapters[0]) fillWriter(chapters[0]);
  document.getElementById("w-new").onclick = function () {
    var n = 1;
    for (var i = 0; i < chapters.length; i++) if (chapters[i].number >= n) n = chapters[i].number + 1;
    fillWriter({ id: "ch-" + Date.now(), number: n, title: "", arc: "Arc I · Intake", status: "live", teaser: "", body: [] });
    say("Fill this in, then save.");
  };
  document.getElementById("w-dl").onclick = function () { downloadStoryFile(); say("Save that file into this folder as story.js, replacing the old one."); };
  document.getElementById("w-reset").onclick = function () {
    storageSet("cof-story-v1", "");
    refreshGlobals();
    render();
  };
  document.getElementById("w-del").onclick = function () {
    if (!confirm("Remove this chapter from the list?")) return;
    var id = document.getElementById("w-id").value;
    var s = story();
    s.chapters = s.chapters.filter(function (c) { return c.id !== id; });
    saveStoryData(s);
    refreshGlobals();
    render();
  };
  document.getElementById("w-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var bodyRaw = document.getElementById("w-body").value;
    var paras = bodyRaw.split(/\n\s*\n/).map(function (p) { return p.replace(/^\s+|\s+$/g, ""); }).filter(Boolean);
    var ch = {
      id: document.getElementById("w-id").value || ("ch-" + Date.now()),
      title: document.getElementById("w-title").value.replace(/^\s+|\s+$/g, "") || "Untitled",
      arc: document.getElementById("w-arc").value.replace(/^\s+|\s+$/g, "") || "Arc",
      number: Number(document.getElementById("w-num").value) || 1,
      status: document.getElementById("w-status").value === "soon" ? "soon" : "live",
      teaser: document.getElementById("w-teaser").value.replace(/^\s+|\s+$/g, ""),
      body: paras
    };
    var s = story();
    var found = false;
    for (var i = 0; i < s.chapters.length; i++) {
      if (s.chapters[i].id === ch.id) { s.chapters[i] = ch; found = true; break; }
    }
    if (!found) s.chapters.push(ch);
    s.chapters.sort(function (a, b) { return a.number - b.number; });
    saveStoryData(s);
    refreshGlobals();
    render();
  });
}

function render() {
  refreshGlobals();
  var route = parseHash();
  var inner = homePage();
  if (route.page === "book") inner = bookPage();
  if (route.page === "about") inner = aboutPage();
  if (route.page === "read") inner = readPage(route.id);
  if (route.page === "write") inner = window.LAUNCH ? homePage() : writerPage();
  document.getElementById("app").innerHTML = shell(inner);
  document.title = SITE.name;
  var slider = document.getElementById("theme-slider");
  if (slider) slider.addEventListener("input", function () { applyTheme(slider.value === "1"); });
  var form = document.getElementById("c-form");
  if (route.page === "write") bindWriter();
  if (form && route.id) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = document.getElementById("c-body").value;
      var err = document.getElementById("c-err");
      if (!body.replace(/^\s+|\s+$/g, "")) {
        err.hidden = false;
        err.textContent = "Write something first.";
        return;
      }
      saveComment(route.id, document.getElementById("c-name").value, body);
      render();
    });
  }
}
if (storageGet("cof-theme") === "dark") document.documentElement.classList.add("dark");
window.addEventListener("hashchange", render);
function start() {
  try { render(); }
  catch (err) {
    var el = document.getElementById("app");
    if (el) el.textContent = "Could not draw the page: " + err;
  }
}
if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", start);
else start();
