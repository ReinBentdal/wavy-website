export type OperatingSystem = 'Windows' | 'MacOS' | 'Linux' | 'Android' | 'iOS' | 'Unknown';

export function getOperatingSystem(): OperatingSystem {
    const userAgent = navigator.userAgent;

    if (userAgent.indexOf('Win') !== -1) {
        return 'Windows';
    } else if (userAgent.indexOf('Mac') !== -1 && userAgent.indexOf('iPhone') === -1 && userAgent.indexOf('iPad') === -1) {
        return 'MacOS';
    } else if (userAgent.indexOf('Linux') !== -1 && userAgent.indexOf('Android') === -1) {
        return 'Linux';
    } else if (/Android/i.test(userAgent)) {
        return 'Android';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        return 'iOS';
    }

    return 'Unknown';
}