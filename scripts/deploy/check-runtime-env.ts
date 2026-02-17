#!/usr/bin/env bun

const required = [
  "OPENCLAW_TOKEN",
  "GITHUB_APP_ID",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_WEBHOOK_SECRET"
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error("Missing required env variables:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log("All required runtime env variables are present.");
