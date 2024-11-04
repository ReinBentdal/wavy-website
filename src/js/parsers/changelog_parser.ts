import { ImageFirmwareVersion, imageIsNewer } from "../mcumgr/ImageManager";

export interface Changelog {
    release: ImageFirmwareVersion | null;
    dev: ImageFirmwareVersion | null;
    versions: {
        version: ImageFirmwareVersion;
        isObsolete: boolean;
        isDev: boolean;
        highlight: string | null;
        date: string | null;
        changes: string[];
    }[];
}

export function parseChangelog(markdown: string): Changelog {
    const lines = markdown.split('\n');
    const changelog: Changelog = {
        release: null,
        dev: null,
        versions: []
    };

    let currentVersion: {
        version: ImageFirmwareVersion;
        isObsolete: boolean;
        isDev: boolean;
        highlight: string | null;
        date: string | null;  // Added date field
        changes: string[];
    } | null = null;

    lines.forEach(line => {
        line = line.trim(); // Trim whitespace

        if (line.startsWith('#')) {
            const versionMatch = line.match(
                /# (\d+)\.(\d+)\.(\d+)(?:\[(.*?)\])?\s*(.*?)\s*((?:-\w+\s*)*)$/
            );

            if (versionMatch) {
                const changeVersion: ImageFirmwareVersion = {
                    versionString: `${parseInt(versionMatch[1], 10)}.${parseInt(versionMatch[2], 10)}.${parseInt(versionMatch[3], 10)}`,
                    major: parseInt(versionMatch[1], 10),
                    minor: parseInt(versionMatch[2], 10),
                    revision: parseInt(versionMatch[3], 10),
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

                // Push new version into versions list
                currentVersion = {
                    version: changeVersion,
                    isObsolete: isObsolete,
                    isDev: isDev,
                    highlight: highlight || null,
                    date: date,
                    changes: []
                };
                changelog.versions.push(currentVersion);
            }
        } else if (line.startsWith('-')) {
            // If it's a change line
            const change = line.substring(1).trim(); // Remove dash and trim
            if (currentVersion) {
                currentVersion.changes.push(change); // Add to current version
            }
        }
    });

    return changelog;
}
