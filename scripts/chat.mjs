/**
 * Far Field Chat Card System
 * Provides "send to chat" functionality for character and vessel sheet features.
 */

/**
 * Build track box HTML for chat cards
 * @param {object} track - { total, marked, burned }
 * @returns {string} HTML string
 */
function renderTrackHTML(track) {
  if (!track || !track.total) return "";
  let html = '<div class="ff-chat-track">';
  for (let i = 1; i <= track.total; i++) {
    const classes = ["ff-chat-box"];
    if (i <= track.burned) classes.push("burned");
    else if (i <= track.marked) classes.push("marked");
    html += `<span class="${classes.join(" ")}"></span>`;
  }
  html += `<span class="ff-chat-track-label">${track.marked}/${track.total}`;
  if (track.burned > 0) html += ` (${track.burned} burned)`;
  html += "</span></div>";
  return html;
}

/**
 * Post a feature card to Foundry chat
 * @param {Actor} actor - The actor sending the message
 * @param {object} data - Feature data
 * @param {string} data.title - Feature name
 * @param {string} [data.subtitle] - Category label (e.g. "Edge", "Aspect")
 * @param {string} [data.description] - Feature description text
 * @param {string[]} [data.tags] - Tag labels to display as pills
 * @param {object} [data.track] - Track visualization { total, marked, burned }
 */
export async function postFeatureToChat(actor, data) {
  const tags = (data.tags || [])
    .map(t => `<span class="ff-chat-tag">${t}</span>`)
    .join("");

  const content = `
    <div class="ff-chat-card">
      <div class="ff-chat-header">
        <span class="ff-chat-title">${data.title}</span>
        ${data.subtitle ? `<span class="ff-chat-subtitle">${data.subtitle}</span>` : ""}
      </div>
      ${tags ? `<div class="ff-chat-tags">${tags}</div>` : ""}
      ${data.description ? `<div class="ff-chat-description">${data.description}</div>` : ""}
      ${renderTrackHTML(data.track)}
    </div>
  `;

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}
