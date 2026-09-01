import Rabbithole from "src/lib/Rabbithole.svelte";
import { initPostHog } from "src/utils/posthog";
import { MessageRequest } from "src/utils";
import { getLLMProvider } from "src/lib/llm";

// global styles
import "./styles.css";

const target = document.getElementById("app");

function render() {
  new Rabbithole({
    target,
  });
}

const testTabs = [
  { title: "GitHub - rabbithole/rabbithole", url: "github.com/rabbithole" },
  { title: "MDN WebExtensions AI API", url: "developer.mozilla.org" },
  { title: "Reddit - r/firefox", url: "reddit.com/r/firefox" },
  { title: "ATProto OAuth spec", url: "atproto.com" },
];
const testRabbitholes = [
  "Rabbithole extension dev",
  "ATProto research",
  "Goofing off",
];

async function testAI() {
  const result = await getLLMProvider((info) => {
    console.log(`[ai] ${info.type}${info.progress ? ` ${(info.progress * 100).toFixed(0)}%` : ""}${info.message ? ` — ${info.message}` : ""}`);
  });

  if (!result) {
    console.log("[ai] No on-device AI provider available");
    return;
  }

  console.log(`[ai] using ${result.type} provider`);

  try {
    for (const tab of testTabs) {
      const res = await result.provider.classify(tab.title, testRabbitholes);
      console.log(
        `[ai] "${tab.title}" → ${res.label} (${(res.score * 100).toFixed(1)}%)`,
      );
    }
  } catch (err) {
    console.error("[ai] error:", err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Check if analytics is enabled before initializing PostHog
  const response = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_SETTINGS,
  });
  if (response?.analyticsEnabled) {
    initPostHog();
  }
  render();

  // Add a test button (requires user gesture for permission requests)
  const btn = document.createElement("button");
  btn.textContent = "Test AI";
  btn.style.cssText =
    "position:fixed;bottom:10px;right:10px;z-index:99999;padding:8px 14px;" +
    "background:#4dabf7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;";
  btn.addEventListener("click", () => testAI());
  document.body.appendChild(btn);
});
