# Connections catalog: how to connect each tool a participant asks for

Read this when they want to connect a tool ("אני רוצה לחבר את…", "תחבר לי את…"), or when a task
needs one of their systems. Nothing here runs on its own and nothing is offered before they ask.
(Aviv, 19.11.2026: "שברגע שהם ישאלו... הוא ידע מה האפשרויות שלו", and "לעשות להם את החיים קלים".)
Composio coverage was checked against composio.dev/toolkits on 19.11.2026.

🔴 **These are options, not limits** (Aviv, 19.11.2026: "שלא נגביל אותם... זה יהיה הצעה, אבל אם הם
המשיכו לשאול... ימשיך לחפש עוד אופציות. אולי יש דברים שאנחנו לא מכירים"). Offer what is here first.
If it does not fit, or they ask for more, search the web for what exists today (tools, APIs and
Composio toolkits are added every month; composio.dev/toolkits/<name> answers in one fetch) and bring
them the new options too. Never present this list as everything there is.

## First: what already works stays as it is

Many arrive with connections already made: connectors on their Claude account, tools already linked
in Composio, keys already in Railway variables, or a list in `from-my-computer/connectors.txt`
(the earlier cohorts, see "Bringing over what they built" in machine.md). Before you offer anything,
check what already works for the system they asked about, with one read-only action. Working? Use
it and say so in one line. Never replace, reconnect, remove or "improve" a connection that works,
and never move them to another route unless they ask. This catalog is only for what is missing.

## The order, for every system

1. **A Claude connector** they already added on claude.ai (tools named `mcp__claude_ai_...`). Already here? Use it.
2. **Composio** (the section "Connecting their tools: Composio" in machine.md). One approval per tool.
3. **The system's own official API.** You write the small script; they bring ONE thing: the API key
   from the system's settings. You lead them there screen by screen, in plain Hebrew. The key goes
   into a Railway variable exactly as in "Keys and secrets" in machine.md, never into the chat and
   never into a file in /data/work.
4. **Unofficial tools, last**, only after you said plainly that it is unofficial and what can go
   wrong, and they said yes.

Always: read-only first. Sending, publishing, deleting and anything with money needs their approval.
Before you write a script for an API, find the system's official API documentation on the web
and read it; never guess an endpoint. Tell them in one line what the connection lets you do.

## In Composio (route 2)

| What | Composio toolkit |
|---|---|
| Gmail, Google Calendar, Drive, Sheets, Docs | gmail, googlecalendar, googledrive, googlesheets, googledocs |
| Outlook, OneDrive/SharePoint, Teams | outlook, sharepoint, microsoft_teams |
| Notion, Monday, Airtable, ClickUp, Asana, Trello-like tools | notion, monday, airtable, clickup, asana |
| HubSpot, Pipedrive, Salesforce, **Fireberry** (Powerlink) | hubspot, pipedrive, salesforce, fireberry |
| Calendly, Zoom | calendly, zoom |
| Instagram, Facebook, TikTok, LinkedIn, YouTube | instagram, facebook, tiktok, linkedin, youtube |
| Google Business Profile | google_business_profile |
| Meta ads, Google Ads, TikTok ads | metaads, googleads, tiktok_ads |
| Wix, Shopify, WordPress.com | wix, shopify, wordpress_com |
| Typeform, Jotform | typeform, jotform |
| Canva, Mailchimp | canva, mailchimp |
| Stripe, PayPal, Square, QuickBooks, Xero | stripe, paypal, square, quickbooks, xero |
| Telegram, Discord, Twilio | telegram, discord, twilio |
| WhatsApp (official) and Kapso | whatsapp, kapso |

## Not in Composio: the system's own API (route 3)

Israeli systems most small businesses here use. Each has an official API; what they bring is the
key (sometimes a key and a secret, or an ID and a token) from the system's settings.

| Area | Systems |
|---|---|
| Invoices and receipts | חשבונית ירוקה (Morning), iCount, Sumit, EZcount |
| Card payments | PayPlus, Cardcom, Tranzila, Grow (משולם) |
| Email and SMS marketing | ActiveTrail, Smoove, רב מסר, InforU, 019 |
| Phone system | Voicenter |
| Accounting / ERP | פריוריטי, חשבשבת (usually through their IT person or the software's vendor) |
| Self-hosted WordPress and WooCommerce | WordPress REST API with an Application Password; WooCommerce REST API keys |

Most of the site-builders here are WordPress on their own hosting, not WordPress.com: ask which.

## AI models: images, video and voice (OpenAI, Gemini and others)

Claude writes and builds; for images, video or a voice conversation the agent calls another model.
- **In Composio, with their own API key:** `openai` (images, image editing, speech, Realtime voice
  sessions), `gemini` (text, images, video), `replicate` (many open models), `runway` (video).
  The key is from their account at that company (platform.openai.com, aistudio.google.com) and is
  entered on Composio's screen, never in the chat. 🔴 Say first: these are paid per use, on their own
  card at that company, separate from Claude; suggest a monthly spending limit in that account.
- **Which model:** models change every few weeks. Before using one, check the company's official
  docs for the current best model for the job (images, video, voice) and tell them its name in one line.
- **A voice conversation** (a voice agent on a page, or answering the phone) is not a one-time action:
  it is an agent that runs as its own Railway service ("Building an agent" in machine.md), using
  OpenAI's Realtime API or Gemini's Live API, and Twilio (in Composio) for a phone number.
  The keys go in that service's Railway variables.

## Video and podcasts

| What | Route |
|---|---|
| YouTube, Vimeo, Wistia, Dropbox, Canva, HeyGen, ElevenLabs | Composio: youtube, vimeo, wistia, dropbox, canva, heygen, elevenlabs |
| Transcription (Hebrew included) | Composio: assemblyai, deepgram; or ElevenLabs |
| Rendering video in the cloud from a template | Composio: shotstack, creatomate (paid per render) |
| Publishing a podcast episode | The hosting service's API: Transistor (developers.transistor.fm) or Buzzsprout. The episode reaches Spotify and Apple from there, through the RSS feed |
| Spotify | Composio `spotify` reads shows, episodes and playlists. Spotify has no API to upload an episode: it comes from the podcast host, or they upload in Spotify for Creators themselves |
| Riverside | API only on Riverside's Business plan (through their sales). Otherwise they export the file to Drive or Dropbox and you work from there |
| Descript, CapCut, Opus Clip | Not in Composio. They stay tools they use by hand; you prepare the script, the cut list, the titles and the captions |

**Editing on this machine:** cutting silences, short clips for reels and stories, Hebrew captions
burned in, audio cleanup and thumbnails, with ffmpeg. It is not in the image; install it once on the
persistent disk without root (no `ffmpeg` on the PATH and none in `~/.local/bin`? Then
`npm install -g ffmpeg-static && mkdir -p ~/.local/bin && ln -sf "$(npm root -g)/ffmpeg-static/ffmpeg" ~/.local/bin/ffmpeg`,
and check `ffmpeg -version`). Short videos only: long or many videos load this machine and
raise their Railway bill, so for those offer the cloud rendering above.

## WhatsApp: all the options, so they choose

Say first, in one line: for an agent that writes to customers, it is best to give it its own number,
so a mistake or a block never touches the business's main WhatsApp.

**Official (safe, Meta's rules):**
- **Kapso** (in Composio, `kapso`): the simplest official route, recommended first.
- **Meta's WhatsApp Cloud API** (in Composio, `whatsapp`): official, more setup in Meta Business.
- **Twilio** (in Composio) or **360dialog**: official providers, paid per message.
Official means: a verified Business account, approved message templates for messages that start a
conversation, and free replies within 24 hours of the customer's last message.

**Unofficial (works on a regular WhatsApp number, with risk):**
- **Green API**, **WAHA**, **Evolution API**: they log in like WhatsApp Web.
🔴 Say it plainly before anything: Meta can block a number used this way, without warning and without
appeal. Never on the business's main number. Never for messages to people who did not write first.

## What you say when it is not possible right now

There is always a way (the rule from session 3): official connector, Composio, the system's API, an
email forward, or a scraping service for public pages. "אי אפשר" is not an answer. If a system has no
API at all, say so in one line and offer the next best route.
