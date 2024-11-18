import { ImageFirmwareVersion, imageIsNewer } from "../mcumgr/ImageManager";

export interface Changelog {
    release: ImageFirmwareVersion | null;
    dev: ImageFirmwareVersion | null;
    versions: VersionDetail[];
}

export interface VersionDetail {
    version: ImageFirmwareVersion;
    isObsolete: boolean;
    isDev: boolean;
    highlight: string | null;
    date: string | null;
    summary: string | null; // For minor releases
    changes: string[];
}

export function parseChangelog(markdown: string): Changelog {
    const lines = markdown.split('\n');
    const changelog: Changelog = {
        release: null,
        dev: null,
        versions: []
    };

    let currentVersion: VersionDetail | null = null;
    let collectingSummary = false;

    lines.forEach(line => {
        line = line.trim(); // Trim whitespace

        if (line.startsWith('#')) {
            const versionMatch = line.match(
                /# (\d+)\.(\d+)\.(\d+)(?:\[(.*?)\])?\s*(.*?)\s*((?:-\w+\s*)*)$/
            );

            if (versionMatch) {
                const major = parseInt(versionMatch[1], 10);
                const minor = parseInt(versionMatch[2], 10);
                const revision = parseInt(versionMatch[3], 10);

                const changeVersion: ImageFirmwareVersion = {
                    versionString: `${major}.${minor}.${revision}`,
                    major: major,
                    minor: minor,
                    revision: revision,
                };

                const date = versionMatch[4] ? versionMatch[4].trim() : null;
                const highlight = versionMatch[5].trim();
                const flagsString = versionMatch[6];
                const flags = flagsString
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean); // Remove empty strings

                // Set the flags for obsolete and dev
                const isObsolete = flags.includes('-obsolete');
                const isDev = flags.includes('-dev');

                // Set as latest release or dev if not obsolete
                if (!isObsolete) {
                    if (!changelog.dev || imageIsNewer(changelog.dev, changeVersion)) {
                        changelog.dev = changeVersion;
                    }
                    if (!isDev) {
                        if (!changelog.release || imageIsNewer(changelog.release, changeVersion)) {
                            changelog.release = changeVersion;
                        }
                    }
                }

                // Prepare to collect summary if it's a minor release (revision === 0)
                collectingSummary = revision === 0;

                currentVersion = {
                    version: changeVersion,
                    isObsolete: isObsolete,
                    isDev: isDev,
                    highlight: highlight || null,
                    date: date,
                    summary: null, // Initialize summary as null
                    changes: []
                };

                changelog.versions.push(currentVersion);
            }
        } else if (line.startsWith('-')) {
            // If it's a change line
            const change = line.substring(1).trim(); // Remove dash and trim
            if (currentVersion) {
                currentVersion.changes.push(change); // Add to current version
                collectingSummary = false; // Stop collecting summary after first change
            }
        } else if (line !== '') { // Non-empty line
            if (currentVersion && collectingSummary) {
                // Collect summary lines for minor releases
                if (currentVersion.version.revision === 0) {
                    if (currentVersion.summary) {
                        currentVersion.summary += '\n'; // Add newline between summary lines
                    } else {
                        currentVersion.summary = ''; // Initialize summary
                    }
                    currentVersion.summary += line; // Add line to summary
                }
            }
        }
    });

    return changelog;
}
