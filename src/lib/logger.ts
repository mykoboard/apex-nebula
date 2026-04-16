const isDev = import.meta.env.DEV;

export type LogCategory = 'machine' | 'action' | 'net' | 'ledger' | 'info' | 'warn' | 'error';

const getInitialSettings = (): Record<LogCategory, boolean> => {
    const defaultSettings: Record<LogCategory, boolean> = {
        machine: isDev,
        action: isDev,
        net: isDev,
        ledger: isDev,
        info: isDev,
        warn: true,
        error: true,
    };

    try {
        const stored = localStorage.getItem('apex_nebula_debug_config');
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch { 
        // Ignore storage errors
    }

    return defaultSettings;
};

let settings = getInitialSettings();

export const logger = {
    shouldLog: (category: LogCategory) => {
        return settings[category];
    },

    machine: (label: string, data?: any) => {
        if (!logger.shouldLog('machine')) return;
        console.log(
            `%c[MACHINE] %c%s`,
            'color: #10b981; font-weight: bold;',
            'color: inherit;',
            label,
            data !== undefined ? data : ''
        );
    },

    action: (label: string, data?: any) => {
        if (!logger.shouldLog('action')) return;
        console.log(
            `%c[ACTION] %c%s`,
            'color: #f59e0b; font-weight: bold;',
            'color: inherit;',
            label,
            data !== undefined ? data : ''
        );
    },

    net: (label: string, data?: any) => {
        if (!logger.shouldLog('net')) return;
        console.log(
            `%c[NET] %c%s`,
            'color: #3b82f6; font-weight: bold;',
            'color: inherit;',
            label,
            data !== undefined ? data : ''
        );
    },

    ledger: (label: string, data?: any) => {
        if (!logger.shouldLog('ledger')) return;
        console.log(
            `%c[LEDGER] %c%s`,
            'color: #8b5cf6; font-weight: bold;',
            'color: inherit;',
            label,
            data !== undefined ? data : ''
        );
    },

    info: (label: string, ...args: any[]) => {
        if (!logger.shouldLog('info')) return;
        console.log(
            `%c[INFO] %c%s`,
            'color: #64748b; font-weight: bold;',
            'color: inherit;',
            label,
            ...args
        );
    },

    warn: (label: string, ...args: any[]) => {
        if (!logger.shouldLog('warn')) return;
        console.warn(
            `%c[WARN] %c%s`,
            'color: #eab308; font-weight: bold;',
            'color: inherit;',
            label,
            ...args
        );
    },

    error: (label: string, ...args: any[]) => {
        if (!logger.shouldLog('error')) return;
        console.error(
            `%c[ERROR] %c%s`,
            'color: #ef4444; font-weight: bold;',
            'color: inherit;',
            label,
            ...args
        );
    },

    /**
     * Update logging settings at runtime
     */
    updateSettings: (newSettings: Partial<Record<LogCategory, boolean>>) => {
        settings = { ...settings, ...newSettings };
        try {
            localStorage.setItem('apex_nebula_debug_config', JSON.stringify(settings));
        } catch { }
    }
};
