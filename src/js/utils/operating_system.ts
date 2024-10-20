enum OperatingSystem {
    Windows = "Windows",
    MacOS = "MacOS",
    Linux = "Linux/Unix",
    Android = "Android",
    iOS = "iOS",
    Unknown = "Unknown"
}

export function getOS(): OperatingSystem {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;

    if (platform.startsWith('Win') || userAgent.indexOf('Win') !== -1) {
        return OperatingSystem.Windows;
    } else if (platform.startsWith('Mac') || userAgent.indexOf('Mac') !== -1) {
        return OperatingSystem.MacOS;
    } else if (platform.startsWith('Linux') || platform === 'X11' || userAgent.indexOf('Linux') !== -1) {
        return OperatingSystem.Linux;
    } else if (/Android/i.test(userAgent)) {
        return OperatingSystem.Android;
    } else if (/iPhone|iPad|iPod/i.test(userAgent) || /iOS/i.test(platform)) {
        return OperatingSystem.iOS;
    } else {
        return OperatingSystem.Unknown;
    }
}