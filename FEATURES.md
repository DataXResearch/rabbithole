# Rabbithole Extension Features

## Core Organization

- **Rabbitholes**: Top-level containers for organizing broad topics.
- **Burrows**: Sub-projects within Rabbitholes to group specific research trails.
- **Websites**: Saved links with metadata (title, description, favicon, OpenGraph image).

## Browsing & Visualization

- **Timeline View**: Visual history of saved websites in a burrow, organized by date.
- **Burrow Home**: Pinned active tabs for a specific burrow.
- **New Tab Dashboard**: Replaces the new tab page with the Rabbithole interface.
- **Overlay/Popup**: Quick access to save pages or switch contexts without leaving the current page.

## Data Management

- **Save Context**: Save individual tabs or all open tabs in a window to the active burrow.
- **Restore Context**: Open all pinned tabs for a burrow in one click.
- **Search Everywhere**: Global fuzzy search (Cmd+K) across rabbitholes, burrows, and websites.
- **Import/Export**: Backup and restore data via JSON files. Import existing browser bookmarks and tab groups/windows at any time via settings.
- **Local Storage**: All data stored locally using IndexedDB.

## First-Time Setup

- **Onboarding Flow**: A guided tutorial introduces core concepts (Rabbitholes, Burrows, Overlay, Sync, Search, Semble) on first install.
- **Bookmark Import**: Optionally import existing browser bookmarks during onboarding or via settings. Bookmark folders become Rabbitholes, subfolders become Burrows.
- **Tab Group Import**: Optionally import open windows and tab groups during onboarding or via settings. Windows become Rabbitholes, tab groups become Burrows.
- **Dark Mode Selection**: Choose light or dark theme during onboarding, changeable at any time.

## Social & Sync (Semble/AT Protocol)

- **Identity**: Sign in with Bluesky/AT Protocol handle.
- **Publishing**: Publish Rabbitholes as curated collections to the Semble network.
- **Sync**: Update published collections with local changes.

## Customization

- **Dark Mode**: Support for light and dark themes.
- **UI Preferences**: Adjustable overlay alignment.
